import type { HttpRequest, WebSocketBehavior } from "uWebSockets.js";
import {
  logger,
  toAB,
  type HttpControllerFn,
  type HttpMethods,
  type HttpResponse,
  type Server,
} from "./index.mts";
import { registerAbort } from "./index.mts";
import type { Static, TSchema } from "@sinclair/typebox";
import Ajv from "ajv";
import { badRequest, seeOtherMethods } from "./http-codes.mts";
var ajv = new Ajv();

interface routeMonolith {
  controller: HttpControllerFn;
  route: any;
  errHandler: Server["_errHandler"];
}
function bindValidate<T extends string>(
  res: HttpResponse,
  validators: any,
  data: Record<T, any>
): (field: T) => void {
  return (field) => {
    if (validators[field](data[field])) return;
    if (!res.aborted && !res.finished)
      badRequest(
        res,
        JSON.stringify(validators[field].errors![0]),
        "bad " + field
      );
    throw new Error("bad field " + field);
  };
}
/**
 * @author me: "Route's description is the route itself".
 * @description No need to separate controller and call it like "app.post("/createDbUser",createDbUser)", if names are the same.
 * With this class you specify route and then its methods. Just this.
 */
class Router<Opts extends routerOpts> {
  private options: Opts;
  private server?: Server | undefined;
  constructor(opts: Opts) {
    this.options = opts;
  }
  /**
   * When you use definePlugin - you get the server instance, which you "bind" to your router
   */
  public bind(server: Server): this {
    this.server = server;
    return this;
  }
  /**
   * @example
   * router.bind(server).route(PATH, ...registeredMethods)
   */
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
        errHandler: this.server!._errHandler!,
      };
      if (
        monolith.route instanceof HeavyMethod ||
        monolith.route instanceof LightMethod
      ) {
        const isAsync = (fn: any) => fn[Symbol.toStringTag] === "AsyncFunction",
          route = monolith.route as
            | LightMethod<any, any>
            | HeavyMethod<any, any>,
          isRouteHeavy = route instanceof HeavyMethod,
          errorHandler = route.onError || this.server!._errHandler,
          isParseBodyAsync = isRouteHeavy && isAsync(route.parseBody),
          isErrorHandlerAsync = isAsync(errorHandler || 0),
          isFinalHandlerAsync =
            isAsync(route.handler) || isParseBodyAsync ? "async" : "",
          catchBlock = errorHandler
            ? `catch(error){${
                isErrorHandlerAsync ? "await " : ""
              }onErr(error,res,data);}`
            : "catch{};",
          validators = `var vals={meta:ajv.compile(route.schemas.meta),${
            isRouteHeavy ? "body:ajv.compile(route.schemas.body)," : ""
          }};`,
          bodyValidation = isRouteHeavy
            ? `data.body=${
                isParseBodyAsync ? "await" : ""
              } route.parseBody(res,req,data.meta);val("body");`
            : "",
          metaValidation = "data.meta=route.getMeta(res, req);val('meta');",
          userHandler =
            (isAsync(route.handler) ? "await " : "") +
            "route.handler(res,req,data);",
          vars = "regAb(res);var data={},val=bindVal(res,vals,data);";
        monolith.controller = new Function(
          "regAb",
          "onErr",
          "ajv",
          "route",
          "bindVal",
          `${validators}return ${isFinalHandlerAsync}(res,req)=>{${vars}try{${metaValidation}${bodyValidation}${userHandler}}${catchBlock}}`
        )(registerAbort, errorHandler, ajv, route, bindValidate);
      } else monolith.controller = monolith.route;
      (this.server as any)[method](toAB(path as string), monolith.controller);
    });
    if (methods.includes("ws")) {
      logger.log("got ws");
      this.server!.ws(toAB(path as string), this.options[path]["ws"]!);
    }
    var controller: HttpControllerFn = this.options[path]["any"] as any;
    if (controller instanceof LightMethod)
      throw new Error("No Route classes for 'any' routes");
    if (!controller) controller = seeOtherMethods(methods as HttpMethods[]);
    (this.server as any)["any"](path, controller);
    return this;
  }
}
/**
 * route WITHOUT body
 */
class LightMethod<T extends Schemas<"meta">, Shared>
  implements lightMethodI<T, Shared>
{
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
   * @param error - what happened
   * @param res - you can close the connection after error, but only if it wasn't aborted before
   * @param data - the data, you returned from preparator as additional request info
   * @returns
   */
  onError?: (error: Error, res: HttpResponse, data: RequestData<T>) => any;
  shared?: Shared;
  /**
   * @param data same as described in this.schemas, but validated
   */
  handler: (
    res: HttpResponse,
    req: HttpRequest,
    data: RequestData<T>
  ) => any | Promise<any>;
  constructor(opts: lightMethodI<T, Shared>) {
    this.shared = opts.shared;
    this.schemas = opts.schemas;
    this.onError = opts.onError;
    this.handler = opts.handler;
    this.getMeta = opts.getMeta;
  }
}
/**
 * route WiTH body
 */
class HeavyMethod<T extends Schemas<"meta" | "body">, Shared>
  extends LightMethod<T, Shared>
  implements heavyMethodI<T, Shared>
{
  /**
   * @param meta data, returned from this.getMeta
   * @returns body, which will be validated with this.schemas.body
   */
  parseBody: (
    res: HttpResponse,
    req: HttpRequest,
    meta: Static<T["meta"]>
  ) => Static<T["body"]> | Promise<Static<T["body"]>>;
  constructor(opts: heavyMethodI<T, Shared>) {
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
interface heavyMethodI<T extends Schemas<"meta" | "body">, Shared>
  extends lightMethodI<T, Shared> {
  parseBody: (
    res: HttpResponse,
    req: HttpRequest,
    meta: Static<T["meta"]>
  ) => Static<T["body"]> | Promise<Static<T["body"]>>;
}
interface lightMethodI<T extends Schemas<"meta">, Shared> {
  getMeta: (res: HttpResponse, req: HttpRequest) => Static<T["meta"]>;
  shared?: Shared;
  schemas: T;
  onError?: (error: Error, res: HttpResponse, data: RequestData<T>) => any;
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
      : HeavyMethod<any, any> | LightMethod<any, any> | HttpControllerFn;
  }>
>;
//#endregion
export { Router, registerAbort, HeavyMethod, LightMethod };
