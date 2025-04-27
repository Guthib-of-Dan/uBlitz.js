import { Type, type Static } from "@sinclair/typebox";
import {
  badRequest,
  checkContentLength,
  definePlugin,
  HeadersMap,
  logger,
  sendFile,
  toAB,
  useBody,
} from "../src/index.mts";
import { HeavyRoute, LightRoute, Router } from "../src/router.mts"; // or "ublitz.js"
const router = new Router({
  "/": {
    // simple controller
    get(res) {
      HeadersMap.default.toRes(res);
      sendFile({
        res,
        path: "path according to working directory",
        contentType: "will be set to header (like text/html)",
        //total size === size, which will be sent in bytes. Infinity === as much, as file has.
        totalSize: Infinity,
      });
    },
    // not essentially (but possible) to use "any" route (only function. Not LightRoute or HeavyRoute. Has no error handling or abort controller). It is handled automatically and sends 405 status with "Allow" header, containing all method, use registered in router.route ("WS" method is removed from header and "DEL" is renamed to "DELETE")
  },
  "/users/:id": {
    get: new LightRoute({
      schemas: { meta: Type.Number({ maximum: 10 }) },
      getMeta(res, req) {
        const id = Number(req.getParameter("id")) satisfies Static<
          typeof this.schemas.meta
        >;
        if (!id /*or your own check*/)
          // quit early. If it has LightRoute.onError -> goes to it, if no -> extendApp().onError. If NOTHING is specified - crashes your server
          badRequest(
            res,
            "Id is wrong. " + id + " is not what we need" /*or whatever */,
            "stop this request"
          );

        return id;
      },
      async handler(res, /*async == no request. use data*/ _, data) {
        logger.group("/users/:id"); // colorful
        // something async
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!res.aborted)
          res.cork(() =>
            //cork === speed
            res.end(toAB("Your id is " + data.meta /*or whatever */))
          );
        logger.groupEnd();
      },
      staticHeaders: new HeadersMap({
        "Referrer-Policy": "no-referrer",
      }).prepare(), // will go to response AS SOON as request starts
    }),
    post: new HeavyRoute({
      schemas: {
        meta: Type.Object({
          // Content-Length
          CL: Type.Number({ maximum: 200 }),
          // Content-Type
          CT: Type.String({ pattern: "application/json" }),
          id: Type.Number({ maximum: 10 }),
        }),
        body: Type.Object({
          field: Type.String(),
        }),
      },
      getMeta(res, req) {
        return {
          // checks, if it isn't a number or if it is 0 (there are strangers in Web)
          CL: checkContentLength(res, req),
          // lowercase, don't forget
          CT: req.getHeader("content-type"),
          id: Number(req.getParameter(0)),
        };
      },
      async parseBody(
        res,
        /*first await === no request. Use meta*/ _,
        /*if it is just for validation - you may skip it*/ __
      ) {
        var body = await useBody<{ field: string }>({
          res,
          CT: /*Too long to specify. If you are sure about CT -> use "application/json or whatever*/ "application/json",
          limit: /*if content-length lies*/ 200,
        });
        if (res.aborted) throw new Error("forget about it");
        if (!body.ok)
          return badRequest(res, "Body didn't parse", body.data.message) as any;
        // typescript made me do this
        else return body.data;
      },
      handler(res, _, data) {
        logger.group("/users/:id post");
        logger.log("got data", data); //I'll repeat: "or whatever"
        res.cork(() => res.writeStatus(toAB("200")).end(toAB("thanks")));
        logger.groupEnd();
      },
      onError(err, res /*data*/) {
        if (!res.aborted) res.close();
        logger.error("error", err);
        //doSomethingToLastData(data)
      },
      // just for debugging (so far)
      onAbort() {
        logger.warn("/users/:id aborted");
      },
    }),
  },
});
export default definePlugin(
  (server) =>
    router.bind(server).route("/", "get").route("/users/:id", "get", "post") // duplicate methods are checked and "any" methods are registered automatically (if you don't register one yourself)
);
