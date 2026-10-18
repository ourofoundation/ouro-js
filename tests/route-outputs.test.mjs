import assert from "node:assert/strict";
import test from "node:test";

import {
  RouteOutputAssetsSchema,
  describeRouteOutputWhen,
  resolveRouteOutputs,
  routeOutputWhenMatches,
  validateRouteOutputs,
  validateRouteWhen,
} from "../dist/index.js";

// Shapes as FastAPI/Pydantic emits them.
const requestBody = {
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          composition: { type: "string" },
          include_dataset: { type: "boolean", default: false },
          include_report: { type: "boolean", default: false },
          mode: { type: "string", enum: ["single", "batch", "both"], default: "single" },
          trajectory: {
            anyOf: [{ type: "string", enum: ["none", "full"] }, { type: "null" }],
          },
          steps: { type: "integer", default: 10 },
        },
      },
    },
  },
};

const outputs = {
  structure: { asset_type: "file", primary: true },
  phases_dataset: { asset_type: "dataset", when: { include_dataset: true } },
  report: { asset_type: "post", when: { include_report: true } },
  summary: { asset_type: "file", embedded_in: "report" },
  best: { asset_type: "file", optional: true, embedded_in: "report" },
  cifs_zip: { asset_type: "file", when: { mode: ["batch", "both"] } },
  traj: { asset_type: "file", when: { trajectory: "full" } },
};

test("valid when conditions pass validation", () => {
  assert.deepEqual(validateRouteOutputs(outputs, requestBody), []);
  assert.equal(RouteOutputAssetsSchema.safeParse(outputs).success, true);
});

test("validation names unknown fields and values that don't fit", () => {
  const errors = validateRouteOutputs(
    {
      a: { asset_type: "file", when: { include_datasets: true } },
      b: { asset_type: "file", when: { include_dataset: "yes" } },
      c: { asset_type: "file", when: { mode: ["batch", "many"] } },
      d: { asset_type: "file", when: { trajectory: "partial" } },
      e: { asset_type: "file", when: {} },
      f: { asset_type: "file", when: { steps: 2.5 } },
      g: { asset_type: "file", when: { mode: [] } },
    },
    requestBody
  );
  assert.equal(errors.length, 7);
  assert.match(errors[0], /"include_datasets" is not a request body property/);
  assert.match(errors[1], /"yes".*allowed: boolean/);
  assert.match(errors[2], /"many".*allowed: "single" \| "batch" \| "both"/);
  assert.match(errors[3], /"partial".*allowed: "none" \| "full"/);
  assert.match(errors[4], /must be an object/);
  assert.match(errors[5], /2\.5.*allowed: integer/);
  assert.match(errors[6], /non-empty list/);
});

test("when without an inspectable JSON body is an error", () => {
  const errors = validateRouteOutputs(
    { a: { asset_type: "file", when: { x: true } } },
    null
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /needs a JSON request body/);
});

test("a single when reports problems without a label", () => {
  assert.deepEqual(validateRouteWhen({ include_dataset: true }, requestBody), []);
  assert.deepEqual(validateRouteWhen({ nope: 1 }, requestBody), [
    'field "nope" is not a request body property (available: composition, include_dataset, include_report, mode, trajectory, steps)',
  ]);
  assert.deepEqual(validateRouteWhen({}, requestBody), [
    "must be an object of request fields",
  ]);
});

test("embedded_in must name an outer post output", () => {
  const errors = validateRouteOutputs(
    {
      report: { asset_type: "post" },
      inner: { asset_type: "post", embedded_in: "report" },
      ok: { asset_type: "file", embedded_in: "report" },
      self: { asset_type: "file", embedded_in: "self" },
      missing: { asset_type: "file", embedded_in: "nope" },
      file_parent: { asset_type: "file", embedded_in: "ok" },
      nested: { asset_type: "file", embedded_in: "inner" },
    },
    requestBody
  );
  assert.equal(errors.length, 4);
  assert.match(errors[0], /output "self": embedded_in must name another output/);
  assert.match(errors[1], /output "missing": embedded_in "nope" is not an output/);
  assert.match(errors[2], /output "file_parent": .* must be a post output, not file/);
  assert.match(errors[3], /output "nested": .* is itself embedded/);
});

test("matching reads the body, then the schema default", () => {
  assert.equal(routeOutputWhenMatches({ include_dataset: true }, {}, requestBody), false);
  assert.equal(
    routeOutputWhenMatches({ include_dataset: true }, { include_dataset: true }, requestBody),
    true
  );
  assert.equal(routeOutputWhenMatches({ mode: ["single"] }, {}, requestBody), true);
  // No body value and no default: off.
  assert.equal(routeOutputWhenMatches({ trajectory: "full" }, {}, requestBody), false);
  // Numbers typed into a form arrive as strings.
  assert.equal(routeOutputWhenMatches({ steps: 10 }, { steps: "10" }, requestBody), true);
  // Every field must match.
  assert.equal(
    routeOutputWhenMatches(
      { include_dataset: true, include_report: true },
      { include_dataset: true },
      requestBody
    ),
    false
  );
  assert.equal(routeOutputWhenMatches(null, {}, requestBody), true);
});

test("resolveRouteOutputs marks active and embedded outputs", () => {
  const byName = (body) =>
    Object.fromEntries(
      resolveRouteOutputs(outputs, requestBody, body).map((o) => [o.name, o])
    );

  const off = byName({});
  assert.equal(off.structure.active, true);
  assert.equal(off.phases_dataset.active, false);
  assert.equal(off.report.active, false);
  assert.equal(off.summary.active, true);
  assert.equal(off.summary.embedded, false);
  assert.equal(off.best.optional, true);
  assert.equal(off.cifs_zip.active, false);

  const on = byName({ include_report: true, include_dataset: true, mode: "both" });
  assert.equal(on.report.active, true);
  assert.equal(on.summary.embedded, true);
  assert.equal(on.best.embedded, true);
  assert.equal(on.phases_dataset.active, true);
  assert.equal(on.cifs_zip.active, true);
});

test("describeRouteOutputWhen reads naturally", () => {
  assert.equal(describeRouteOutputWhen({ include_dataset: true }), "include_dataset is true");
  assert.equal(
    describeRouteOutputWhen({ mode: ["batch", "both"], include_report: true }),
    "mode is batch or both and include_report is true"
  );
  assert.equal(describeRouteOutputWhen(null), null);
});
