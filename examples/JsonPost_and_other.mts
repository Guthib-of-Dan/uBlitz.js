import uWS from "uWebSockets.js";
import { Type } from "@sinclair/typebox";
import {
  logger,
  Router,
  HeavyMethod,
  toAB,
  extendApp,
  registerAbort,
  HeadersMap,
  type lowHeaders,
  checkContentLength,
  parseSimpleBody,
  parseFormDataBody,
} from /*if you don't care about bundle size*/ "ublitz.js/all";
const app = extendApp(uWS.App());
const router = new Router({
  "/json": {
    /**
     * Class controller for handling requests with body.
     * Lifecycle:
     * registerAbort(res)
     * -> getMeta
     * -> validate meta (if bad - throw error + 404 code)
     * -> await parseBody
     * -> validate body (if bad - throw error + 404 code)
     * -> handler
     * IF ERRORED : 1) this.onError OR 2) global app.onError OR 3) empty catch block
     */
    post: new HeavyMethod({
      schemas: {
        //obvious validation
        meta: Type.Object({
          "Content-Type": Type.String({ pattern: "application/json" }),
          "Content-Length": Type.Integer({ minimum: 10, maximum: 50 }),
        }),
        // some randomly created body
        body: Type.Object({
          id: Type.Integer(),
          date: Type.String(),
        }),
      },
      shared: {
        headers: new HeadersMap({
          // contains same headers, as "helmet" (but all are very strict)
          ...HeadersMap.baseObj,
          "Content-Type": "application/json",
        }).prepare(),

        // convert reply to an ArrayBuffer for speed boost
        reply: toAB(
          JSON.stringify({ ok: true, message: "thanks for request" })
        ),
      },
      getMeta(res, req) {
        return {
          /** this utility checks if content-length is passed. If not - http 411 + throw error*/
          "Content-Length": checkContentLength(res, req),
          // Optional typing for getHeader (takes lowercased headers of HeadersMap)
          "Content-Type": req.getHeader<lowHeaders>("content-type"),
        };
      },
      async parseBody(res /*req, meta*/) {
        /**special utility for this. */
        const body = await parseSimpleBody({ res, CT: "application/json" });

        /** body looks like {ok:boolean, data: Error | any} */
        if (!body.ok) throw new Error("BAD JSON BODY", { cause: body.data });

        /**quit early */
        if (res.aborted) throw new Error("ABORTED");

        /*You can use "as any" - you have validation.*/
        return body.data as any;
      },
      handler(
        res,
        /*if it wan't async handler, then you would be able to use "req"*/ _,
        data
      ) {
        // set headers manually AFTER validation. (res.writeHeader before res.writeStatus is buggy. Never do so.)
        this.shared!.headers(res);
        // data looks like defined in this.schemas
        // { meta:{"Content-Length", "Content-Type"}, body:{id, date} }
        logger.log("that's accumulated data", data);
        /**
         * DO
         * SOMETHING
         * TO
         * BODY
         */
        // efficiently send converted body
        res.cork(() => res.end(this.shared!.reply));
      },
    }),
  },
  //an example to show you, how it would look with functional controller
  "/raw": {
    async post(res, req) {
      registerAbort(res);
      try {
        if (checkContentLength(res, req) > 100)
          res.writeStatus("400").end("Bad request or too large body");
      } catch {
        return;
      }
      const body = await parseSimpleBody({ res, CT: undefined });
      if (res.aborted || res.finished) return;
      if (!body.ok) return res.writeStatus("500").end("Server Error");
      logger.log("BUFFER", body.data);
      res.end("Thanks");
      return;
    },
  },
  "/multipart": {
    post: new HeavyMethod({
      shared: undefined,
      schemas: {
        meta: Type.Object({
          "Content-Type": Type.String(),
          "Content-Length": Type.Integer({ maximum: 1000 }),
        }),
        body: Type.Object({
          fields: Type.Object({
            f1: Type.String(),
          }),
          files: Type.Object({
            f1: Type.Object(
              {
                //   encoding: Type.String(),
                //   filename: Type.String(),
                //   mimeType: Type.String(),
                //   path: Type.String(),
              } /*} satisfies FileSchema<FilesOnDisk>),*/
            ),
          }),
        }),
      },
      getMeta(res, req) {
        return {
          /** this utility checks if content-length is passed. If not - http 411 + throw error*/
          "Content-Length": checkContentLength(res, req),
          "Content-Type": req.getHeader("content-type"),
        };
      },
      async parseBody(res, /*req*/ _, meta) {
        const body = await parseFormDataBody({
          res,
          CT: meta["Content-Type"],
          // can be "memory"
          save: "disk",
          // make sure it exists before request starts
          outDir: "./uploads",
        });
        if (res.aborted) throw new Error("ABORTED");
        //if request wasn't aborted bad was malformed - you NEED to end or close the response -> go to error handler
        if (!body.ok) throw new Error("BAD REQUEST");
        logger.log("GOT FILES", body.data);
        return body.data as any;
      },
      handler(res) {
        res.cork(() => res.end("THANKS"));
      },
    }),
  },
});

router
  .bind(app)
  .prefix("/uploads")
  .define("/json", "post")
  .define("/raw", "post")
  .define("/multipart", "post");

app
  .onError((error, res) => {
    logger.error("ERROR", error);
    if (!res.aborted && !res.finished) res.close();
  })
  .listen("localhost", 9001, (token) => {
    if (!token) logger.error("NOT LISTENING");
    else logger.info("LISTENING ON PORT 9001");
  });
