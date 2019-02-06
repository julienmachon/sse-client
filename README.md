[Why](#why-not-use-`eventsource`?) |
[Status](#status) |
[Development](#development) |
[License](#license)

# Server-sent Event Client

This is a client for subscribing server-sent events using the fetch API.

## Why not use `EventSource`?

Well, I only have one problem with `EventSource` and that's quite a biggy: You can't specify headers!

This is a major issue for me every time I have to use SSE mainly because I can't sent a bearer token or the `last-event-id`, as specified by the [SSE spec](https://www.w3.org/TR/2009/WD-eventsource-20090421/#processing-model).

After some quick research, I've found [this issue](https://github.com/whatwg/html/issues/2177). Based on the conversation, it looks like we'll never be able to set header using `EventSource` and that the `fetch` API combine with `ReadableStream` is a much better option.

I've not be able to find a single example or library, so I'm writing my own.

## Status

In development

## Development

### With Node.js

- Install: `npm install`
- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint`
- Generate Documentation: `npm run documentation`

### With Docker

Make sure you have already installed both [Docker Engine](https://docs.docker.com/install/) and [Docker Compose](https://docs.docker.com/compose/install/).

- Install: `make install`
- Build: `make build`
- Test: `make test`
- Lint: `make lint`

# License

- [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
