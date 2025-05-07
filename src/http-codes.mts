import type { HttpRequest } from "uWebSockets.js";
import { toAB, type HttpMethods } from "./index.mts";
import type { HttpResponse as uwsHttpResponse } from "uWebSockets.js";
/**
 * If something wrong is to content-length, sends 411 code and throws error with a "cause"
 */
var c411 = toAB("411");
function checkContentLength(res: uwsHttpResponse, req: HttpRequest): number {
  var CL = Number(req.getHeader("content-length"));
  if (!CL) {
    res.writeStatus(c411).endWithoutBody(0, true);
    throw new Error("Wrong content-length", { cause: { CL } });
  }
  return CL;
}
/**
 * sends http 400 and throws an Error with "causeForYou"
 */
var c400 = toAB("400");
function badRequest(res: uwsHttpResponse, error: string, causeForYou: string) {
  res.writeStatus(c400).end(toAB(error));
  throw new Error("Bad request", { cause: causeForYou });
}
/**
 * sends http 413 And throws an Error with a "cause"
 */
var c413 = toAB("413");
function tooLargeBody(res: uwsHttpResponse, limit: number) {
  res
    .writeStatus(c413)
    .end(toAB("Body too large. Limit - " + limit + " bytes"));
  throw new Error("body too large", { cause: { limit } });
}
/**
 * Sends http 405, sets http Allow header with all methods you passed
 */
function seeOtherMethods(
  methodsArr: HttpMethods[]
): (res: uwsHttpResponse, req: any) => any {
  var code = toAB("405");
  var header = toAB("Allow");
  var methods = toAB(
    methodsArr
      .map((method) => method.toUpperCase())
      .join(", ")
      .replace("DEL", "DELETE")
      .replace(/ WS,*/g, "")
  );
  var end = toAB("Not allowed method");
  return (res) => res.writeStatus(code).writeHeader(header, methods).end(end);
}
function notFoundConstructor(
  message: string = "Not found"
): (res: uwsHttpResponse, req: any) => any {
  var mes = toAB(message);
  var code = toAB("404");
  return (res) => res.writeStatus(code).end(mes, true);
}
export {
  checkContentLength,
  badRequest,
  tooLargeBody,
  seeOtherMethods,
  notFoundConstructor,
};
