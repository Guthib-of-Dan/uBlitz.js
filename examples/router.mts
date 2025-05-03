import { Type } from "@sinclair/typebox";
import {
  definePlugin,
  HeadersMap,
  logger,
  sendFile,
  toAB,
} from "../src/index.mts";
import { HeavyRoute, Router } from "../src/router.mts"; // or "ublitz.js"
import { parseFormDataBody } from "../src/body.mts";
const router = new Router({
  "/": {
    // simple controller
    get(res) {
      HeadersMap.default.toRes(res);
      sendFile({
        res,
        path: "./tests/public/index.html",
        contentType: "text/html",
        //total size === size, which will be sent in bytes. Infinity === as much, as file has.
        totalSize: Infinity,
      });
    },
    // not essentially (but possible) to use "any" route (only function. Not LightRoute or HeavyRoute. Has no error handling or abort controller). It is handled automatically and sends 405 status with "Allow" header, containing all method, use registered in router.route ("WS" method is removed from header and "DEL" is renamed to "DELETE")
  },
  // "/users/:id": {
  //   get: new LightRoute({
  //     schemas: { meta: Type.Number({ maximum: 10 }) },
  //     getMeta(res, req) {
  //       const id = Number(req.getParameter("id")) satisfies Static<
  //         typeof this.schemas.meta
  //       >;
  //       if (!id /*or your own check*/)
  //         // quit early. If it has LightRoute.onError -> goes to it, if no -> extendApp().onError. If NOTHING is specified - crashes your server
  //         badRequest(
  //           res,
  //           "Id is wrong. " + id + " is not what we need" /*or whatever */,
  //           "stop this request"
  //         );

  //       return id;
  //     },
  //     async handler(res, /*async == no request. use data*/ _, data) {
  //       logger.group("/users/:id"); // colorful
  //       // something async
  //       await new Promise((resolve) => setTimeout(resolve, 1000));
  //       if (!res.aborted)
  //         res.cork(() =>
  //           //cork === speed
  //           res.end(toAB("Your id is " + data.meta /*or whatever */))
  //         );
  //       logger.groupEnd();
  //     },
  //     staticHeaders: new HeadersMap({
  //       "Referrer-Policy": "no-referrer",
  //     }).prepare(), // will go to response AS SOON as request starts
  //   }),
  //   post: new HeavyRoute({
  //     schemas: {
  //       meta: Type.Object({
  //         // Content-Length
  //         CL: Type.Number({ maximum: 200 }),
  //         // Content-Type
  //         CT: Type.String({ pattern: "application/json" }),
  //         id: Type.Number({ maximum: 10 }),
  //       }),
  //       body: Type.Object({
  //         field: Type.String(),
  //       }),
  //     },
  //     getMeta(res, req) {
  //       return {
  //         // checks, if it isn't a number or if it is 0 (there are strangers in Web)
  //         CL: checkContentLength(res, req),
  //         // lowercase, don't forget
  //         CT: req.getHeader("content-type"),
  //         id: Number(req.getParameter(0)),
  //       };
  //     },
  //     async parseBody(
  //       res,
  //       /*first await === no request. Use meta*/ _,
  //       /*if it is just for validation - you may skip it*/ __
  //     ) {
  //       var body = await parseSimpleBody({
  //         res,
  //         CT: /*Too long to specify. If you are sure about CT -> use "application/json or whatever*/ "application/json",
  //         limit: /*if content-length lies*/ 200,
  //       });
  //       if (res.aborted) throw new Error("forget about it");
  //       if (!body.ok)
  //         return badRequest(res, "Body didn't parse", body.data.message) as any;
  //       // typescript made me do this
  //       else return body.data;
  //     },
  //     handler(res, _, data) {
  //       logger.group("/users/:id post");
  //       logger.log("got data", data); //I'll repeat: "or whatever"
  //       res.cork(() => res.writeStatus(toAB("200")).end(toAB("thanks")));
  //       logger.groupEnd();
  //     },
  //     onError(err, res /*data*/) {
  //       if (!res.aborted) res.close();
  //       logger.error("error", err);
  //       //doSomethingToLastData(data)
  //     },
  //     // just for debugging (so far)
  //     onAbort() {
  //       logger.warn("/users/:id aborted");
  //     },
  //   }),
  // },
  "/post": {
    post: new HeavyRoute({
      // staticHeaders: HeadersMap.default,
      schemas: {
        meta: Type.Object({ CT: Type.String() }),
        body: Type.Not(Type.Object({ message: Type.Any() })),
      },
      getMeta(_, req) {
        logger.log("CL", req.getHeader("content-length"));
        return { CT: req.getHeader("content-type") };
      },
      async parseBody(res, __, { CT }) {
        logger.group("Parse body");
        const body = await parseFormDataBody({
          CT,
          res,
          save: "memory",
          tempPath: "./uploads/",
          limits: { files: 19, fields: 10 },
        });
        logger.groupEnd();
        return body;
      },
      handler(res, _, data) {
        logger.info("GOT BODY", data);
        if (!res.aborted) res.cork(() => res.end(toAB("HI")));
      },
      onAbort() {},
      onError(_, res) {
        logger.error("CAUGHT AN ERROR IN OUTER BLOCK", _);
        if (!res.aborted) res.end(toAB("Error"));
      },
    }),
  },
  "/styles.css": {
    get(res) {
      sendFile({
        res,
        contentType: "text/css",
        path: "./tests/public/styles.css",
        totalSize: Infinity,
      });
    },
  },
  "/text.txt": {
    get(res) {
      sendFile({
        res,
        contentType: "text/plain",
        path: "./text.txt",
        totalSize: Infinity,
      });
    },
  },
});
export default definePlugin(
  (server) =>
    router
      .bind(server)
      .route("/", "get")
      // .route("/users/:id", "get", "post")
      .route("/styles.css", "get")
      .route("/text.txt", "get")
      // .route("/hi", "get")
      .route("/post", "post") // duplicate methods are checked and "any" methods are registered automatically (if you don't register one yourself)
);
