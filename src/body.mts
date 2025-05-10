import { type HttpResponse } from "./index.mts";
import type { PBType } from "./proto.mts";
import { EventEmitter } from "tseep";
import { tooLargeBody } from "./http-codes.mts";
import busboy from "busboy";
import { nanoid } from "nanoid";
import { createWriteStream, WriteStream } from "node:fs";
import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
import type { Readable } from "node:stream";
type SimpleCT = "application/json" | "application/x-protobuf" | "text/plain";
// type formCT = "multipart/form-data" | "application/x-www-form-urlencoded";
interface TheBody<Ok extends boolean, Data> {
  ok: Ok;
  data: Data;
}
interface stdBody {
  res: HttpResponse;
  limit?: number;
}
interface FileInfo {
  filename: string;
  mimeType: string;
  encoding: string;
}
type Files<T> = Record<string, FileInfo & T>;
type formData<T> = { fields: object; files: Files<T> };
type TextBody = TheBody<true, string>;
/**
 * paths of files returned are usually strings.
 */
type FilesOnDisk = Files<{ path: string | undefined }>;
type FilesInMemory = Files<{ contents: Buffer<ArrayBuffer> }>;
type FileSchema<T> = Record<keyof T[keyof T], any>;
var wroteToDiskFileEvent = Symbol(),
  formDataEndEvent = Symbol(),
  simpleBodyEndEvent = Symbol();
/**
 * it parses multipart OR x-www-form-urlencoded body with busboy.Option "save" is applicable only to files. If you use "save: 'disk'" option - you will get "path" of temporary (or whatever you will do with file) location. If "memory" - you will get "contents" field as Buffer
 */
async function parseFormDataBody<T extends "disk" | "memory">({
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
}: {
  res: HttpResponse & { paused?: boolean; ok?: boolean };
  CT: string;
  save: T;
  limits?: busboy.Limits;
  outDir: string;
}): Promise<
  | TheBody<
      true,
      T extends "memory"
        ? formData<{ contents: Buffer<ArrayBuffer> }>
        : T extends "disk"
        ? formData<{ path: string | undefined }>
        : never
    >
  | TheBody<false, Error>
> {
  if (
    !CT.startsWith("application/x-www-form-urlencoded") &&
    !CT.startsWith("multipart/form-data")
  )
    return { ok: false, data: new Error("wrong content-type") };
  var multi = busboy({ headers: { "content-type": CT }, limits }),
    fields: Record<string, string> = {},
    files: Files<
      { contents: Buffer<ArrayBuffer> } | { path: string | undefined }
    > = {},
    fileWritePromises: Promise<any>[] = [],
    streams: Set<{
      readStream: Readable;
      writeStream: WriteStream;
    }> = new Set(),
    clearedStreams = false,
    lastError: Error | null = null;
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
  var onFile: (
    name: string,
    stream: Readable & { truncated?: boolean },
    info: busboy.FileInfo
  ) => void =
    save === "disk"
      ? function putToDisk(name, stream, { filename, encoding, mimeType }) {
          var path: string | undefined =
              tempPath! + "/" + nanoid(10) + "_" + filename,
            writeStream = createWriteStream(path),
            data = { readStream: stream, writeStream },
            queue: (Buffer<ArrayBuffer> | undefined)[] = [],
            processingQueue: boolean = false,
            fileEmitter = new EventEmitter();
          streams.add(data);
          const deleteEmptyFile = async () => {
            writeStream.end();
            fs.unlink(path!).catch();
            path = undefined;
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
          async function onData(
            chunk: Buffer<ArrayBuffer> | undefined
          ): Promise<any> {
            if (queue.length !== 0 || processingQueue)
              return queue.push(Buffer.from(chunk!));
            processingQueue = true;
            do {
              if (res.aborted) return;
              const ok = writeStream.write(Buffer.from(chunk!));
              //no backpressure - continue
              if (ok) continue;
              if (!res.paused) pauseRes();
              await new Promise<void>((resolve) =>
                writeStream.once("drain", resolve)
              );
              //while queue has chunks - resume
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
                new Promise<void>((resolve) =>
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
          const fileWritePromise = new Promise<void>((resolve, reject) => {
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
          var contents: Buffer<ArrayBuffer> = Buffer.alloc(0);
          fileWritePromises.push(
            new Promise<void>((resolve, reject) => {
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
      //when files write to disk - end
      function end(reason: Error | any[]) {
        if (res.aborted || reason instanceof Error) return clearAll();
        res.emitter.emit(formDataEndEvent);
      }
      //wait for files to write OR for an empty array to quit this parseFormDataBody
      Promise.all(fileWritePromises).then(end).catch(end);
    })
    .once("error", clearAll);
  res.emitter.once("abort", clearAll);
  res.onData((ab, isLast) => {
    if (!res.ok) return;
    multi.write(new Uint8Array(ab));
    if (isLast) multi.end();
  });
  await new Promise<void>((resolve) =>
    res.emitter.once(formDataEndEvent, resolve)
  );

  res.emitter.off("abort", clearAll);
  res.emitter.removeAllListeners(formDataEndEvent);
  return res.ok
    ? ({ ok: true, data: { fields, files } } as any)
    : { ok: false, data: lastError! };
}
/**
 * This function parses such body, which need to be allocated in memory at first, and then parsed as a whole (json, test, protobuf)
 */
async function parseSimpleBody<
  C extends SimpleCT | undefined,
  T extends PBType | undefined
>(
  { res, limit, CT }: stdBody & { CT: C },
  schema?: T
): Promise<
  TheBody<
    true,
    C extends "text/plain"
      ? TextBody
      : C extends "application/json"
      ? object
      : C extends undefined
      ? Buffer<ArrayBuffer>
      : T extends { new (t: any): infer U } & PBType
      ? U
      : never
  >
> {
  var actions: Record<SimpleCT, () => any> = {
      "application/json": () => JSON.parse(uint8.toString()),
      "application/x-protobuf": () => schema!.decode(uint8),
      "text/plain": () => uint8.toString(),
    },
    uint8: Buffer<ArrayBuffer> = Buffer.alloc(0);
  if (!limit) limit = 1024 * 1024;
  res.onData((ab, isLast): any => {
    if (uint8.length + ab.byteLength > limit!) return tooLargeBody(res, limit!);
    uint8 = Buffer.concat([Buffer.from(ab), uint8!]);
    if (isLast) res.emitter.emit(simpleBodyEndEvent);
  });
  await new Promise<void>((resolve) =>
    res.emitter.once(simpleBodyEndEvent, resolve)
  );
  return {
    ok: true,
    data: ((actions as any)[CT as any] || (() => uint8))(),
  };
}
export {
  parseFormDataBody,
  parseSimpleBody,
  type FileInfo,
  type FileSchema,
  type FilesInMemory,
  type FilesOnDisk,
};
