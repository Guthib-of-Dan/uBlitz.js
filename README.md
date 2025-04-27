# μBlitz.js

Http + Websockets library, trying to combine speed, light weight and DX. It is built on top of μWebSockets.js

## Main purpose - handle BASE.

We don't offer middlewares, but if you need:

- error and abort handling,
- serving static content 500+ megabytes
- ajv validation
- straight-forward routing
- parsing protobuf or multipart body
- coloring your console
- making your code typescript-first
- helping with http headers and codes
  <br>
  You ARE welcome.

## Low level remains, but in acceptable amount

If you are not familiar with core concepts of μWebSockets.js - we won't help. Rather assist, after you've seen enough.

## Npm package - "ublitz.js"

I use - you can use it too.

## Documentation exists, but community is as large as you can expect from several days of existence.

For now look for examples (or explore code. There is not too much to feel anxious).

## Using typescript means sacrificing "time of preparation"

ESbuild - solid choice, bun - great, but for tests (still typescript), tsx - compiles your code on the spot, so is slow. You'll find the way to use ESbuild in examples.
