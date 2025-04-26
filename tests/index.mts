import { extendApp, logger, toAB } from "../package/index.mts";
import μWS from "uWebSockets.js";
import httpStatic from "./routes/http.static.mts";
import process from "node:process";
import { Type } from "@sinclair/typebox";
import Ajv from "ajv";
//#region check env
await (async function checkEnv() {
  (await import("dotenv")).config();
  const ajv = new Ajv();
  const fullENV = ajv.validate(
    Type.Object({ PORT: Type.String(), HOST: Type.String() }),
    process.env
  );
  if (!fullENV) throw new Error(ajv.errors![0].message);
})();
//#endregion

extendApp(μWS.App())
  .globalOnAbort(() => logger.warn("Aborted request"))
  .onError((err, res) => {
    logger.error("Error", err);
    if (!res.aborted) res.close();
  })
  .register(httpStatic)
  .any("/*", (res) => {
    res.writeStatus(toAB("404")).end(toAB("nothing to see here"));
  })
  .listen(process.env.HOST!, parseInt(process.env.PORT!), (listenSocket) => {
    if (!listenSocket) return logger.error("Server not Listening");
    logger.info(
      "Server listening on port " +
        parseInt(process.env.PORT!) +
        ", HOST - " +
        process.env.HOST
    );
  });
