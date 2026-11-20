import assert from "node:assert/strict";
import test from "node:test";

import {
  checkEvaluatorDefinition,
  evaluateFormula,
  evaluatorContributorInputs,
  EvaluatorDefinitionSchema,
  formulaRoots,
  parseFormula,
  planEvaluation,
  readStepOutputAsset,
  singleRouteEvaluator,
  singleRouteEvaluatorFields,
} from "../dist/index.js";

const run = (source, scope = {}) => evaluateFormula(parseFormula(source), scope);

const R = (n) => `00000000-0000-4000-8000-00000000000${n}`;

// Hull, then phonons, then DFT only for cells that pass the cheap gates
const MAGNET = {
  steps: {
    hull: { route_id: R(1), inputs: { structure: "inputs.structure" }, body: { allow_unrelaxed: true } },
    phonons: { route_id: R(2), inputs: { file: "hull.relaxed_cif" } },
    price: { route_id: R(3), inputs: { file: "inputs.structure" } },
    mae: { route_id: R(4), inputs: { structure: "hull.relaxed_cif" }, after: ["stable", "dynamically_stable"] },
  },
  gates: {
    stable: "hull.e_above_hull <= 0.075",
    dynamically_stable: "phonons.stable",
    uniaxial: 'mae.easy_axis == "c" and not mae.smearing_check.sensitive',
  },
  categories: {
    anisotropy: "min(mae.k1 / 1.0, 1)",
    cost: "clamp(1 - price.usd_per_kg / 20, 0, 1)",
  },
  score: "100 * (0.7 * anisotropy + 0.3 * cost)",
  pass: { min: 50 },
};

test("formulas: arithmetic, precedence and functions", () => {
  assert.equal(run("1 + 2 * 3"), 7);
  assert.equal(run("(1 + 2) * 3"), 9);
  assert.equal(run("-2 ^ 2"), -4);
  assert.equal(run("2 ^ 3 ^ 2"), 512);
  assert.equal(run("2 ^ -1"), 0.5);
  assert.equal(run("10 % 4"), 2);
  assert.equal(run("min(3, 1, 2) + max(1, 5)"), 6);
  assert.equal(run("clamp(1.4, 0, 1)"), 1);
  assert.equal(run("round(2.345, 2)"), 2.35);
  assert.equal(run("1e3 + .5"), 1000.5);
  assert.equal(run("a.b[1].c", { a: { b: [{}, { c: 4 }] } }), 4);
  assert.equal(run('a["some-key"]', { a: { "some-key": 2 } }), 2);
  assert.equal(run('"3.5" * 2'), 7);
});

test("formulas: missing values are null and carry through", () => {
  assert.equal(run("a.b + 1", { a: {} }), null);
  assert.equal(run("missing > 1"), null);
  assert.equal(run("1 / 0"), null);
  assert.equal(run("sqrt(-1)"), null);
  assert.equal(run("coalesce(a.b, 2) + 1", { a: {} }), 3);
  assert.equal(run("a.b == null", { a: {} }), true);
  assert.equal(run("a.__proto__", { a: {} }), null);
  assert.equal(run("a.constructor", { a: {} }), null);
  assert.equal(run("true * 2"), null);
});

test("formulas: logic is three-valued", () => {
  assert.equal(run("false and missing"), false);
  assert.equal(run("true and missing"), null);
  assert.equal(run("true or missing"), true);
  assert.equal(run("false or missing"), null);
  assert.equal(run("not missing"), null);
  assert.equal(run("!false && 2 > 1 || false"), true);
  assert.equal(run("x > 1 ? 10 : 20", { x: 2 }), 10);
  assert.equal(run("if(x > 1, 10, 20)", { x: 0 }), 20);
  assert.equal(run("missing ? 1 : 2"), null);
  assert.equal(run('axis == "c"', { axis: "c" }), true);
});

test("formulas: errors are written for the author", () => {
  assert.throws(() => parseFormula(""), /empty/);
  assert.throws(() => parseFormula("1 +"), /end of the formula/);
  assert.throws(() => parseFormula("foo(1)"), /Unknown function "foo"/);
  assert.throws(() => parseFormula("clamp(1, 2)"), /takes 3 arguments, got 2/);
  assert.throws(() => parseFormula("a.b; drop"), /Unexpected character/);
  assert.throws(() => parseFormula("a = 1"), /Unexpected character/);
  assert.throws(() => parseFormula("x".repeat(2001)), /longer than/);
  assert.deepEqual(formulaRoots(parseFormula("a.b + min(c, d.e) > f ? g : 1")).sort(), ["a", "c", "d", "f", "g"]);
});

test("definitions: a sound one has no problems", () => {
  assert.deepEqual(checkEvaluatorDefinition(MAGNET), []);
  assert.equal(EvaluatorDefinitionSchema.safeParse(MAGNET).success, true);
  assert.deepEqual(Object.keys(evaluatorContributorInputs(MAGNET)), ["structure"]);
  assert.equal(evaluatorContributorInputs(MAGNET).structure.length, 2);
});

test("definitions: problems name the step, gate or formula", () => {
  const problems = (patch) => checkEvaluatorDefinition({ ...MAGNET, ...patch });
  assert.match(problems({ score: "nope.x" })[0], /score reads "nope", which is not a step, gate or category/);
  assert.match(problems({ gates: { ...MAGNET.gates, bad: "anisotropy > 1" } })[0], /Gate "bad" reads "anisotropy", which is not a step/);
  assert.match(problems({ score: "1 +" })[0], /^score: /);
  assert.match(problems({ pass: { min: 2, max: 1 } })[0], /pass\.min is greater/);
  assert.match(
    checkEvaluatorDefinition({ steps: { Hull: { route_id: R(1) } }, score: "1" })[0],
    /must start with a lowercase letter/
  );
  assert.match(
    checkEvaluatorDefinition({ steps: { min: { route_id: R(1) } }, score: "1" })[0],
    /"min" is reserved/
  );
  assert.match(
    checkEvaluatorDefinition({
      steps: { a: { route_id: R(1), inputs: { x: "b.file" } }, b: { route_id: R(2), inputs: { x: "a.file" } } },
      score: "a.v",
    })[0],
    /wait on each other in a loop: a → b → a/
  );
  // mae waits on a gate that reads mae
  assert.match(
    checkEvaluatorDefinition({
      steps: { mae: { route_id: R(1), after: ["ok"] } },
      gates: { ok: "mae.k1 > 0" },
      score: "mae.k1",
    })[0],
    /loop/
  );
  assert.match(
    checkEvaluatorDefinition({ steps: { a: { route_id: R(1), inputs: { x: "ghost.file" } } }, score: "a.v" })[0],
    /reads "ghost", which is not a step/
  );
  assert.match(
    checkEvaluatorDefinition({ steps: { a: { route_id: R(1), after: ["nope"] } }, score: "a.v" })[0],
    /waits on "nope", which is not a gate/
  );
  assert.match(
    checkEvaluatorDefinition({
      steps: { a: { route_id: R(1), idempotent: true, inputs: { x: "inputs.s", y: "inputs.t" } } },
      score: "a.v",
    })[0],
    /idempotent step reads exactly one input/
  );
  assert.match(
    checkEvaluatorDefinition({ steps: { a: { route_id: R(1), idempotent: "yes" } }, score: "a.v" })[0],
    /idempotent must be true or false/
  );
});

test("definitions: an idempotent step keeps its flag through the schema", () => {
  const relax = { route_id: R(1), inputs: { file: "inputs.structure" }, idempotent: true };
  const parsed = EvaluatorDefinitionSchema.parse({ steps: { relax }, score: "relax.energy" });
  assert.equal(parsed.steps.relax.idempotent, true);
});

const states = (overrides) => ({
  hull: { status: "pending" },
  phonons: { status: "pending" },
  price: { status: "pending" },
  mae: { status: "pending" },
  ...overrides,
});

test("plans: independent steps start together, gated ones wait", () => {
  const first = planEvaluation(MAGNET, states({}));
  assert.deepEqual(first.start.sort(), ["hull", "price"]);
  assert.equal(first.result, null);

  const second = planEvaluation(
    MAGNET,
    states({
      hull: { status: "success", response: { e_above_hull: 0.02, relaxed_cif: { id: "f1", asset_type: "file" } } },
      price: { status: "running" },
    })
  );
  assert.deepEqual(second.start, ["phonons"]);
  assert.equal(second.gates.stable, true);
  assert.equal(second.gates.dynamically_stable, null);

  const third = planEvaluation(
    MAGNET,
    states({
      hull: { status: "success", response: { e_above_hull: 0.02 } },
      phonons: { status: "success", response: { stable: true } },
      price: { status: "success", response: { usd_per_kg: 5 } },
    })
  );
  assert.deepEqual(third.start, ["mae"]);
});

test("plans: a failed gate skips what hasn't started and fails the run", () => {
  const plan = planEvaluation(
    MAGNET,
    states({
      hull: { status: "success", response: { e_above_hull: 0.2 } },
      price: { status: "running" },
    })
  );
  assert.deepEqual(plan.start, []);
  assert.deepEqual(Object.keys(plan.skip).sort(), ["mae", "phonons"]);
  assert.match(plan.skip.mae, /Gate "stable" did not pass/);
  assert.equal(plan.result, null); // price is still running

  const done = planEvaluation(
    MAGNET,
    states({
      hull: { status: "success", response: { e_above_hull: 0.2 } },
      price: { status: "success", response: { usd_per_kg: 5 } },
      phonons: { status: "skipped" },
      mae: { status: "skipped" },
    })
  );
  assert.equal(done.result.status, "completed");
  assert.equal(done.result.passed, false);
  assert.equal(done.result.score, null);
  assert.deepEqual(done.result.gates, { stable: false, dynamically_stable: null, uniaxial: null });
  assert.deepEqual(done.result.categories, { cost: 0.75 });
});

test("plans: a finished run has a score, categories and a verdict", () => {
  const all = (mae) =>
    planEvaluation(MAGNET, {
      hull: { status: "success", response: { e_above_hull: 0.02 } },
      phonons: { status: "success", response: { stable: true } },
      price: { status: "success", response: { usd_per_kg: 5 } },
      mae: { status: "success", response: mae },
    });
  const good = all({ k1: 1.6, easy_axis: "c", smearing_check: { sensitive: false } }).result;
  assert.equal(good.status, "completed");
  assert.equal(good.score, 92.5);
  assert.equal(good.passed, true);
  assert.deepEqual(good.categories, { anisotropy: 1, cost: 0.75 });

  const plane = all({ k1: 1.6, easy_axis: "ab", smearing_check: { sensitive: false } }).result;
  assert.equal(plane.passed, false);
  assert.equal(plane.gates.uniaxial, false);
  assert.equal(plane.score, 92.5);

  const low = all({ k1: 0.1, easy_axis: "c", smearing_check: { sensitive: false } }).result;
  assert.equal(low.passed, false); // 29.5, under pass.min

  const unreadable = all({ easy_axis: "c", smearing_check: { sensitive: false } }).result;
  assert.equal(unreadable.status, "errored");
  assert.match(unreadable.error, /did not produce a number/);
});

test("plans: a failed step errors the run", () => {
  const plan = planEvaluation(MAGNET, states({ hull: { status: "error" }, price: { status: "success", response: {} } }));
  assert.deepEqual(Object.keys(plan.skip).sort(), ["mae", "phonons"]);
  const done = planEvaluation(MAGNET, {
    hull: { status: "error" },
    price: { status: "success", response: {} },
    phonons: { status: "skipped" },
    mae: { status: "skipped" },
  });
  assert.equal(done.result.status, "errored");
  assert.match(done.result.error, /Step "hull" failed/);
});

test("one-route form round-trips", () => {
  const fields = {
    eval_route_id: R(1),
    eval_score_path: "$.metrics.sun-rate",
    eval_pass_min: 0.5,
    eval_static_inputs: { reference: { asset_id: R(9), asset_type: "dataset" } },
  };
  const definition = singleRouteEvaluator(fields, ["model"]);
  assert.deepEqual(definition, {
    steps: {
      eval: {
        route_id: R(1),
        inputs: { reference: { asset_id: R(9), asset_type: "dataset" }, model: "inputs.model" },
      },
    },
    categories: "eval.categories",
    score: 'eval.metrics["sun-rate"]',
    pass: { min: 0.5 },
  });
  assert.deepEqual(checkEvaluatorDefinition(definition), []);
  assert.deepEqual(singleRouteEvaluatorFields(definition), {
    eval_route_id: R(1),
    eval_score_path: "$.metrics.sun-rate",
    eval_categories_path: "$.categories",
    eval_pass_min: 0.5,
    eval_pass_max: null,
    eval_static_inputs: { reference: { asset_id: R(9), asset_type: "dataset" } },
  });
  assert.equal(singleRouteEvaluatorFields(MAGNET), null);

  const plan = planEvaluation(singleRouteEvaluator({ eval_route_id: R(1) }, ["file"]), {
    eval: { status: "success", response: { score: "0.8", categories: [{ name: "a", score: 1 }] } },
  });
  assert.equal(plan.result.score, 0.8);
  assert.equal(plan.result.passed, true);
  assert.deepEqual(plan.result.categories, { a: 1 });
});

test("step outputs resolve to assets", () => {
  assert.deepEqual(readStepOutputAsset({ relaxed_cif: { id: "f1", asset_type: "file", name: "x" } }, ["relaxed_cif"]), {
    asset_id: "f1",
    asset_type: "file",
  });
  assert.equal(readStepOutputAsset({ relaxed_cif: "data_..." }, ["relaxed_cif"]), null);
  assert.equal(readStepOutputAsset({}, ["relaxed_cif"]), null);
});
