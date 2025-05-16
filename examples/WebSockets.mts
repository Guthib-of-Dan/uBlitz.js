/* A quite detailed WebSockets example */
import uWS from "uWebSockets.js";
import {
  DeclarativeResponse,
  extendApp /*,notFoundConstructor*/,
  type lowHeaders,
  registerAbort,
  toAB,
} from "ublitz.js";
import { WSMethod, Router } from "ublitz.js/router";
import { logger } from "../src/types/logger";
import { setTimeout as setAsyncTimeout } from "node:timers/promises";
const server = extendApp(uWS.App());
const port = 9001;
const router = new Router({
  "/*": {
    // this method exists for creating a scope. here you can create some shared variables for all handlers.
    // you can also you bare uWS object with handlers like:
    // ws: {close(){}, open(){}, compression: uWS.SHARED_COMPRESSOR}
    ws: WSMethod<{ url: string }>(() => {
      /*cache several (but you would rather cache all) names of headers for faster communication with uWS */
      var upgradeHeaders = {
        /* lowHeaders has everything safely typed */
        swk: toAB("sec-websocket-key" as lowHeaders),
        swp: toAB("sec-websocket-protocol" as lowHeaders),
      };
      const data = toAB(" 1234567890 ");
      return {
        /* Options */
        compression: uWS.SHARED_COMPRESSOR,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 10,
        /* Handlers */
        open: (ws) => {
          logger.info("A WebSocket connected!");
          // here are used original built-in methods, which, so far, are documented only in ublitz.js
          let a = 0;
          ws.sendFirstFragment("hello", /*compress?*/ false);
          while (a++ < 100000) ws.sendFragment(data, /*compress?*/ false);
          ws.sendLastFragment("world", /*compress?*/ false);
        },
        async upgrade(res, req, context) {
          logger.log(
            "An Http connection wants to become WebSocket, URL: " +
              req.getUrl() +
              "!"
          );
          /* Keep track of abortions (adds flag res.aborted) */
          registerAbort(res);
          /* You MUST copy data out of req here, as req is only valid within this immediate callback */
          var reqData = {
            url: req.getUrl(),
            /* use cached names (but you would rather cache all)*/
            swk: req.getHeader(upgradeHeaders.swk),
            swp: req.getHeader(upgradeHeaders.swp),
            /* you can put this type wherever you want */
            swe: req.getHeader<lowHeaders>("sec-websocket-extensions"),
          } as const;
          /* Simulate doing "async" work before upgrading */
          await setAsyncTimeout(1000);
          logger.info(
            "We are now done with our async task, let's upgrade the WebSocket!"
          );
          if (res.aborted)
            return logger.error(
              "Ouch! Client disconnected before we could upgrade it!"
            );
          /* Cork any async response including upgrade */
          res.cork(() =>
            /* This immediately calls open handler, you must not use res after this call */
            res.upgrade(
              { url: reqData.url },
              /* Use our copies here */
              reqData.swk,
              reqData.swp,
              reqData.swe,
              context
            )
          );
        },

        message: (ws, message, isBinary) => {
          /* Ok is false if backpressure was built up, wait for drain */
          /* let ok = */ ws.send(message, isBinary);
        },
        drain: (ws) => {
          logger.warn("WebSocket backpressure: " + ws.getBufferedAmount());
        },
        close: (/*ws, code, message*/) => {
          logger.warn("WebSocket closed");
        },
      };
    }),
    // no need for define "any" because it is defined by default
    // any: notFoundConstructor("Nothing to see here!"),
  },
});
router.bind(server).define("/*", "ws" /*, "any"*/);
server
  .any("/*", new DeclarativeResponse().end("HI"))
  .listen("localhost", port, (token) =>
    token
      ? logger.info("Listening to port " + port)
      : logger.error("Failed to listen to port " + port)
  );

// client code example
// const wss = new WebSocketStream("/");
// const { readable, writable } = await wss.opened;
// const reader = readable.getReader();
// const writer = writable.getWriter();

// while (true) {
//   const { value, done } = await reader.read();
//   if (done) {
//     break;
//   }
//   const result = await process(value);
//   await writer.write(result);
// }
