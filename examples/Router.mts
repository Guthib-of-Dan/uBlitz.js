import uWS from "uWebSockets.js";
import {
  DeclarativeResponse,
  definePlugin,
  extendApp,
  HeadersMap,
  type Server,
} from "ublitz.js";
import { notFoundConstructor } from "ublitz.js/codes";
import { Router, LightMethod } from "ublitz.js/router";
import { logger } from "../src/types/logger";
import { Type } from "@sinclair/typebox";
import { setTimeout } from "node:timers/promises";
const port = 9001;
const router = new Router({
  // route
  "/anything": {
    //functional controllers
    any(res, req) {
      res.end("Any route with method: " + req.getMethod());
    },
    //several methods
    get(res) {
      res.end("This is a GET method of '/anything'");
    },
  },
  "/static/yes": {
    // Typed DeclarativeResponse (original had no docs)
    get: new DeclarativeResponse()
      .writeHeaders({
        "Content-Type": "text/plain",
        "Referrer-Policy": "no-referrer",
      })
      .end("Yeah. THIS is VERY static."),
  },
  // params as in basic uWS
  "/candy/:kind": {
    /**class controller of light method without body, which handles registerAbort(res) automatically.
     * Lifecycle:
     * registerAbort
     * -> getMeta (headers, query, params)
     * -> internal validation (if failed - 400 http code, res.finished = true AND throws an error)
     * -> handler
     * -> if errored: 1) this.onError 2) global onError 3) empty catch block
     */
    get: new LightMethod({
      // ajv validation schemas.
      schemas: {
        /* What is defined here should be returned in getMeta */
        meta: Type.Object({
          kind: Type.String({ maxLength: 10, minLength: 2 }),
        }),
      },
      // shared properties in this method. It can be whatever you want. Usually is used to reduce variable scope.
      shared: {
        headers: new HeadersMap({
          "Content-Type": "text/plain",
          Vary: "Content-Length",
        }).prepare(),
      },
      getMeta(/*res*/ _, req) {
        return {
          /*you can use "as any", because for ensuring validity exists validation.*/
          kind: req.getParameter(0) as any,
        };
      },
      async handler(res, _ /*req*/, data) {
        this.shared!.headers(res);
        await setTimeout(2000);
        //Don't worry. We have this.onError
        if (res.aborted) throw new Error("aborted");
        res.cork(() =>
          res.end("So you want candy? Have some " + data.meta.kind + "!")
        );
      },
      onError(error, res, data) {
        /*check if response was aborted OR response was sent (after validation for instance)*/
        if (!res.aborted && !res.finished) res.close();
        /**data is an object, you return from this.getMeta */
        logger.error("ERROR in /candy/" + data.meta.kind, error);
      },
    }),
  },
  // same wildcard as in uWS
  "/*": {
    // utility, which sends 404 with given message
    any: notFoundConstructor("NOT FOUND AT ALL"),
  },
});
// Usually this is used for import/export syntax. You export definePlugin and put it in register.
// In this example there is only 1 file so you can use just router.bind(app).route() on the outer level
const plugin = definePlugin((server: Server) =>
  // some methods can be left unspecified so that you can safely add new or remove.
  // It has checks of duplicates but not checks of methods you forgot.
  //* Don't forget to define them, if they are ready to be used.
  router
    .bind(server)
    .define("/anything", "any", "get" /*several methods*/)
    .define("/static/yes", "get")
    .define("/candy/:kind", "get")
    .define("/*", "any")
);

extendApp(uWS.App())
  /**catches errors for all CLASS controllers */
  .onError((error, res /*,data*/) => {
    if (!res.aborted && !res.finished) res.close();
    logger.error("ERROR", error);
  })
  .register(plugin)
  .listen(port, (token) => {
    if (token) logger.info("Listening to port " + port);
    else logger.error("Failed to listen to port " + port);
  });
