import { defineConfig } from "tsup";

export default defineConfig({
    entry: [
        "src/index.ts",
        "src/schema/*.ts",
        "src/utils/*.ts",
        "src/utils/air/*.ts",
    ],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    splitting: true,
    external: ["marked", "uuidv7", "zod"],
    outDir: "dist",
    minify: true,
    target: "es2019",
}); 