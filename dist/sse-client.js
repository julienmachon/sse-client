(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
typeof define === 'function' && define.amd ? define(factory) :
(global = global || self, global.SSEClient = factory());
}(this, function () { 'use strict';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

/**
 * This function receives a chunk of data as a Uint8Array.
 * A chunk can contain 1 or more events. It can also contain part of one single event.
 *
 * The function parses those chunks and returns them as pair <string, boolean>
 * The string is the event value and the status is true if we have all of it, false otherwise
 *
 * The function revives an option initial state parameter which can typically
 * be used to pass incomplete previous events once we parse the next chunk
 *
 * @param event the chunk of Uint8Array that contains some event data
 * @param init the initial state. Typically, an incomplete event from a previous chunk parse
 */
function parseChunkToStringEvent(event, init = [{ message: '', complete: false }]) {
    try {
        return event.reduce((prev, curr, index, array) => {
            // OK, we have a \n
            if (String.fromCharCode(curr) === '\n') {
                // if next one is also a \n
                // add empty string
                if (String.fromCharCode(array[index + 1]) === '\n') {
                    prev[prev.length - 1].complete = true;
                    return [...prev, { message: '', complete: false }];
                }
                // otherwise, ignore \n
                return prev;
            }
            // we just add the character to its string
            prev[prev.length - 1].message =
                prev[prev.length - 1].message + String.fromCharCode(array[index]);
            return prev;
        }, init);
    }
    catch (error) {
        throw error;
    }
}
/**
 * This function takes the event as a string and returns is as an object.
 * i.e.: "data:somedata event:myevent" => { data: 'somedata', event: 'myevent' }
 *
 * @param stringEvent the event as a string
 */
function parseStringEventToObject(stringEvent) {
    // all the keys we need to find
    const DATA = 'data';
    const EVENT = 'event';
    const ID = 'id';
    // the index of our keys: in the string event
    const indexOfData = stringEvent.indexOf(DATA + ':');
    const indexOfEvent = stringEvent.indexOf(EVENT + ':');
    const indexOfId = stringEvent.indexOf(ID + ':');
    // we make a nice array of keys and their index
    const keys = [
        { key: DATA, index: indexOfData },
        { key: EVENT, index: indexOfEvent },
        { key: ID, index: indexOfId },
    ];
    // sort indexes and start the slicing
    const objectEvent = keys
        .sort((a, b) => a.index - b.index)
        .reduce((prev, curr, index) => {
        const next = Object.assign({}, prev);
        if (index + 1 < keys.length) {
            // if not the last key
            next[curr.key] = stringEvent.slice(curr.index + curr.key.length + 1, keys[index + 1].index);
        }
        else {
            next[curr.key] = stringEvent.slice(curr.index + curr.key.length + 1);
        }
        return next;
    }, {});
    return objectEvent;
}

class SSEClient {
    constructor(url, init) {
        this.readState = SSEClient.CONNECTING;
        this.controller = new AbortController();
        this.listeners = [];
        this.stringMessagesQueue = [];
        const signal = this.controller.signal;
        // TODO: Make sure header is always text/event-stream
        fetch(url, Object.assign({ signal }, init))
            .then((response) => {
            // There is no body 🤷
            if (!response.body)
                throw new Error('No body');
            // get that reader
            this.reader = response.body.getReader();
            this.start(this.reader);
        })
            .catch(error => {
            console.error(error);
            throw error;
        });
    }
    _onOpen() {
        this.readState = SSEClient.OPEN;
        this.onopen && this.onopen(new Event('open'));
    }
    _onClosed() {
        this.readState = SSEClient.CLOSED;
        this.onclose && this.onclose();
    }
    _onMessage(objectEvent) {
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
    start(reader) {
        return __awaiter(this, void 0, void 0, function* () {
            // this is where we're putting all parse event
            while (true) {
                const { done, value } = yield reader.read();
                this._onOpen();
                // We're done, stop loop
                if (done) {
                    this._onClosed();
                    break;
                }
                // re-glue chunks into string messages, but before,
                // let's pass back the previous incomplete messages
                const filteredQueue = this.stringMessagesQueue.filter(m => !m.complete);
                this.stringMessagesQueue = parseChunkToStringEvent(value, filteredQueue.length > 0 ? filteredQueue : undefined);
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
        });
    }
    close() {
        this.reader.cancel();
    }
    addEventListener(eventType, callback) {
        this.listeners[eventType] = callback;
    }
    removeEventListener(eventType) {
        delete this.listeners[eventType];
    }
}
SSEClient.CONNECTING = 0;
SSEClient.OPEN = 1;
SSEClient.CLOSED = 2;

return SSEClient;

}));
