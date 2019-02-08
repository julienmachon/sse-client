export type ParsedStringEvent = {
  message: string;
  complete: boolean;
};

export type ObjectEvent = {
  data: string;
  event: string;
  id: string;
};

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
export function parseChunkToStringEvent(
  event: Uint8Array,
  init: ParsedStringEvent[] = [{ message: '', complete: false }],
): ParsedStringEvent[] {
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
  } catch (error) {
    throw error;
  }
}

/**
 * This function takes the event as a string and returns is as an object.
 * i.e.: "data:somedata event:myevent" => { data: 'somedata', event: 'myevent' }
 *
 * @param stringEvent the event as a string
 */
export function parseStringEventToObject(stringEvent: string): ObjectEvent {
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
  const objectEvent: ObjectEvent = keys
    .sort((a, b) => a.index - b.index)
    .reduce(
      (prev, curr, index) => {
        const next = { ...prev };
        if (index + 1 < keys.length) {
          // if not the last key
          next[curr.key] = stringEvent.slice(
            curr.index + curr.key.length + 1,
            keys[index + 1].index,
          );
        } else {
          next[curr.key] = stringEvent.slice(curr.index + curr.key.length + 1);
        }
        return next;
      },
      {} as ObjectEvent,
    );

  return objectEvent;
}
