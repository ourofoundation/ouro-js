import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSET_LINEAGE_ROLES,
  RouteOutputAssetsSchema,
  isAssetLineageRole,
  resolveRouteOutputRole,
  resolveRouteOutputs,
  validateRouteOutputs,
} from "../dist/index.js";

test("an output without a source is new, whatever it declares", () => {
  assert.deepEqual(
    resolveRouteOutputRole({ declared: "version", primary: true, hasInput: false }),
    { role: "new", source: null }
  );
});

test("undeclared outputs take their role from where they land", () => {
  assert.deepEqual(resolveRouteOutputRole({ hasInput: true, primary: true }), {
    role: "result",
    source: "input",
  });
  assert.deepEqual(resolveRouteOutputRole({ hasInput: false, primary: false }), {
    role: "result",
    source: "primary_output",
  });
  assert.deepEqual(resolveRouteOutputRole({ hasInput: true, embedded: true }), {
    role: "supporting",
    source: "embedding_post",
  });
});

test("a declared role wins once there is a source", () => {
  assert.deepEqual(
    resolveRouteOutputRole({ declared: "version", hasInput: true, primary: true }),
    { role: "version", source: "input" }
  );
  assert.deepEqual(
    resolveRouteOutputRole({ declared: "bogus", hasInput: true }),
    { role: "result", source: "input" }
  );
});

test("role is validated and resolved on declarations", () => {
  const outputs = {
    cif: { asset_type: "file", primary: true, role: "version" },
    traj: { asset_type: "file", role: "supporting" },
    other: { asset_type: "file" },
  };
  assert.deepEqual(validateRouteOutputs(outputs, null), []);
  assert.deepEqual(
    resolveRouteOutputs(outputs, null, undefined).map((o) => o.role),
    ["version", "supporting", null]
  );
  assert.match(
    validateRouteOutputs({ x: { asset_type: "file", role: "derived" } }, null)[0],
    /output "x": role must be one of new, version, result, supporting/
  );
  assert.equal(RouteOutputAssetsSchema.safeParse({ x: { asset_type: "file", role: "derived" } }).success, false);
  assert.equal(RouteOutputAssetsSchema.safeParse(outputs).success, true);
});

test("roles list", () => {
  assert.deepEqual([...ASSET_LINEAGE_ROLES], ["new", "version", "result", "supporting"]);
  assert.equal(isAssetLineageRole("result"), true);
  assert.equal(isAssetLineageRole("parent"), false);
});
