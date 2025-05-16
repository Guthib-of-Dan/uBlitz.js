import { EventEmitter } from "tseep";
import { tooLargeBody } from "./http-codes.mjs";
import busboy from "busboy";
import { nanoid } from "nanoid";
import { createWriteStream, WriteStream } from "node:fs";
import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
var wroteToDiskFileEvent = Symbol(),
  formDataEndEvent = Symbol(),
  simpleBodyEndEvent = Symbol();
async function parseFormDataBody({
  CT,
  res,
  save,
  limits = {
    fieldNameSize: 10,
    fields: 10,
    fieldSize: 50,
    files: 1,
    fileSize: 1024 * 1024,
    headerPairs: 3,
    parts: 11,
  },
  outDir: tempPath,
}) {
  if (
    !CT.startsWith("application/x-www-form-urlencoded") &&
    !CT.startsWith("multipart/form-data")
  )
    return { ok: false, data: new Error("wrong content-type") };
  var multi = busboy({ headers: { "content-type": CT }, limits }),
    fields = {},
    files = {},
    fileWritePromises = [],
    streams = /* @__PURE__ */ new Set(),
    clearedStreams = false,
    lastError = null;
  res.ok = true;
  function clearAll() {
    if (clearedStreams) return;
    clearedStreams = true;
    if (!multi.writableEnded || !multi.errored) multi.destroy();
    multi.removeAllListeners();
    streams.forEach(({ readStream, writeStream }) => {
      if (!readStream.closed) readStream.destroy();
      if (!writeStream.closed) writeStream.destroy();
      fs.unlink(writeStream.path).catch();
    });
    streams.clear();
    res.ok = false;
    res.emitter.emit(formDataEndEvent);
  }
  var onFile =
    save === "disk"
      ? function putToDisk(name, stream, { filename, encoding, mimeType }) {
          var path = tempPath + "/" + nanoid(10) + "_" + filename,
            writeStream = createWriteStream(path),
            data = { readStream: stream, writeStream },
            queue = [],
            processingQueue = false,
            fileEmitter = new EventEmitter();
          streams.add(data);
          const deleteEmptyFile = async () => {
            writeStream.end();
            fs.unlink(path).catch();
            path = void 0;
          };
          function pauseRes() {
            if (res.aborted || !multi.writableEnded) return;
            res.pause();
            res.paused = true;
          }
          function resumeRes() {
            if (res.aborted || !multi.writableEnded) return;
            res.resume();
            res.paused = false;
          }
          async function onData(chunk) {
            if (queue.length !== 0 || processingQueue)
              return queue.push(Buffer.from(chunk));
            processingQueue = true;
            do {
              if (res.aborted) return;
              const ok = writeStream.write(Buffer.from(chunk));
              if (ok) continue;
              if (!res.paused) pauseRes();
              await new Promise((resolve) =>
                writeStream.once("drain", resolve)
              );
            } while ((chunk = queue.shift()));
            if (res.aborted) return;
            processingQueue = false;
            if (!multi.writableEnded) resumeRes();
            if (stream.readableEnded) {
              fileEmitter.emit(wroteToDiskFileEvent);
            }
          }
          stream
            .on("data", (chunk) => {
              onData(chunk).catch((err) => {
                lastError = err;
                clearAll();
              });
            })
            .once("end", async () => {
              stream.removeAllListeners();
              if (res.aborted) return;
              if (!stream.readableDidRead) return deleteEmptyFile();
              if (processingQueue)
                new Promise((resolve) =>
                  fileEmitter.once(wroteToDiskFileEvent, resolve)
                ).then(() => writeStream.end());
              else writeStream.end();
            })
            .once("error", (err) => {
              queue = [];
              lastError = err;
              stream.removeAllListeners();
              writeStream.removeAllListeners();
              clearAll();
            });
          const fileWritePromise = new Promise((resolve, reject) => {
            writeStream
              .once("finish", () => {
                writeStream.removeAllListeners();
                if (res.aborted) return reject();
                streams.delete(data);
                files[name] = { filename, path, mimeType, encoding };
                resolve();
              })
              .once("error", (err) => {
                writeStream.removeAllListeners();
                lastError = err;
                reject(err);
              });
          });
          fileWritePromises.push(fileWritePromise);
        }
      : function putToMemory(name, stream, { filename, mimeType, encoding }) {
          var contents = Buffer.alloc(0);
          fileWritePromises.push(
            new Promise((resolve, reject) => {
              stream
                .once("end", () => {
                  stream.removeAllListeners();
                  files[name] = {
                    filename,
                    mimeType,
                    encoding,
                    contents,
                  };
                  resolve();
                })
                .once("error", (err) => {
                  lastError = err;
                  reject(err);
                });
            })
          );
          stream.on("data", (chunk) => {
            contents = Buffer.concat([contents, chunk]);
          });
        };
  multi
    .on("file", onFile)
    .on("field", (fieldname, value) => {
      fields[fieldname] = value;
    })
    .once("finish", () => {
      function end(reason) {
        if (res.aborted || reason instanceof Error) return clearAll();
        res.emitter.emit(formDataEndEvent);
      }
      Promise.all(fileWritePromises).then(end).catch(end);
    })
    .once("error", clearAll);
  res.emitter.once("abort", clearAll);
  res.onData((ab, isLast) => {
    if (!res.ok) return;
    multi.write(new Uint8Array(ab));
    if (isLast) multi.end();
  });
  await new Promise((resolve) => res.emitter.once(formDataEndEvent, resolve));
  res.emitter.off("abort", clearAll);
  res.emitter.removeAllListeners(formDataEndEvent);
  return res.ok
    ? { ok: true, data: { fields, files } }
    : { ok: false, data: lastError };
}
async function parseSimpleBody({ res, limit, CT }, schema) {
  var actions = {
      "application/json": () => JSON.parse(uint8.toString()),
      "application/x-protobuf": () => schema.decode(uint8),
      "text/plain": () => uint8.toString(),
    },
    uint8 = Buffer.alloc(0);
  if (!limit) limit = 1024 * 1024;
  res.onData((ab, isLast) => {
    if (uint8.length + ab.byteLength > limit) return tooLargeBody(res, limit);
    uint8 = Buffer.concat([Buffer.from(ab), uint8]);
    if (isLast) res.emitter.emit(simpleBodyEndEvent);
  });
  await new Promise((resolve) => res.emitter.once(simpleBodyEndEvent, resolve));
  return {
    ok: true,
    data: (actions[CT] || (() => uint8))(),
  };
}
export { parseFormDataBody, parseSimpleBody };
