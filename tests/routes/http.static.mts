import { Type } from "@sinclair/typebox";
import uWS from "uWebSockets.js";
import {
  sendFile,
  definePlugin,
  Router,
  logger,
  LightRoute,
  toAB,
  HeadersMap,
  HeavyRoute,
  setCSP,
  CSPDirs,
  useBody,
} from "../../src/index.mts";
import cacheDB from "../lib/cache.mts";
const router = new Router({
  "/": {
    get: (res) => {
      new HeadersMap({
        ...HeadersMap.baseObj,
        "Content-Security-Policy": setCSP(
          {
            ...CSPDirs,
            "script-src-elem": [
              "'self'",
              "https://cdn.jsdelivr.net",
              "'unsafe-inline'",
            ],
            "script-src": ["'self'", "'unsafe-eval'"],
            "script-src-attr": ["'unsafe-inline'"],
          },
          "upgrade-insecure-requests"
        ),
      }).toRes(res);
      sendFile({
        path: "./tests/public/index.html",
        contentType: "text/html",
        res,
        totalSize: Infinity,
      });
    },
    async put(res) {
      var key = await cacheDB.get("key");
      if (!key) {
        await cacheDB.set("key", "hello");
        logger.warn("no key");
        key = await cacheDB.get("key");
      }
      res.cork(() => res.end(toAB(key!)));
    },
    del(res) {
      res.end(toAB("Ok"));
    },
    ws: {
      closeOnBackpressureLimit: true,
      compression: uWS.DISABLED,
      // dropped(ws, message, isBinary) {},
      // drain(ws) {},
      close: () => logger.warn("closed"),
      idleTimeout: 10,
      maxBackpressure: 64 * 1024,
      maxLifetime: 1,
      maxPayloadLength: 16 * 1024,
      open(ws) {
        logger.info("connected");
        ws.send(toAB("Hooray"));
      },
      message(ws, message) {
        logger.info("message", Buffer.from(message).toString());
        ws.send(toAB("thanks"), false, false);
      },
      // ping(ws, message) {},
      // pong(ws, message) {},
      sendPingsAutomatically: true,
      // subscription(ws, topic, newCount, oldCount) {},
      // upgrade(res, req, context) {},
    },
  },
  "/text.txt": {
    get: new LightRoute({
      staticHeaders: HeadersMap.default,
      handler: (res, _, data) =>
        sendFile({
          path: "./tests/public/text.txt",
          contentType: "text/plain",
          res,
          totalSize: data.meta.size,
        }),
      getMeta: (_, req) => {
        return {
          size: Number(req.getQuery("size")) || 100,
        };
      },
      schemas: {
        meta: Type.Object({
          size: Type.Integer(),
        }),
      },
      onAbort() {
        logger.warn("aborted request /text.txt");
      },
      onError(error, res, data) {
        logger.error("Error in get /text.txt", error);
        logger.log("requested data", data);
        if (!res.aborted) res.close();
      },
    }),
    post: new HeavyRoute({
      // staticHeaders: HeadersMap.default,
      schemas: {
        meta: Type.Any(),
        body: Type.Any(),
      },
      getMeta(/*res, req*/) {},
      parseBody(/*res, req, meta*/) {},
      async handler(res, _, data) {
        logger.log("data", data.body, data.meta);
        res.end(toAB("HI"));
      },
      onAbort() {},
      onError(/*error, res, data*/) {},
    }),
  },
  "/styles.css": {
    get: (res) => {
      HeadersMap.default.toRes(res);
      logger.log("got css");
      sendFile({
        res,
        path: "./tests/public/styles.css",
        contentType: "text/css",
        totalSize: Infinity,
      });
    },
  },
  "/.proto": {
    get(res) {
      sendFile({
        contentType: "text/plain",
        path: "./tests/proto/index.proto",
        res,
        totalSize: Infinity,
      });
    },
  },
  "/compiled": {
    get: (res) =>
      sendFile({
        res,
        contentType: "text/javascript",
        path: "./proto.compiled.mjs",
        totalSize: Infinity,
      }),
  },
  "/post": {
    async post(res, req) {
      logger.group("/post");
      logger.log("CL", req.getHeader("content-length"));
      var body = await useBody({
        res,
        CT: req.getHeader("content-type") as "multipart/form-data",
      });
      if (body.ok) logger.log("result", body.data);
      logger.groupEnd();
      res.cork(() => res.end(toAB("thanks")));
    },
  },
});
export default definePlugin((server) =>
  router
    .bind(server)
    .route("/", "get", "put", "del", "ws")
    .route("/styles.css", "get")
    .route("/text.txt", "get", "post")
    .route("/.proto", "get")
    .route("/compiled", "get")
    .route("/post", "post")
);
