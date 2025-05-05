import { definePlugin, HeadersMap, logger, sendFile } from "../src/index.mts";
import { registerAbort, Router } from "../src/router.mts"; // or "ublitz.js"
const router = new Router({
  "/": {
    // simple controller
    get(res) {
      registerAbort(res);
      HeadersMap.default.toRes(res);
      sendFile({
        res,
        path: "./tests/public/index.html",
        contentType: "text/html",
        //total size === size, which will be sent in bytes. Infinity === as much, as file has.
        totalSize: Infinity,
      });
    },
    // not essentially (but possible) to use "any" route (only function. Not LightRoute or HeavyRoute. Has no error handling or abort controller). It is handled automatically and sends 405 status with "Allow" header, containing all method, use registered in router.route ("WS" method is removed from header and "DEL" is renamed to "DELETE")
  },
  "/styles.css": {
    get(res) {
      registerAbort(res);
      sendFile({
        res,
        contentType: "text/css",
        path: "./tests/public/styles.css",
        totalSize: Infinity,
      });
    },
  },
  "/text.txt": {
    async get(res) {
      registerAbort(res);
      const error = await sendFile({
        res,
        contentType: "text/plain",
        path: "./text.txt",
        totalSize: Infinity,
      });
      logger.log("Finished with error?", error);
    },
  },
});
export default definePlugin((server) =>
  router
    .bind(server)
    .route("/", "get")
    .route("/styles.css", "get")
    .route("/text.txt", "get")
);
