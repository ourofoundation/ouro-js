import assert from "node:assert/strict";
import test from "node:test";

import {
  getExtensionFromFileName,
  getFileClassification,
  getFileTypeName,
} from "../dist/index.js";

test("Ouro-specific formats get a readable name", () => {
  assert.equal(getFileTypeName("phasediagram"), "phase diagram");
  assert.equal(getFileTypeName(".PhaseDiagram"), "phase diagram");
  assert.equal(getFileTypeName("json"), null);
  assert.equal(
    getFileClassification("application/json", "phasediagram"),
    "phase diagram"
  );
  assert.equal(
    getFileClassification("application/json", "bandstructure"),
    "band structure"
  );
  assert.equal(
    getFileClassification("application/json", "dos"),
    "density of states"
  );
});

test("long Ouro extensions survive normalization", () => {
  assert.equal(getExtensionFromFileName("Si.bandstructure"), "bandstructure");
  assert.equal(getExtensionFromFileName("notes.thisisnotanextension"), null);
});

test("other files keep their MIME category or extension", () => {
  assert.equal(getFileClassification("image/png", "png"), "image");
  assert.equal(getFileClassification("application/json", "json"), ".json");
});
