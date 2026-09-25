import assert from "node:assert/strict";
import test from "node:test";

import { CreateFileSchema, updateFileSchema } from "../dist/index.js";

const successMetadata = {
  id: "019b7d6d-2cc5-7df8-a575-91ecbfc72fc0",
  path: "user/results.zip",
  bucket: "public-files",
  name: "results.zip",
  type: "application/zip",
  extension: "zip",
  size: 1024,
};

test("CreateFileSchema defaults omitted state to success", () => {
  const file = CreateFileSchema.parse({
    name: "results.zip",
    asset_type: "file",
    metadata: successMetadata,
  });
  assert.equal(file.state, "success");
});

test("CreateFileSchema accepts in-progress stubs", () => {
  const file = CreateFileSchema.parse({
    name: "results.zip",
    asset_type: "file",
    state: "in-progress",
    metadata: { type: "application/zip" },
  });
  assert.equal(file.state, "in-progress");
});

test("ZIP preview rows and archive metadata parse together", () => {
  const file = CreateFileSchema.parse({
    name: "results.zip",
    asset_type: "file",
    state: "success",
    metadata: {
      id: "019b7d6d-2cc5-7df8-a575-91ecbfc72fc0",
      path: "user/results.zip",
      bucket: "public-files",
      name: "results.zip",
      type: "application/zip",
      extension: "zip",
      size: 1024,
      archive: {
        entry_count: 1,
        file_count: 1,
        directory_count: 0,
        total_uncompressed_size: 20,
        total_compressed_size: 12,
        preview_truncated: false,
      },
    },
    preview: [
      {
        path: "data.csv",
        name: "data.csv",
        type: "text/csv",
        size: 20,
        compressed_size: 12,
        is_directory: false,
      },
    ],
  });

  assert.equal(file.metadata.archive.entry_count, 1);
  assert.equal(file.preview[0].name, "data.csv");
});

test("updateFileSchema keeps structure summaries, including unparseable ones", () => {
  const structure = {
    formula: "Fe8Si5W3",
    elements: ["Fe", "Si", "W"],
    num_atoms: 16,
    space_group: { symbol: "P4/mmm", number: 123 },
    crystal_system: "tetragonal",
    lattice: { a: 5.4889, b: 5.4889, c: 6.1547, alpha: 90, beta: 90, gamma: 90 },
    volume: 185.426,
    density: 10.197,
  };
  const cif = { ...successMetadata, name: "x.cif", type: "chemical/x-cif", extension: "cif" };

  const parsed = updateFileSchema.parse({ metadata: { ...cif, structure } });
  assert.deepEqual(parsed.metadata.structure, structure);

  const failed = updateFileSchema.parse({ metadata: { ...cif, structure: null } });
  assert.equal(failed.metadata.structure, null);
});
