import { Type } from "@sinclair/typebox";
import {
  Router,
  definePlugin,
  toAB,
  LightRoute,
  HeadersMap,
  logger,
} from "../src/index.mts";
import { setTimeout } from "node:timers/promises";
const users = new Map<string, { seen: Date }>();
users.set("u1", { seen: new Date() });
users.set("u2", { seen: new Date("2000") });
var router = new Router({
  "/users/:id": {
    get: new LightRoute({
      shared: {
        headers: HeadersMap.default,
      },
      schemas: {
        meta: Type.Object({
          id: Type.String({ maxLength: 3 }),
        }),
      },
      // if something may be different you always use "as any" or "!", because for this exists validation.
      getMeta: (_, req) => ({ id: req.getParameter(0)! }),
      async handler(res, _, data) {
        this.shared!.headers.toRes(res);
        res.emitter.once("abort", () => {
          logger.warn(`/users/${data.meta.id} was aborted`);
        });
        await setTimeout(1000);
        if (!res.aborted)
          res.cork(() =>
            res.end(
              toAB(JSON.stringify(users.get(data.meta.id) || { seen: "never" }))
            )
          );
      },
    }),
  },
});
export default definePlugin((server) =>
  router.bind(server).route("/users/:id", "get")
);
