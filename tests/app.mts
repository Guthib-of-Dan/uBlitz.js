import uWS, { type us_listen_socket } from "uWebSockets.js";
import { extendApp } from "../src/js/index.mjs";
import router from "./router.mts";
var app = extendApp(uWS.App()).register(router);
export default () =>
  new Promise<Error | us_listen_socket>((resolve, reject) => {
    app.listen(9001, (token: any) => {
      if (token) resolve(token);
      else reject(new Error("Didn't start"));
    });
  });
