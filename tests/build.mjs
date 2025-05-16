import esbuild from "esbuild";
/**
 * @type {esbuild.BuildOptions}
 */
const baseBundleOptions = {
  outfile: "tests/compiled.mjs",
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
/**
 *
 * @returns {Promise<"OK" | Error>}
 */
export default async function () {
  var fs = await import("node:fs/promises");
  var result;
  try {
    await esbuild.build({
      ...baseBundleOptions,
      entryPoints: ["tests/app.mts"],
    });
    return "OK";
  } catch (error) {
    return error;
  }
}
