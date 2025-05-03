import type { RecognizedString } from "uWebSockets.js";
import { logger, toAB, type HttpResponse } from "./index.mts";
import fs from "node:fs";
/**
 * When you stream a file with a defined size, you should cork the tryEnd function. It is were this one breaks in. You "bind" this function with the response, and then every call is promised.
 * @returns ()=> Promise with return of res.tryEnd()
 */
function bindTryEnd(
  res: HttpResponse,
  totalSize: number
): (chunk: RecognizedString) => Promise<[boolean, boolean]> {
  return (chunk) =>
    new Promise((resolve) =>
      res.cork(() => resolve(res.tryEnd(chunk, totalSize)))
    );
}
var chunkSize = 64 * 1024,
  drainEndEvent = Symbol();
/**
 * Efficiently send file with size over 500 megabytes with low-level tricks and automated backpressure handling.
 */
async function sendFile({
  path,
  contentType,
  res,
  totalSize,
}: {
  path: string;
  contentType: string;
  res: HttpResponse & {
    done?: boolean;
    unsentChunk?: ArrayBuffer;
    lastOffset?: number;
  };
  totalSize: number;
}): Promise<void> {
  //!__________important
  res.done = false;
  res.cork(() => res.writeHeader(toAB("Content-Type"), toAB(contentType)));
  var maxSize = (await fs.promises.stat(path)).size;
  if (totalSize > maxSize) totalSize = maxSize;
  var readStream = fs.createReadStream(path, {
      highWaterMark: chunkSize,
      end: totalSize - 1,
    }),
    queue: (ArrayBuffer | undefined)[] = [],
    processingChunks = false,
    corkedTryEnd = bindTryEnd(res, totalSize),
    checkIfReqEnded = (): boolean => {
      if (res.aborted || res.done) {
        readStream.destroy();
        return !!res.emitter.removeAllListeners();
      }
      return false;
    };
  function onData({ buffer }: Buffer<ArrayBuffer>): any {
    if (queue.length >= 64 /*4 megabytes max*/ && !readStream.isPaused())
      readStream.pause();
    if (checkIfReqEnded() || processingChunks) return queue.push(buffer);
    processingChunks = true;
    processChunks(queue.length > 0 ? undefined : buffer);
  }
  async function processChunks(buffer: ArrayBuffer | undefined): Promise<void> {
    if (!buffer && !(buffer = queue.shift())) return;
    do {
      if (checkIfReqEnded()) break;
      if (readStream.isPaused() && queue.length < 32 /*2 megabytes min*/)
        readStream.resume();
      var prevOffset = res.getWriteOffset();
      var { 0: ok, 1: done } = await corkedTryEnd(buffer!);
      if (!ok && !done) {
        res.unsentChunk = buffer;
        res.lastOffset = prevOffset;
        res.onWritable(drainHandler);
        await new Promise<void>((resolve) =>
          res.emitter.once(drainEndEvent, resolve)
        );
      }
    } while ((buffer = queue.shift()));
    processingChunks = false;
  }
  function drainHandler(offset: number): boolean {
    var { 0: ok, 1: done } = res.tryEnd(
      res.unsentChunk!.slice(offset - res.lastOffset!),
      totalSize
    );
    res.done = done;
    if (ok) {
      delete res.unsentChunk;
      delete res.lastOffset;
      res.emitter.emit(drainEndEvent);
    }
    return done || ok;
  }

  //!___________registration
  readStream
    .on("data", onData as any)
    .once("error", (err) => logger.error("error", err));
}
export { sendFile };
