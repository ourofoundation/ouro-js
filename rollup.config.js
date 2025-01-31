const typescript = require("@rollup/plugin-typescript");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const terser = require("@rollup/plugin-terser");
const commonjs = require("@rollup/plugin-commonjs");

module.exports = {
  input: "src/index.ts",
  output: [
    {
      dir: "dist",
      format: "esm",
      entryFileNames: "[name].esm.js",
      preserveModules: true,
      preserveModulesRoot: "src",
      sourcemap: true,
    },
    {
      dir: "dist",
      format: "cjs",
      entryFileNames: "[name].js",
      preserveModules: true,
      preserveModulesRoot: "src",
      sourcemap: true,
    },
  ],
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    nodeResolve(),
    commonjs(),
    terser({
      format: {
        comments: false,
      },
      compress: {
        passes: 2,
      },
    }),
  ],
  external: [
    // Explicitly list all dependencies as external
    ...Object.keys(require("./package.json").dependencies || {}),
    ...Object.keys(require("./package.json").peerDependencies || {}),
    // /^zod/,
  ],
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
  },
};
