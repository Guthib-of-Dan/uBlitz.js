import type { HttpRequest, WebSocketBehavior } from "uWebSockets.js";
import {
  HeadersMap,
  logger,
  toAB,
  type HttpControllerFn,
  type HttpMethods,
  type HttpResponse,
  type Server,
} from "./index.mts";
import type { Static, TSchema } from "@sinclair/typebox";
import Ajv from "ajv";
import { badRequest, SeeOtherMethods } from "./http-codes.mts";
import type { BaseHeaders } from "./http-headers.mts";
var ajv = new Ajv();
/**
 * function to easily handle request abortion and, if param is true - immediately end the request
 * @param res
 * @param abortCb this function is called right when request is getting aborted
 * @returns true, if request was aborted, and else, if not. Use only with let:  "let a = registerAbort()"
 */
function registerAbort(
  res: HttpResponse,
  cb?: (res: HttpResponse) => any | undefined
): HttpResponse {
  if (typeof res.aborted === "boolean")
    throw new Error("abort already registered");
  res.aborted = false;
  res.onAborted(() => {
    if (cb) cb(res);
    res.aborted = true;
  });
  return res;
}
interface routeMonolith {
  controller: HttpControllerFn;
  route: any;
  staticHeaders?: HeadersMap<BaseHeaders>;
  abortCb: () => any;
  errHandler: Server["_errHandler"];
}
function setCallbacks(monolith: routeMonolith): void {
  var { onAbort, onError, staticHeaders } = monolith.route as
    | LightRoute<any>
    | HeavyRoute<any>;
  if (onError) monolith.errHandler = onError;
  if (onAbort) monolith.abortCb = onAbort;
  if (staticHeaders) monolith.staticHeaders = staticHeaders;
}
function setSimpleController(monolith: routeMonolith): void {
  setStructure(monolith, async (res, req) =>
    (monolith.route as HttpControllerFn)(res, req)
  );
}
function setHeavyController(monolith: routeMonolith) {
  setCallbacks(monolith);
  type Data = Schemas<"meta" | "body">;
  var route = monolith.route as HeavyRoute<Data>;
  var validators: any = {
    meta: ajv.compile(route.schemas.meta),
    body: ajv.compile(route.schemas.body),
  };
  setStructure<RequestData<Data>>(monolith, async (res, req, data) => {
    if (monolith.staticHeaders) monolith.staticHeaders.toRes(res);
    var validate = bindValidate(res, validators, data);
    data.meta = route.getMeta(res, req);
    validate("meta");
    data.body = await route.parseBody(res, req, data.meta);
    validate("body");
    await route.handler(res, req, data);
  });
}
function setLightController(monolith: routeMonolith): void {
  setCallbacks(monolith);
  type Data = Schemas<"meta">;
  var route = monolith.route as LightRoute<Data>;
  var validators: any = {
    meta: ajv.compile(route.schemas.meta),
  };
  setStructure<RequestData<Data>>(monolith, async (res, req, data) => {
    if (monolith.staticHeaders) monolith.staticHeaders.toRes(res);
    var validate = bindValidate(res, validators, data);
    data.meta = route.getMeta(res, req);
    validate("meta");
    await route.handler(res, req, data);
  });
}
function bindValidate<T extends string>(
  res: HttpResponse,
  validators: any,
  data: Record<T, any>
): (field: T) => void {
  return (field) => {
    if (validators[field](data[field])) return;
    if (!res.aborted)
      badRequest(res, JSON.stringify(validators[field].errors![0]));
    throw new Error("bad " + field);
  };
}
function setStructure<Data>(
  monolith: routeMonolith,
  handler: (
    res: HttpResponse,
    req: HttpRequest,
    data: Data
  ) => any | Promise<any>
): void {
  monolith.controller = async (res, req) => {
    registerAbort(res, monolith.abortCb);
    var data: any = {};
    try {
      await handler(res, req, data);
    } catch (error) {
      await monolith.errHandler!(error as Error, res, data);
    }
  };
}
/**
 * @author me: "Route's description is the route itself".
 * @description No need to separate controller and call it like "app.post("/createDbUser",createDbUser)", if names are same.
 * With this you specify route, then its methods, then many routes as well. Just this.
 */
class Router<Opts extends routerOpts> {
  private options: Opts;
  private server?: Server | undefined;
  constructor(opts: Opts) {
    this.options = opts;
  }
  public bind(server: Server): this {
    this.server = server;
    return this;
  }
  public route<Path extends keyof Opts>(
    path: Path,
    ...methods: (keyof Opts[Path])[]
  ): this {
    if (new Set(methods).size !== methods.length)
      throw new Error("Http methods duplicate registered", { cause: { path } });
    methods.forEach((method) => {
      if (method === "any") return;
      var monolith: routeMonolith = {
        controller: () => {},
        route: this.options[path][method] as any,
        abortCb: this.server!._abortCb!,
        errHandler: this.server!._errHandler!,
      };
      if (monolith.route instanceof HeavyRoute) setHeavyController(monolith);
      else if (monolith.route instanceof LightRoute)
        setLightController(monolith);
      else setSimpleController(monolith);
      (this.server as any)[method](toAB(path as string), monolith.controller);
    });
    if (methods.includes("ws")) {
      logger.log("got ws");
      this.server!.ws(toAB(path as string), this.options[path]["ws"]!);
    }
    var anyMonolith: routeMonolith = {
      controller: () => {},
      route: undefined,
      abortCb: this.server!._abortCb!,
      errHandler: this.server!._errHandler!,
    };
    var controller: HttpControllerFn = this.options[path]["any"] as any;
    if (controller instanceof LightRoute)
      throw new Error("No Route classes for 'any' routes");
    if (!controller) controller = SeeOtherMethods(methods as HttpMethods[]);
    setStructure(anyMonolith, controller);
    (this.server as any)["any"](toAB(path as string), anyMonolith.controller);
    return this;
  }
}
/**
 * route WITHOUT body
 */
class LightRoute<T extends Schemas<"meta">> implements lightRouteI<T> {
  staticHeaders?: HeadersMap<BaseHeaders> | undefined;
  schemas: T;
  onAbort?(): void;
  getMeta: (res: HttpResponse, req: HttpRequest) => Static<T["meta"]>;
  onError?: (error: Error, res: HttpResponse, data: RequestData<T>) => any;
  handler: (
    res: HttpResponse,
    req: HttpRequest,
    data: RequestData<T>
  ) => any | Promise<any>;
  constructor(opts: lightRouteI<T>) {
    this.staticHeaders = opts.staticHeaders;
    this.schemas = opts.schemas;
    this.onAbort = opts.onAbort;
    this.onError = opts.onError;
    this.handler = opts.handler;
    this.getMeta = opts.getMeta;
  }
}
/**
 * route WiTH body
 */
class HeavyRoute<T extends Schemas<"meta" | "body">>
  extends LightRoute<T>
  implements heavyRouteI2<T>
{
  parseBody: (
    res: HttpResponse,
    req: HttpRequest,
    meta: Static<T["meta"]>
  ) => Static<T["body"]> | Promise<Static<T["body"]>>;
  constructor(opts: heavyRouteI2<T>) {
    super(opts);
    this.getMeta = opts.getMeta;
    this.parseBody = opts.parseBody;
  }
}
type Schemas<Keys extends string = string> = Record<Keys, TSchema>;
/**
 * data, which looks like (HeavyRoute | LightRoute).schemas, but is already validated. Is passed to onError and handler
 */
type RequestData<T extends Schemas> = {
  [type in keyof T]: Static<T[type]>;
};
interface heavyRouteI2<T extends Schemas<"meta" | "body">>
  extends lightRouteI<T> {
  /**
   * @param meta data, returned from this.getMeta
   * @returns body, which will be validated with this.schemas.body
   */
  parseBody: (
    res: HttpResponse,
    req: HttpRequest,
    meta: Static<T["meta"]>
  ) => Static<T["body"]> | Promise<Static<T["meta"]>>;
}
interface lightRouteI<T extends Schemas<"meta">> {
  staticHeaders?: HeadersMap<BaseHeaders>;
  /**
   * function which prepares the request data for the validation (headers, parameters, querystring).
   * @returns data, which will be validated with this.schemas.meta
   */
  getMeta: (res: HttpResponse, req: HttpRequest) => Static<T["meta"]>;
  /**
   * schemas, which will validate the staff you return from heavyRoute.getMeta & heavyRoute.parseBody
   */
  schemas: T;
  /**
   * additional callback on request abort. Can't be anything tied to request or response objects
   */
  onAbort?: () => void;
  /**
   * @param error - what happened
   * @param res - you can close the connection after error, but only if it wasn't aborted before
   * @param data - the data, you returned from preparator as additional request info
   * @returns
   */
  onError?: (error: Error, res: HttpResponse, data: RequestData<T>) => any;
  /**
   * @param data same as described in this.schemas, but validated
   */
  handler: (
    res: HttpResponse,
    req: HttpRequest,
    data: RequestData<T>
  ) => any | Promise<any>;
}

type routerOpts = Record<
  /*route*/ string,
  Partial<{
    /*method*/ [Method in HttpMethods]: Method extends "ws"
      ? WebSocketBehavior<any>
      : HeavyRoute<any> | LightRoute<any> | HttpControllerFn;
  }>
>;
//#endregion
export { Router, registerAbort, HeavyRoute, LightRoute };
