import esbuild from "esbuild";
import process from "node:process";
import { logger } from "../src/js/logger.mjs";
/**
 * @type {esbuild.BuildOptions}
 */
const baseBundleOptions = {
  outdir: "dist",
  platform: "node",
  bundle: true,
  external: ["uWebSockets.js", "busboy"],
  target: "node22",
  minify: true,
  format: "esm",
  alias: {
    stream: "node:stream",
    fs: "node:fs",
    crypto: "node:crypto",
    util: "node:util",
    process: "node:process",
    buffer: "node:buffer",
    events: "tseep",
    "node:events": "tseep",
    timers: "node:timers",
  },
  charset: "utf8",
  ignoreAnnotations: false,
  resolveExtensions: [".mts", ".ts", ".js", ".mjs", ".cts", ".cjs"],
  tsconfig: "tsconfig.json",
};
async function compileExamplesToDist() {
  var fs = await import("node:fs/promises");
  esbuild
    .build({
      ...baseBundleOptions,
      // use any file here
      entryPoints: ["examples/VideoStreamer.mts"],
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
}

// compileExamplesToDist();
