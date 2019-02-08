import { read } from 'fs';
import { stringify } from 'querystring';
import {
  parseChunkToStringEvent,
  ParsedStringEvent,
  parseStringEventToObject,
  ObjectEvent,
} from './utils';

interface Listener {
  [eventType: string]: (message: MessageEvent) => any;
}

class SSEClient {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  public onopen?: (event: Event) => any;
  public onclose?: () => any;
  public onmessage?: (message: MessageEvent) => any;
  public readState: number = SSEClient.CONNECTING;
  private reader?: ReadableStreamReader;
  private controller: AbortController = new AbortController();
  private listeners?: Listener[] = [];
  private lastEventID: string;
  private stringMessagesQueue: ParsedStringEvent[] = [];

  constructor(url: string, init?: RequestInit) {
    const signal = this.controller.signal;
    // TODO: Make sure header is always text/event-stream
    fetch(url, { signal, ...init })
      .then((response: Response) => {
        // There is no body 🤷
        if (!response.body) throw new Error('No body');

        // get that reader
        this.reader = response.body.getReader();
        this.start(this.reader);
      })
      .catch(error => {
        console.error(error);
        throw error;
      });
  }

  private _onOpen(): void {
    this.readState = SSEClient.OPEN;
    this.onopen && this.onopen(new Event('open'));
  }

  private _onClosed(): void {
    this.readState = SSEClient.CLOSED;
    this.onclose && this.onclose();
  }

  private _onMessage(objectEvent: ObjectEvent): void {
    // save last knows ID
    objectEvent.id &&
      objectEvent.id !== '' &&
      (this.lastEventID = objectEvent.id);
    // creat new MessageEvent
    const messageEvent = new MessageEvent(objectEvent.event, {
      data: objectEvent.data,
      lastEventId: this.lastEventID,
    });
    // call onmessage if exist
    this.onmessage && this.onmessage(messageEvent);
    // call eventListener if exists
    this.listeners[objectEvent.event] &&
      this.listeners[objectEvent.event](messageEvent);
  }

  private async start(reader) {
    // this is where we're putting all parse event
    while (true) {
      const { done, value } = await reader.read();
      this._onOpen();

      // We're done, stop loop
      if (done) {
        this._onClosed();
        break;
      }

      // re-glue chunks into string messages, but before,
      // let's pass back the previous incomplete messages
      const filteredQueue = this.stringMessagesQueue.filter(m => !m.complete);
      this.stringMessagesQueue = parseChunkToStringEvent(
        value,
        filteredQueue.length > 0 ? filteredQueue : undefined,
      );

      // now we need to parse those complete strings into objects
      // and do the onMessage stuff
      this.stringMessagesQueue
        .filter(m => m.complete)
        .map(m => parseStringEventToObject(m.message))
        .forEach(m => {
          this._onMessage(m);
        });
    }
    // when we're done, close the stream
    reader.releaseLock();
  }

  close() {
    this.reader.cancel();
  }

  addEventListener(
    eventType: string,
    callback: (message?: MessageEvent) => void,
  ) {
    this.listeners[eventType] = callback;
  }

  removeEventListener(eventType): void {
    delete this.listeners[eventType];
  }
}

export default SSEClient;
