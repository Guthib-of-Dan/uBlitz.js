import {
  definePlugin,
  HeadersMap,
  logger,
  sendFile,
  toAB,
  registerAbort,
  Router,
} from "../src/index.mts"; // or "ublitz.js"
//Didn't put "Content-Length" and "Connection" headers, because they are set with res.endWithoutBody

const setHeadHeaders = new HeadersMap({
  ...HeadersMap.baseObj,
  "Content-Type": "text/plain",
}).prepare();

const setOptsHeader = new HeadersMap({
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Credentials": "false",
}).prepare();

const code = toAB("204");
const highLoadRouter = new Router({
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
    head: (res) =>
      setHeadHeaders(res.onAborted(() => {}).writeStatus(code)).endWithoutBody(
        1024 * 1024 * 85,
        true
      ),
    options: (res) =>
      setOptsHeader(res.onAborted(() => {}).writeStatus(code)).endWithoutBody(),
  },
});
export default definePlugin((server) =>
  highLoadRouter.bind(server).route("/text.txt", "get", "options", "head")
);
