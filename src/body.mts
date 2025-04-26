import { logger, type HttpResponse } from "./index.mts";
import type { PBType, PBMessage } from "./proto.mts";
import { EventEmitter } from "node:events";
import { tooLargeBody } from "./http-codes.mts";
import busboy from "busboy";
type SimpleCT = "application/json" | "application/x-protobuf" | "text/plain";
type formCT = "multipart/form-data" | "application/x-www-form-urlencoded";
interface TheBody<Ok extends boolean, Data> {
  ok: Ok;
  data: Data;
}
interface stdBody {
  res: HttpResponse;
  limit?: number;
}

type FilesMap = Map<
  string,
  {
    filename: string;
    mimeType: string;
    contents: Buffer;
  }
>;
var isForm = (CT: string): boolean =>
  CT.startsWith("multipart/form-data") ||
  CT.startsWith("application/x-www-form-urlencoded");
/**
 * This function collects body and, if you specify content type (CT), parses it.
 * @description can handle "application/json" | "application/x-protobuf" | "text/plain" | "multipart/form-data" | "application/x-www-form-urlencoded"
 */
async function useBody(
  { res, CT, limit }: stdBody & { CT: SimpleCT | formCT },
  schema?: PBType
) {
  var condition = CT && isForm(CT);
  logger.warn("cond", condition, CT);
  try {
    return await (condition
      ? parseFormDataBody({ res, CT: CT as any, limit })
      : parseSimpleBody({ res, limit, CT: CT as any }, schema!));
  } catch (err) {
    return { ok: false, data: err as Error };
  }
}

async function parseFormDataBody(
  opts: stdBody & {
    CT: formCT;
  }
): Promise<TheBody<true, { fields: Map<string, string>; files: FilesMap }>>;

async function parseFormDataBody({
  res,
  CT,
}: stdBody & {
  CT: formCT;
}): Promise<TheBody<true, { fields: Map<string, string>; files: FilesMap }>> {
  var emitter = new EventEmitter();
  var multipartStream = busboy({ headers: { "content-type": CT } }),
    fields = new Map<string, string>(),
    files: FilesMap = new Map();

  multipartStream
    .on("field", (name, value) => fields.set(name, value))
    .on("file", (name, stream, { filename, mimeType }) => {
      var contents: Buffer = Buffer.alloc(0);
      stream
        .on("data", (chunk) => (contents = Buffer.concat([contents, chunk])))
        .on("end", () =>
          files.set(name, {
            filename,
            mimeType,
            contents,
          })
        );
    })
    .on("error", (err) => {
      throw new Error("multipart stream error", { cause: err });
    })
    .on("finish", () => emitter.emit("end"));
  res.onData((ab: ArrayBuffer, isLast: boolean) => {
    if (res.aborted) throw new Error("aborted");
    var ok = multipartStream.write(Buffer.from(ab));
    if (!ok) {
      logger.log("bbStream backpressure", multipartStream.writableNeedDrain);
      // while (multipartStream.writableNeedDrain) {}   if it happens - need queue
    }
    if (isLast) multipartStream.end();
  });
  await new Promise<void>((resolve) => emitter.once("end", resolve));
  return {
    ok: true,
    data: { fields, files },
  };
}

async function parseSimpleBody(
  opts: stdBody & { CT: "application/json" }
): Promise<TheBody<true, object>>;

async function parseSimpleBody(
  opts: stdBody & {
    CT: "text/plain";
  }
): Promise<TheBody<true, string>>;

async function parseSimpleBody(
  opts: stdBody & { CT: undefined }
): Promise<TheBody<true, Buffer<ArrayBuffer>>>;

async function parseSimpleBody(
  opts: stdBody & {
    CT: "application/x-protobuf";
  },
  schema: PBType
): Promise<TheBody<true, PBMessage>>;

async function parseSimpleBody(
  { res, limit, CT }: stdBody & { CT: SimpleCT | undefined },
  schema?: PBType
): Promise<TheBody<true, any>> {
  var emitter = new EventEmitter(),
    actions: Record<SimpleCT, () => any> = {
      "application/json": () => JSON.parse(uint8.toString()),
      "application/x-protobuf": () => schema!.decode(uint8),
      "text/plain": () => uint8.toString(),
    },
    uint8: Buffer<ArrayBuffer> = Buffer.alloc(0);
  if (!limit) limit = 1024 * 1024;
  res.onData((ab, isLast) => {
    if (uint8.length + ab.byteLength > limit!) return tooLargeBody(res, limit!);
    uint8 = Buffer.concat([Buffer.from(ab), uint8!]);
    if (isLast) emitter.emit("end");
  });
  await new Promise((resolve) => emitter.once("end", resolve));
  return {
    ok: true,
    data: ((actions as any)[CT as any] || (() => uint8))(),
  };
}

export { useBody };
