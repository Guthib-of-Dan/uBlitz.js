![μBlitz.js](./logo.svg)
<br/>
Http + WebSockets utility-library, trying to combine speed, light weight and DX. It is build on top of μWebSockets.js.

## Installation

`npm i ublitz.js`
OR `bun add ublitz.js`
OR WHATEVER

## Usage

For more details go to "examples" folder

```javascript
import uWS from "uWebSockets.js"; // nothing new
import { extendApp } from "ublitz.js";
import { logger } from "ublitz.js/logger"; //code splitting
extendApp(uWS.App()).listen(9001, (token) =>
  token ? logger.info("Listening") : logger.error("Not listening")
);
```

## It is a javascript with much effort put into declaration files

You can bundle it, minify it, use with js or ts. How to use esbuild is shown in "examples" folder.

## Dependencies

`ajv`, `uWebSockets.js#20.52.0`, `@sinclair/typebox`, `tseep`, `busboy`, `nanoid`

## Main purpose - handle BASE.

This package is created for those, who has tried uWebSockets.js himself, enjoyed the performance AND understands the difference between massive abstractions and utilities with less overhead and higher performance.

## WE offer:

- well-structured code
- error and extensible abort handling
- serving static content 500+ megabytes
- ajv validation
- straight-forward routing
- parsing protobuf or multipart body
- coloring your console
- making your code typescript-first
- helping with http headers and codes
- routing, which dynamically generates best code
- adding you some documentation, which uWS hasn't provided yet

## We don't offer and won't offer

- middlewares
- large abstractions
- slow utilities

## Wishes

Please, decorate the github repo with a star.
