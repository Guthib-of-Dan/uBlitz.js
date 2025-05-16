import { toAB } from "./index.mjs";
import fs from "node:fs";
function bindTryEnd(res, totalSize) {
  return (chunk) =>
    new Promise((resolve) =>
      res.cork(() => resolve(res.tryEnd(chunk, totalSize)))
    );
}
var chunkSize = 64 * 1024,
  drainEndEvent = Symbol(),
  globalEndEvent = Symbol();
async function sendFile({ path, contentType, res, totalSize }) {
  //!__________important
  res.cork(() => res.writeHeader(toAB("Content-Type"), toAB(contentType)));
  try {
    var maxSize = (await fs.promises.stat(path)).size;
    if (totalSize > maxSize) totalSize = maxSize;
    var readStream;
    readStream = fs.createReadStream(path, {
      highWaterMark: chunkSize,
      end: totalSize - 1,
    });
  } catch (error) {
    console.log("error", error);
    res.cork(() => res.close());
    return error;
  }
  var queue = [],
    processingChunks = false,
    corkedTryEnd = bindTryEnd(res, totalSize),
    checkIfReqEnded = () => {
      if (res.aborted || res.done) {
        readStream.destroy();
        return !!res.emitter.removeAllListeners();
      }
      return false;
    },
    readEnded = false;
  function onData({ buffer }) {
    if (queue.length >= 64 && !readStream.isPaused()) readStream.pause();
    if (checkIfReqEnded() || processingChunks) return queue.push(buffer);
    processingChunks = true;
    processChunks(queue.length > 0 ? void 0 : buffer);
  }
  async function processChunks(buffer) {
    if (!buffer && !(buffer = queue.shift())) return;
    do {
      if (checkIfReqEnded()) return;
      if (readStream.isPaused() && queue.length < 32) readStream.resume();
      var prevOffset = res.getWriteOffset();
      var { 0: ok, 1: done } = await corkedTryEnd(buffer);
      res.done = done;
      if (!ok && !done) {
        res.unsentChunk = buffer;
        res.lastOffset = prevOffset;
        res.onWritable(drainHandler);
        await new Promise((resolve) =>
          res.emitter.once(drainEndEvent, resolve)
        );
      }
    } while ((buffer = queue.shift()));
    if (readEnded && res.done) res.emitter.emit(globalEndEvent);
    processingChunks = false;
  }
  function drainHandler(offset) {
    var { 0: ok, 1: done } = res.tryEnd(
      res.unsentChunk.slice(offset - res.lastOffset),
      totalSize
    );
    res.done = done;
    if (ok) {
      delete res.unsentChunk;
      delete res.lastOffset;
      res.emitter.emit(drainEndEvent);
    }
    if (done) res.emitter.emit(globalEndEvent);
    return done || ok;
  }
  res.emitter.once("abort", () => {
    if (!res.error) res.error = new Error("Aborted");
    readStream.destroy();
    res.emitter.emit(globalEndEvent);
  });
  //!___________registration
  readStream
    .on("data", onData)
    .once("error", (err) => {
      if (!res.aborted) res.close();
      if (!res.error) res.error = err;
      res.emitter.emit(globalEndEvent);
    })
    .once("end", () => {
      readEnded = true;
      if (!processingChunks) res.emitter.emit(globalEndEvent);
    });
  await new Promise((resolve) => {
    res.emitter.once(globalEndEvent, resolve);
  });
  if (res.done) res.finished = true;
  readStream.removeAllListeners();
  return res.error;
}
export { sendFile };
