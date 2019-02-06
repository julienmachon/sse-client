class SSEClient {
  private stream?: ReadableStream;
  private controller: AbortController = new AbortController();
  public onopen?: () => any;
  public onclose?: () => any;
  public onmessage?: (message: string) => any;

  constructor(url: string, init?: RequestInit) {
    const signal = this.controller.signal;
    // TODO: Make sure header is always text/event-stream
    fetch(url, { signal, ...init }).then((response: Response, init?) => {
      // There is no body :shrug:
      if (!response.body) throw new Error('No body');

      // get that reader
      const reader = response.body.getReader();
      // @ts-ignore (lib.dom is not up to date and doesn't allow to pass args to ReadableStream :shrug:)
      // FIXME: Create my own type, or make a PR to Typescript lib.dom
      this.stream = new ReadableStream({
        async start(controller: any) {
          while (true) {
            const { done, value } = await reader.read();
            // We're done, stop loop
            // TODO: Are we done when connection is closed? investigate and test
            if (done) {
              console.log('done');
              break;
            }
            console.log(new TextDecoder('utf-8').decode(value));
            // Enqueue next data
            // TODO: Do I need to do this if I don't return final "grouped" data?
            controller.enqueue(value);
          }
          // Close the stream
          controller.close();
          reader.releaseLock();
        },
      });
    });
  }

  // TODO: refine a bit (quite a bit)
  close() {
    // cancel fetch request
    this.controller.abort();
    // close stream
    this.stream && this.stream.cancel();
  }

  // TODO: implement
  addEventListener(event: string, callback: () => void) {}
}
