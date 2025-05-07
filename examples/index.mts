import { extendApp, toAB, logger, notFoundConstructor } from "../src/index.mts"; //npm: import {extendApp} from "ublitz.js"
import uWS from "uWebSockets.js";
import staticRouter from "./staticHighLoad.mts";
const PORT = 9001;
const HOST = toAB("localhost");

extendApp(uWS.App())
  .onError((err, res, data) => {
    logger.group("Some error");
    logger.error("somewhere happened this", err);
    if (!res.aborted && !res.finished) res.close();
    logger.log("data about request", data);
    logger.groupEnd();
  })
  .register(staticRouter)
  .any("/*", notFoundConstructor("NO FOUND"))
  .listen(HOST, PORT, (socket) => {
    if (!socket) logger.error("Server is NOT listening");
    logger.info("Server is listening on port: " + PORT + ", host: localhost");
  });
