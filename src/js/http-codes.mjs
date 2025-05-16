import { toAB } from "./index.mjs";
var c411 = toAB("411");
var c400 = toAB("400");
var c413 = toAB("413");
var c405 = toAB("405");
var c404 = toAB("404");
var allowHeader = toAB("Allow");
var c405Message = toAB("Method is not allowed");
function checkContentLength(res, req) {
  var CL = Number(req.getHeader("content-length"));
  if (!CL) {
    res.finished = true;
    res.cork(() => res.writeStatus(c411).endWithoutBody(0, true));
    throw new Error("Wrong content-length", { cause: { CL } });
  }
  return CL;
}
function badRequest(res, error, causeForYou) {
  res.finished = true;
  if (!res.aborted) res.cork(() => res.writeStatus(c400).end(toAB(error)));
  throw new Error("Bad request", { cause: causeForYou });
}
function tooLargeBody(res, limit) {
  var message = toAB("Body is too large. Limit in bytes - " + limit);
  if (!res.aborted) res.cork(() => res.writeStatus(c413).end(message));
  res.finished = true;
  throw new Error("body too large", { cause: { limit } });
}
function seeOtherMethodsConstructor(methodsArr) {
  var methods = toAB(
    methodsArr
      .map((method) => method.toUpperCase())
      .join(", ")
      .replace("DEL", "DELETE")
      .replace(/ WS,*/g, "")
  );
  return (res) =>
    res.writeStatus(c405).writeHeader(allowHeader, methods).end(c405Message);
}
function notFoundConstructor(message = "Not found") {
  var mes = toAB(message);
  return (res) => res.writeStatus(c404).end(mes, true);
}
export {
  badRequest,
  checkContentLength,
  notFoundConstructor,
  seeOtherMethodsConstructor as seeOtherMethods,
  tooLargeBody,
};
