import { toAB, registerAbort } from "./index.mjs";
import Ajv from "ajv";
import { badRequest, seeOtherMethods } from "./http-codes.mjs";
var ajv = new Ajv();
function bindValidate(res, validators, data) {
  return (field) => {
    if (validators[field](data[field])) return;
    if (!res.aborted && !res.finished)
      badRequest(
        res,
        JSON.stringify(validators[field].errors[0]),
        "bad " + field
      );
    throw new Error("bad field " + field);
  };
}
class Router {
  #pre;
  constructor(opts) {
    this.options = opts;
  }
  bind(server) {
    this.server = server;
    return this;
  }
  define(path, ...methods) {
    if (new Set(methods).size !== methods.length)
      throw new Error("Http methods duplicate registered", { cause: { path } });
    const prefixedPath = (this.#pre ? this.#pre : "") + path;
    methods.forEach((method) => {
      if (method === "any") return;
      var monolith = {
        controller: () => {},
        route: this.options[path][method],
        errHandler: this.server._errHandler,
      };
      if (
        monolith.route instanceof HeavyMethod ||
        monolith.route instanceof LightMethod
      ) {
        const isAsync = (fn) => fn[Symbol.toStringTag] === "AsyncFunction",
          route = monolith.route,
          isRouteHeavy = route instanceof HeavyMethod,
          errorHandler = route.onError || this.server._errHandler,
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
      this.server[method](prefixedPath, monolith.controller);
    });
    if (methods.includes("ws")) {
      const opts = this.options[path]["ws"];
      this.server.ws(prefixedPath, opts);
    }
    var controller = this.options[path]["any"];
    if (controller instanceof LightMethod)
      throw new Error("No Route classes for 'any' routes");
    if (!controller) controller = seeOtherMethods(methods);
    this.server["any"](prefixedPath, controller);
    return this;
  }
  prefix(str) {
    this.#pre = str;
    return this;
  }
}
class LightMethod {
  constructor(opts) {
    this.shared = opts.shared;
    this.schemas = opts.schemas;
    this.onError = opts.onError;
    this.handler = opts.handler;
    this.getMeta = opts.getMeta;
  }
}
class HeavyMethod extends LightMethod {
  constructor(opts) {
    super(opts);
    this.getMeta = opts.getMeta;
    this.parseBody = opts.parseBody;
  }
}
var WSMethod = (fn) => fn();
export { HeavyMethod, LightMethod, Router, WSMethod };
