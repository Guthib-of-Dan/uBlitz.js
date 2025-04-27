import type { HttpRequest } from "uWebSockets.js";
import {
  toAB,
  type HttpControllerFn,
  type HttpMethods,
  type HttpResponse,
} from "./index.mts";
/**
 * If something wrong is to content-length, sends 411 code and throws error with a "cause"
 */
function checkContentLength(res: HttpResponse, req: HttpRequest): number {
  var CL = Number(req.getHeader("content-length"));
  if (!CL) {
    res.writeStatus(toAB("411")).endWithoutBody(0, true);
    throw new EvalError("Wrong content-length", { cause: { CL } });
  }
  return CL;
}
/**
 * sends http 400 and throws an Error with "causeForYou"
 */
function badRequest(res: HttpResponse, error: string, causeForYou: string) {
  res.writeStatus(toAB("400")).end(toAB(error));
  throw new Error("Bad request", { cause: causeForYou });
}
/**
 * sends http 413 And throws an Error with a "cause"
 */
function tooLargeBody(res: HttpResponse, limit: number) {
  res
    .writeStatus(toAB("413"))
    .end(toAB("Body too large. Limit - " + limit + " bytes"));
  throw new Error("body too large", { cause: { limit } });
}
/**
 * Sends http 405, sets http Allow header with all methods you passed
 */
function seeOtherMethods(methodsArr: HttpMethods[]): HttpControllerFn {
  var code = toAB("405");
  var header = toAB("Allow");
  var methods = toAB(
    methodsArr
      .map((method) => method.toUpperCase())
      .join(", ")
      .replace("DEL", "DELETE")
      .replace(/ WS,*/g, "")
  );
  return (res) =>
    res.writeStatus(code).writeHeader(header, methods).endWithoutBody();
}
export { checkContentLength, badRequest, tooLargeBody, seeOtherMethods };
