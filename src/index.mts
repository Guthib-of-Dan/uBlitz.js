import type {
  HttpRequest,
  TemplatedApp,
  HttpResponse as uwsHttpResponse,
  AppOptions,
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
  notFoundConstructor,
} from "./http-codes.mts";
import { HeavyMethod, LightMethod, Router } from "./router.mts";
import { CSPDirs, setCSP, HeadersMap } from "./http-headers.mts";
import { EventEmitter } from "tseep";
import {
  DeclarativeResponse,
  type DeclarativeResType,
} from "./uws-missing-types.mts";
/**
 * function to effortlessly mark response as aborted AND to attach an event emitter, so that you can easily scale the handler. If you don't need event emitter and only some res.aborted - set it by yourself (no overkill for the handler)
 * @param res
 */
function registerAbort(res: HttpResponse): HttpResponse {
  if (typeof res.aborted === "boolean")
    throw new Error("abort already registered");
  res.aborted = false;
  res.emitter = new EventEmitter();
  return res.onAborted(() => {
    res.aborted = true;
    res.emitter.emit("abort");
  }) as any;
}
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
  /**some undocumented property in uWS - get it here */
  addChildAppDescriptor(...any: any[]): any;
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
   * This method actually exists in original uWebSockets.js, but is undocumented. I'll put it here for your IDE to be happy
   */
  collect: (...any: any[]) => any;
  /**
   * An event emitter, which lets you subscribe several listeners to "abort" event OR your own events, defined with Symbol().
   */
  emitter: EventEmitter<{
    abort: () => void;
    [k: symbol]: (...any: any[]) => void;
  }>;
  /**
   * changes when res.onAborted fires.
   */
  aborted?: boolean;
  /**
   * You should set it manually when ending the response. Particularly useful if some error has fired and you are doubting whether res.aborted is a sufficient flag.
   */
  finished: boolean;
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
 * extends uWS.App(). See interface Server
 * @param app uWS.App()
 */
function extendApp<
  T extends { App: (opts: AppOptions) => TemplatedApp; [k: string]: any }
>(uWS: T, options: AppOptions = {}): Server {
  const server = uWS.App(options) as Server;
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
 * conversion to ArrayBuffer ('cause transferring strings to uWS is really slow)
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
  type DeclarativeResType,
  HeavyMethod,
  Router,
  LightMethod,
  HeadersMap,
  DeclarativeResponse,
  notFoundConstructor,
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
