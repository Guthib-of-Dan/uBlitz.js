import { DeclarativeResponse, definePlugin } from "../src/js/index.mjs";
import { notFoundConstructor } from "../src/js/http-codes.mjs";
import { Router } from "../src/js/router.mjs";
var baseRouter = new Router({
  "/*": {
    any: notFoundConstructor("Mr. Someone. You've mistaken the link"),
  },
  "/": {
    get: new DeclarativeResponse()
      .writeHeaders({ "Content-Type": "text/plain", Allow: "GET" })
      .end("HELLO"),
  },
});

export default definePlugin((server: any) => {
  baseRouter
    .bind(server)
    .prefix("/main")
    .define("/", "get")
    .prefix(undefined)
    .define("/*", "any");
});
