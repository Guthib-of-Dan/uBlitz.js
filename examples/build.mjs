import esbuild from "esbuild";

async function compileExamplesToDist() {
  var fs = await import("node:fs/promises");
  esbuild
    .build({
      entryPoints: ["examples/index.mts"],
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
      },
      charset: "utf8",
      ignoreAnnotations: false,
      resolveExtensions: [".mts", ".ts", ".js", ".mjs", ".cts", ".cjs"],
      tsconfig: "tsconfig.json",
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
}
compileExamplesToDist();
