import { setTimeout } from "node:timers/promises";
import {
  definePlugin,
  HeadersMap,
  logger,
  sendFile,
  toAB,
  registerAbort,
  Router,
} from "../src/index.mts"; // or "ublitz.js"

var setHeadHeaders = new HeadersMap({
  ...HeadersMap.baseObj,
  "Content-Type": "text/plain",
}).prepare();

var setOptsHeader = new HeadersMap({
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Credentials": "false",
}).prepare();
var code = toAB("204");
var highLoadRouter = new Router({
  "/text.txt": {
    async get(res) {
      //functional controller has no error handling or auto abort handling
      registerAbort(res);
      //set needed headers
      HeadersMap.default(res);
      //await for an error, if it is
      const error = await sendFile({
        res,
        contentType: "text/plain",
        path: "./text.txt",
        totalSize: 1024 * 1024 * 85,
      });
      logger.log("Finished with error?", error);
    },
    ws: {
      async open(ws) {
        for (const key in ws) logger.log("KEY", key); // has some method, which are undocumented here, bun documented in ublitz.js!
        await setTimeout(2000);
        ws.close();
      },
    },
    head: (res) =>
      setHeadHeaders(res.onAborted(() => {}).writeStatus(code)).endWithoutBody(
        1024 * 1024 * 85,
        true
      ),
    options: (res) =>
      setOptsHeader(res.onAborted(() => {}).writeStatus(code)).endWithoutBody(),
  },
});
export default definePlugin((server) => {
  highLoadRouter
    .bind(server)
    .route("/text.txt", "get", "options", "head", "ws");
});
