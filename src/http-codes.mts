import type { HttpRequest } from "uWebSockets.js";
import { toAB, type HttpMethods } from "./index.mts";
import type { HttpResponse as uwsHttpResponse } from "uWebSockets.js";
var c411 = toAB("411");
var c400 = toAB("400");
var c413 = toAB("413");
var c405 = toAB("405");
var c404 = toAB("404");
var allowHeader = toAB("Allow");
var c405Message = toAB("Method is not allowed");
/**
 * If something wrong is to content-length, sends 411 code and throws error with a "cause"
 */
function checkContentLength(res: uwsHttpResponse, req: HttpRequest): number {
  var CL = Number(req.getHeader("content-length"));
  if (!CL) {
    res.finished = true;
    res
      .onAborted(() => {})
      .writeStatus(c411)
      .endWithoutBody(0, true);
    throw new Error("Wrong content-length", { cause: { CL } });
  }
  return CL;
}
/**
 * sends http 400 and throws an Error with "causeForYou"
 */
function badRequest(res: uwsHttpResponse, error: string, causeForYou: string) {
  res.finished = true;
  res
    .onAborted(() => {})
    .writeStatus(c400)
    .end(toAB(error));
  throw new Error("Bad request", { cause: causeForYou });
}
/**
 * sends http 413 And throws an Error with a "cause"
 */
function tooLargeBody(res: uwsHttpResponse, limit: number) {
  res.finished = true;
  res
    .onAborted(() => {})
    .writeStatus(c413)
    .end(toAB("Body too large. Limit - " + limit + " bytes"));
  throw new Error("body too large", { cause: { limit } });
}
/**
 * Constructs function, which sends http 405 and sets http Allow header with all methods you passed
 */
function seeOtherMethodsConstructor(
  methodsArr: HttpMethods[]
): (res: uwsHttpResponse, req: any) => any {
  var methods = toAB(
    methodsArr
      .map((method) => method.toUpperCase())
      .join(", ")
      .replace("DEL", "DELETE")
      .replace(/ WS,*/g, "")
  );
  return (res) =>
    res
      .onAborted(() => {})
      .writeStatus(c405)
      .writeHeader(allowHeader, methods)
      .end(c405Message);
}
/**
 * Constructs the function, which sets 404 http code and sends the message you have specified
 */
function notFoundConstructor(
  message: string = "Not found"
): (res: uwsHttpResponse, req: any) => any {
  var mes = toAB(message);
  return (res) =>
    res
      .onAborted(() => {})
      .writeStatus(c404)
      .end(mes, true);
}
export {
  checkContentLength,
  badRequest,
  tooLargeBody,
  seeOtherMethodsConstructor as seeOtherMethods,
  notFoundConstructor,
};
