import assert from "node:assert/strict";
import test from "node:test";

import { getFileClassification, getFileTypeName } from "../dist/index.js";

test("Ouro-specific formats get a readable name", () => {
  assert.equal(getFileTypeName("phasediagram"), "phase diagram");
  assert.equal(getFileTypeName(".PhaseDiagram"), "phase diagram");
  assert.equal(getFileTypeName("json"), null);
  assert.equal(
    getFileClassification("application/json", "phasediagram"),
    "phase diagram"
  );
});

test("other files keep their MIME category or extension", () => {
  assert.equal(getFileClassification("image/png", "png"), "image");
  assert.equal(getFileClassification("application/json", "json"), ".json");
});
