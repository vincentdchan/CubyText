import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import svgrPlugin from "./plugins/vite-plugin-svgr";
import * as path from "path";

export const projectRootDir = process.cwd();

export const resolveByProjectRootDir = (...pathSegments: string[]) => {
  return path.resolve(projectRootDir, ...pathSegments);
};

export default defineConfig({
  server: {
    port: 8666,
    hmr: true,
  },
  resolve: {
    alias: {
      "@pkg": resolveByProjectRootDir("src"),
    },
  },
  plugins: [
    preact({
      exclude: [/blocky-core/, /node_modules/],
    }),
    svgrPlugin(),
  ],
  build: {
    target: "esnext",
    outDir: "dist/renderer",
    rollupOptions: {
      input: {
        index: "./index.html",
        welcome: "./welcome.html",
      },
    },
  },
  optimizeDeps: {
    exclude: ["blocky-common", "blocky-core", "blocky-preact"],
  },
});
