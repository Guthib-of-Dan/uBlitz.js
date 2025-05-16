// previously this package was only for typescript (yeah, ublitz.JS with only ts. I know.),
// but now you can use it without any additional effort.
import uWS from "uWebSockets.js";
import { DeclarativeResponse, extendApp } from "ublitz.js";
import { notFoundConstructor } from "ublitz.js/codes";
import { logger } from "ublitz.js/logger";
const server = extendApp(uWS.App());
server
  .get("/", new DeclarativeResponse().end("YOU ARE GOOD"))
  .listen(9001, (token) =>
    token ? logger.info("OK") : logger.error("NOT OK")
  );
