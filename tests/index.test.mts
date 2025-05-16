import { describe, it, expect } from "vitest";
import build from "./build.mjs";
import { us_listen_socket_close, type us_listen_socket } from "uWebSockets.js";
var listen_socket: us_listen_socket;
var link = "http://localhost:9001/";
var testRequest = () => {
  it("sends 404 code on undefined route", async () => {
    const res = await fetch(link + "");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Mr. Someone. You've mistaken the link");
  });
  it("supports DeclarativeResponse", async () => {
    const res = await fetch(link + "main/");
    const headers = {
      CT: res.headers.get("content-type"),
      Allow: res.headers.get("allow"),
    };
    expect(headers.Allow).toBe("GET");
    expect(headers.CT).toBe("text/plain");
    expect(await res.text()).toBe("HELLO");
  });
};
describe(
  "My package",
  { skip: false, retry: 0, repeats: 0, sequential: true },
  () => {
    it("builds with esbuild", async () => expect(await build()).toBe("OK"));
    it("starts successfully", async () => {
      const start = (await import("./compiled.mjs")).default;
      expect(start).toBeTruthy();
      listen_socket = await start();
    });
    describe(
      "Router instance",
      {
        concurrent: true,
        sequential: false,
      },
      testRequest
    );

    it("shuts down", () =>
      expect(us_listen_socket_close(listen_socket)).toBe(undefined));
  }
);
