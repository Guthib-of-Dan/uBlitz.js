import type {
  HttpRequest,
  TemplatedApp,
  HttpResponse as uwsHttpResponse,
} from "uWebSockets.js";
import type { PBType, PBMessage } from "./proto.mts";
import { Buffer } from "node:buffer";
import { parseFormDataBody, type FileInfo, parseSimpleBody } from "./body.mts";
import { sendFile } from "./sendFile.mts";
import { logger } from "./logger.mts";
import { simpleProtoEnc } from "./proto.mts";
import {
  checkContentLength,
  seeOtherMethods,
  badRequest,
  tooLargeBody,
} from "./http-codes.mts";
import { HeavyRoute, LightRoute, registerAbort, Router } from "./router.mts";
import { CSPDirs, setCSP, HeadersMap } from "./http-headers.mts";
import { EventEmitter } from "tseep";
/**
 * An extended version of uWS.App . It provides you with several features:
 * 1) plugin registration (just like in Fastify);
 * 2) adding global error handling (which you can be overwritten in LightRoute or HeavyRoute)
 */
declare interface Server extends TemplatedApp {
  /**
   * It is same as plugins in Fastify -> you register some routes in remove file
   * @param plugin
   * @returns itself for chaining methods
   */
  register: (plugin: PluginType) => Server;
  /** set global errorHandler*/
  onError(fn: (error: Error, res: HttpResponse, data: any) => any): Server;
  _errHandler?(error: Error, res: HttpResponse, data: any): any;
}
/**
 * function, you pass in definePlugin. Here you can register
 */
declare type PluginType = (server: Server) => void;
/**
 * Utility for making a plugin. Just for readability.
 * @param plugin
 * @returns plugin you passed
 */
var definePlugin = (plugin: PluginType): PluginType => plugin;
/**
 * little more typed response
 */
declare interface HttpResponse extends uwsHttpResponse {
  /**
   * An event emitter, which lets you subscribe several listeners to "abort" event OR your own events, defined with Symbol().
   */
  emitter: EventEmitter<{
    abort: () => void;
    [k: symbol]: () => void;
  }>;
  /**
   * changes when res.onAborted fires.
   */
  aborted?: boolean;
}

declare type HttpControllerFn = (
  res: HttpResponse,
  req: HttpRequest
) => any | Promise<any>;
/**
 * basic httpMethods for now
 */
declare type HttpMethods =
  | "get"
  | "post"
  | "del"
  | "patch"
  | "put"
  | "head"
  | "trace"
  | "options"
  | "any"
  | "ws"; //NOT A HTTP METHOD, but had to put it here

/**
 * extends uWS.App(). See interface @μBlitz/js.Server
 * @param app uWS.App()
 */
function extendApp(App: TemplatedApp): Server {
  const server = App as Server;
  server.register = function (plugin: PluginType) {
    plugin(this);
    return this;
  };
  server.onError = function (fn) {
    server._errHandler = fn;
    return this;
  };

  return server;
}
/**
 * fast conversion to ArrayBuffer ('cause transferring strings to uWS is really slow)
 */
function toAB(data: Buffer | string): ArrayBuffer {
  var NodeBuf: Buffer =
    data instanceof Buffer ? data : Buffer.from(data as string);
  return NodeBuf.buffer.slice(
    NodeBuf.byteOffset,
    NodeBuf.byteOffset + NodeBuf.byteLength
  ) as any;
}
export {
  type HttpResponse,
  type HttpMethods,
  type HttpControllerFn,
  type Server,
  type PBMessage,
  type PBType,
  type FileInfo,
  HeavyRoute,
  Router,
  LightRoute,
  HeadersMap,
  simpleProtoEnc,
  extendApp,
  checkContentLength,
  seeOtherMethods,
  registerAbort,
  parseFormDataBody,
  parseSimpleBody,
  setCSP,
  sendFile,
  toAB,
  definePlugin,
  badRequest,
  tooLargeBody,
  CSPDirs,
  logger,
};
