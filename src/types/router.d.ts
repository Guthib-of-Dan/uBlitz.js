import type {
  HttpControllerFn,
  HttpMethods,
  HttpResponse,
  Server,
  HttpRequest,
} from ".";
import type { Static, TSchema } from "@sinclair/typebox";
import type {
  DeclarativeResType,
  MoreDocumentedWebSocketBehavior as DocumentedWSBehavior,
} from "./uws-missing-types";
/**
 * @author me: "Route's description is the route itself".
 * @description No need to separate controller and call it like "app.post("/createDbUser",createDbUser)", if names are the same.
 * With this class you specify route and then its methods. Just this.
 * @external look in github examples folder
 */
export class Router<Opts extends routerOpts> {
  private options: Opts;
  private server?: Server | undefined;
  constructor(opts: Opts);
  /**
   * When you use definePlugin - you get the server instance, which you "bind" to your router
   */
  public bind(server: Server): this;
  /**
   * This function gives uWS you controllers. If you don't call this function - controller won't work
   * @example
   * router.bind(server).define(PATH, ...registeredMethods)
   */
  public define<Path extends keyof Opts>(
    path: Path,
    ...methods: (keyof Opts[Path])[]
  ): this;
  /**
   * prefixes all routes, which are defined after it. Can be used several times
   * @example
   * router
   *   .bind(server)
   *   .prefix("/api")
   *   .define("/users","get") // it is /api/users
   *   .prefix("/register") //several times
   *   .define("/refresh","post") // it is /register/refresh
   */
  public prefix(str: string | undefined): this;
}
/**
 * class controller WITHOUT body
 * @param options all routes with methods
 * @description
 * Lifecycle:
 * 1) registerAbort
 * 2) getMeta (headers, query, params)
 * 3) internal validation (if failed - 400 http code, res.finished = true AND throws an error)
 * 4) handler
 * @throws errors into 1) this.onError 2) global onError 3) empty catch block
 */
export class LightMethod<T extends Schemas<"meta">, Shared>
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
  /**
   * here you may or may not compile strings to arrayBuffers, save headersMap, do WHATEVER you want and use that with this.shared! expression
   */
  shared?: Shared;
  /**
   * @param data same as described in this.schemas, but validated
   */
  handler: (
    res: HttpResponse,
    req: HttpRequest,
    data: RequestData<T>
  ) => any | Promise<any>;
  constructor(opts: lightMethodI<T, Shared>);
}
/**
 * Class controller for handling requests with body.
 * Lifecycle:
 * 1) registerAbort(res)
 * 2) getMeta
 * 3) validate meta (if bad - throws an error + 404 code)
 * 4) await parseBody
 * 5) validate body (if bad - throws an error + 404 code)
 * 6) handler
 * @throws errors into : 1) this.onError OR 2) global app.onError OR 3) empty catch block
 */
export class HeavyMethod<T extends Schemas<"meta" | "body">, Shared>
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
  constructor(opts: heavyMethodI<T, Shared>);
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
      ? WSOpts<any>
      :
          | HeavyMethod<any, any>
          | LightMethod<any, any>
          | HttpControllerFn
          | DeclarativeResType;
  }>
>;
type WSOpts<UserData extends object = {}> = DocumentedWSBehavior<UserData>;
/**
 * This function takes a callback, which should  return basic websocket settings, like in uWS. Its purpose is to create a scope, in which you can create some shared variables for all handlers.
 */
export var WSMethod: <UserData extends object>(
  fn: () => WSOpts<UserData>
) => WSOpts<UserData>;
