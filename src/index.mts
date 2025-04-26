import {
  type HttpRequest,
  type TemplatedApp,
  type HttpResponse as uwsHttpResponse,
} from "uWebSockets.js";
import { Buffer } from "node:buffer";
import { useBody } from "./body.mts";
import { sendFile } from "./sendFile.mts";
import { logger } from "./logger.mts";
import { simpleProtoEnc } from "./proto.mts";
import { checkContentLength } from "./http-codes.mjs";
import { HeavyRoute, LightRoute, Router } from "./router.mts";
import { CSPDirs, setCSP, HeadersMap } from "./http-headers.mts";
/**
 * An extended version of uWS.App . It provides you with several features:
 * 1) plugin registration (just like in Fastify);
 * 2) adding global error handling (which you can overwrite in Router.heavyRoute)
 * 3) global callback on request abort
 */
declare interface Server extends TemplatedApp {
  /**
   * It is same as plugins in Fastify => you register some routes in remove file
   * @param plugin
   * @returns itself for chaining methods
   */
  register: (plugin: PluginType) => Server;
  /** set global errorHandler*/
  onError(fn: (error: Error, res: HttpResponse, data: any) => any): Server;
  _errHandler?(error: Error, res: HttpResponse, data: any): any;
  /**
   * global callback on abort. Can be rewritten on specific route using Router.heaveRoute.onAbort
   */
  globalOnAbort(fn: () => any): Server;
  _abortCb?(): any;
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
  server.globalOnAbort = function (fn) {
    this._abortCb = fn;
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
/**
 * interface of protobufjs Message, so that you aren't required to download protobufjs
 */
interface PBMessage {
  toJSON(): object;
}
/**
 * interface of protobufjs Type, so that you aren't required to download protobufjs
 */
interface PBType {
  decode(arr: Uint8Array, length?: number): PBMessage;
  [k: string]: any;
}
export {
  type HttpResponse,
  type HttpMethods,
  type HttpControllerFn,
  type Server,
  type PBMessage,
  type PBType,
  HeavyRoute,
  Router,
  LightRoute,
  HeadersMap,
  simpleProtoEnc,
  extendApp,
  checkContentLength,
  useBody,
  setCSP,
  sendFile,
  toAB,
  definePlugin,
  CSPDirs,
  logger,
};
