const esbuild = require("esbuild");
const { createServer, build } = require("vite");

const isBuildRelease = process.argv[process.argv.length - 1] === "release";
if (isBuildRelease) {
  console.log("Building release version");
}


esbuild.build({
  entryPoints: ["./src/main/main.ts"],
  bundle: true,
  outfile: "./dist/main/main.js",
  target: "node18",
  watch: !isBuildRelease,
  minify: true,
  define: {
    "import.meta.env.PROD": isBuildRelease ? "true" : "false",
  },
  external: [
    "electron",
    "better-sqlite3",
    "log4js",
    "path",
    "fs",
    "perf_hooks",
  ]
});

esbuild.build({
  entryPoints: ["./src/preload/preload.ts"],
  bundle: true,
  outfile: "./dist/preload/preload.js",
  target: "node18",
  watch: !isBuildRelease,
  minify: true,
  external: [
    "electron",
  ]
});

async function startServer() {
  const server = await createServer({
    configFile: './vite.config.ts',
  });
  await server.listen();
}

async function buildRelease() {
  await build({
    base: "",  // to make js use relative path
    configFile: './vite.config.ts',
  });
}

if (isBuildRelease) {
  buildRelease();
} else  {
  startServer();
}