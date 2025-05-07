# μBlitz.js

Http + Websockets library, trying to combine speed, light weight and DX. It is build on top of μWebSockets.js.

## Usage

```typescript
// index.mts
import uWS from "uWebSockets.js";
import { extendApp, logger, LightRoute, HeavyRoute } from "ublitz.js";
import { doSomethingToData } from "someRandomPackage.js";
import router1 from "router1.mts";
const app = extendApp(uWS.App());
app.register(router1);
app.onError(function (err, res, requestData) {
  logger.error("error out of somewhere", err);
  if (!res.aborted) res.close();
  doSomethingToData(requestData);
});

// router1.mts
import {
  Router,
  sendFile,
  HeadersMap,
  parseSimpleBody,
  HeavyRoute,
  checkContentLength,
  toAB,
  definePlugin,
  LightRoute,
} from "./src";
import { Type } from "@sinclair/typebox";
const router = new Router({
  "/": {
    // functional controller
    async get(res) {
      HeadersMap.default(res); // set "helmet-like" headers (they are ArrayBuffers)
      const error = await sendFile({
        res,
        path: "index.html",
        contentType: "text/html",
        //total size === size, which will be sent in bytes. Infinity === as much, as file has.
        totalSize: Infinity,
      });
      if (error) logger.error("ERROR", error);
    },
    post() {}, // Many methods at once
  },
  "/validated": {
    // class controller
    post: new HeavyRoute({
      // goes to Ajv
      schemas: {
        //headers, query, parameters. It even can be something different from Type.Object
        meta: Type.Object({
          //validate whatever you like.
          "content-length": Type.Integer(),
        }),
        body: Type.Object({
          id: Type.Integer({ maximum: 10, minimum: 0 }),
        }), // whatever you want
      },
      // Not async. First "await" === lost req object
      getMeta(res, req) {
        // return what you specified in this.schemas.meta.
        // It is statically typed;
        return {
          // If something is bad - sends 411 http code
          "content-length": checkContentLength(res, req),
        };
      },
      // if getMeta validation failed -> sends "400" http code
      // else -> meta === ReturnType<typeof this.getMeta>
      async parseBody(res, req, meta) {
        const body = await parseSimpleBody(
          { res, CT: "application/x-protobuf" },
          MyProtoObject
        );
        if (res.aborted) throw new Error("stop it");
        if (!body.ok)
          throw new Error("didn't parse body", {
            cause: body.data /* body.data === Error*/,
          });
        // validates even protobuf (compiled with protobufjs)
        return body.data;
      },
      //if parseBody validation fails - 400 http code automatically
      async handler(
        res,
        /*if all previous function were synchronous*/ req,
        /*Looks like you have described*/ data
      ) {
        logger.info("got request like this", data);
        res.cork(() => res.end(toAB("thanks")));
      },
      // own error handler is optional, if you register onError on the app
      // onError(error, res, data) {},
    }),
    get: new LightRoute({
      schemas: {
        meta: Type.Any(),
      },
      getMeta(res, req) {
        return 0; //any
      },
      handler(res, req, data) {
        //whatever
        res.endWithoutBody();
      },
    }),
  },
});
export default definePlugin(
  (server) =>
    router
      .bind(server)
      .route("/", "get", "post") // many methods. Duplicates throw an error.
      .route("/validated", "post") // no "get" method === not registered route -> you can safely add new.
);
```

## Main purpose - handle BASE.

We don't offer middlewares, but if you need:

- error and abort handling
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

I use - you can use too.

## Documentation exists, but community is as large as you can expect from several days of existence.

For now look for examples (or explore code. There is not too much to feel anxious).

## Typescript means sacrifice in "no time preparation"

ESbuild - solid choice, bun - great, but for tests (still typescript), tsx - compiles your code on the spot, so is slow. You'll find the way to use ESbuild in examples.
