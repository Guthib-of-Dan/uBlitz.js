import { Buffer } from "node:buffer";
export * from "./http-headers.mjs";
export * from "./uws-missing-types.mjs";
import { EventEmitter } from "tseep";
function registerAbort(res) {
  if (typeof res.aborted === "boolean")
    throw new Error("abort already registered");
  res.aborted = false;
  res.emitter = new EventEmitter();
  return res.onAborted(() => {
    res.aborted = true;
    res.emitter.emit("abort");
  });
}
var definePlugin = (plugin) => plugin;
function extendApp(app) {
  const server = app;
  server.register = function (plugin) {
    return plugin(this), this;
  };
  server.onError = function (fn) {
    return (server._errHandler = fn), this;
  };
  return server;
}
function toAB(data) {
  var NodeBuf = data instanceof Buffer ? data : Buffer.from(data);
  return NodeBuf.buffer.slice(
    NodeBuf.byteOffset,
    NodeBuf.byteOffset + NodeBuf.byteLength
  );
}
export { definePlugin, extendApp, registerAbort, toAB };
