import { read } from 'fs';

class SSEClient {
  private reader?: ReadableStreamReader;
  private controller: AbortController = new AbortController();
  public onopen?: () => any;
  public onclose?: () => any;
  public onmessage?: (message: string) => any;

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

  private parseMessageEvent(event: Uint8Array): string {
    try {
      const k = event.keys();

      console.log(k);
      return new TextDecoder('utf-8').decode(event);
    } catch (error) {
      throw error;
    }
  }

  private async start(reader) {
    while (true) {
      const { done, value } = await reader.read();
      // We're done, stop loop
      // TODO: Are we done when connection is closed? investigate and test
      if (done) {
        console.log('done?/closed?');
        break;
      }
      console.log(this.parseMessageEvent(value));
    }
    // when we're done, close the stream
    console.log('closing stream...');
    reader.releaseLock();
  }

  // TODO: refine a bit (quite a bit)
  close() {
    console.log('calling close()');
    // cancel fetch request
    this.controller.abort();
    // close stream
    this.reader.releaseLock();
  }

  // TODO: implement
  addEventListener(event: string, callback: () => void) {}
}

export default SSEClient;
