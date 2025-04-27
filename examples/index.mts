import { extendApp, toAB, logger } from "../src/index.mts"; //npm: import {extendApp} from "ublitz.js"
import uWS from "uWebSockets.js";
import router from "./router.mts";
const PORT = 9001;
const HOST = toAB("localhost");
logger.log("here");
extendApp(uWS.App())
  .globalOnAbort(() => logger.warn("request aborted"))
  .onError((err, res, data) => {
    logger.group("Some error");
    logger.error("somewhere happened this", err);
    if (!res.aborted) res.close();
    logger.log("data about request", data);
    logger.groupEnd();
  })
  .register(router)
  .any(
    "/*",
    (res) => void res.writeStatus(toAB("404")).end(toAB("Not found this route"))
  )
  .listen(HOST, PORT, (socket) => {
    if (!socket) logger.error("Server is NOT listening");
    logger.info("Server is listening on port: " + PORT + ", host: localhost");
  });
