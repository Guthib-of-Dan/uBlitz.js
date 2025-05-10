import uWS from "uWebSockets.js";
import {
  extendApp,
  HeadersMap,
  registerAbort,
  type HttpResponse,
} from "ublitz.js";
import { logger } from "ublitz.js/logger";
import { sendFile } from "ublitz.js/static";
import { Router } from "ublitz.js/router";
import { notFoundConstructor } from "ublitz.js/codes";
import fs from "node:fs/promises";
const server = extendApp(uWS.App());

const port = 9001;
//small utility
const getVideoPath = (videoIndex: number) =>
  "./examples/video" + videoIndex + ".mp4";
var mp4 = "video/mp4";
var openStreams = 0;
var streamIndex = 0;

function sendVideoConstructor(
  path: string,
  contentType: string
): (res: HttpResponse) => Promise<void> {
  // returns functional controller
  return async function (res) {
    //this is A MUST. "sendFile"  uses same tricks, which are described in AsyncFunction example
    registerAbort(res);
    const currentStream: string = "STREAM " + streamIndex++;
    logger.time(currentStream);
    logger.log("Stream was opened, openStreams: " + ++openStreams);
    // handles backpressure, abort,
    const error = await sendFile({
      res,
      path,
      contentType,
      // Infinity === as much, as possible
      totalSize: Infinity,
    });
    --openStreams;
    logger.timeEnd(currentStream);
    if (error) {
      logger.error("error", error);
      if (!res.aborted && !res.finished) res.close();
    }
  };
}
async function getVideoSize(path: string) {
  return (await fs.stat(path)).size;
}
async function createHead(i: number): Promise<(res: HttpResponse) => any> {
  const size = await getVideoSize(getVideoPath(i));
  const headers = new HeadersMap({
    "Content-Length": `${size}`,
    "Content-Type": `${mp4}`,
  }).prepare();
  return (res) => headers(res.onAborted(() => {})).endWithoutBody();
}
const router = new Router({
  "/video1.mp4": {
    get: sendVideoConstructor(getVideoPath(1), mp4),
    head: await createHead(1),
  },
  "/video2.mp4": {
    get: sendVideoConstructor(getVideoPath(2), mp4),
    head: await createHead(2),
  },
  "/video3.mp4": {
    get: sendVideoConstructor(getVideoPath(3), mp4),
    head: await createHead(3),
  },
});

router
  .bind(server)
  .define("/video1.mp4", "get", "head")
  .define("/video2.mp4", "get", "head")
  .define("/video3.mp4", "get", "head");

server.get("/*", notFoundConstructor("Nothing here")).listen(port, (token) => {
  if (token) {
    logger.info("Listening to port " + port);
  } else {
    logger.error("Failed to listen to port " + port);
  }
});
