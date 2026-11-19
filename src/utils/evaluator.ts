// Evaluators: how a quest item scores an entry. An evaluator runs one or more
// existing routes as steps, feeds one step's outputs into the next, and turns
// the responses into gates (pass/fail conditions), categories and a score.
//
// This file is the pure part: checking a definition and deciding, from the
// state of its steps, what can start and what the result is. Running routes
// is the backend's job.

import {
  FORMULA_RESERVED_NAMES,
  FormulaError,
  evaluateFormula,
  formulaAsPath,
  formulaNumber,
  formulaRoots,
  parseFormula,
  pathToFormula,
  readFormulaPath,
  type FormulaNode,
} from "./formula";

/** A fixed asset the quest's author supplies to a step. */
export type EvaluatorAssetRef = { asset_id: string; asset_type: string };

/**
 * Where a step input comes from: `"inputs.<key>"` (an asset the contributor
 * submits), `"<step>.<path>"` (an asset an earlier step returned), or a fixed
 * asset.
 */
export type EvaluatorInputRef = string | EvaluatorAssetRef;

export type EvaluatorStep = {
  route_id: string;
  inputs?: Record<string, EvaluatorInputRef> | null;
  /** Fixed request parameters sent with the step's inputs. */
  body?: Record<string, unknown> | null;
  /** Gates that must pass before this step starts. */
  after?: string[] | null;
};

export type EvaluatorDefinition = {
  steps: Record<string, EvaluatorStep>;
  /** Conditions an entry must meet. A failed gate stops steps not yet started. */
  gates?: Record<string, string> | null;
  /** Named sub-scores, or one formula reading `{ name: score }` from a response. */
  categories?: Record<string, string> | string | null;
  score: string;
  /** Inclusive score band an entry must land in to pass. */
  pass?: { min?: number | null; max?: number | null } | null;
};

export type EvaluationStepStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

export type EvaluationStepState = {
  status: EvaluationStepStatus;
  /** The step route's JSON response, once it succeeded. */
  response?: unknown;
};

export type EvaluationResult = {
  status: "completed" | "errored";
  score: number | null;
  passed: boolean;
  /** true passed, false failed, null not decided (a step it reads didn't run). */
  gates: Record<string, boolean | null>;
  categories: Record<string, number> | null;
  error: string | null;
};

export type EvaluationPlan = {
  /** Steps whose inputs are ready and whose gates passed. */
  start: string[];
  /** Steps that will never run, with the reason. */
  skip: Record<string, string>;
  gates: Record<string, boolean | null>;
  /** Set once nothing is running and nothing is left to start. */
  result: EvaluationResult | null;
};

export const EVALUATOR_INPUTS_ROOT = "inputs";
export const EVALUATOR_MAX_STEPS = 24;
const NAME = /^[a-z][a-z0-9_]*$/;
const BLOCKED_CATEGORY_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAssetRef(value: unknown): value is EvaluatorAssetRef {
  return (
    isPlainObject(value) &&
    typeof value.asset_id === "string" &&
    typeof value.asset_type === "string"
  );
}

/** A step input reference, parsed: `{ root, path }`, or null for a fixed asset. */
export function parseEvaluatorInputRef(
  ref: EvaluatorInputRef
): { root: string; path: (string | number)[] } | null {
  if (typeof ref !== "string") return null;
  const path = formulaAsPath(parseFormula(ref));
  if (!path) {
    throw new FormulaError(
      `"${ref}" is not a reference. Use "inputs.<key>" or "<step>.<field>".`
    );
  }
  return { root: String(path[0]), path: path.slice(1) };
}

/** Steps whose output a step's inputs read. */
function stepInputSteps(step: EvaluatorStep): string[] {
  const steps = new Set<string>();
  for (const ref of Object.values(step.inputs ?? {})) {
    const parsed = parseEvaluatorInputRef(ref);
    if (parsed && parsed.root !== EVALUATOR_INPUTS_ROOT) steps.add(parsed.root);
  }
  return [...steps];
}

export function evaluatorRouteIds(definition: EvaluatorDefinition): string[] {
  return [
    ...new Set(Object.values(definition.steps ?? {}).map((s) => s.route_id)),
  ];
}

/**
 * The assets a contributor submits: every `inputs.<key>` a step reads, with
 * the step inputs it feeds.
 */
export function evaluatorContributorInputs(
  definition: EvaluatorDefinition
): Record<string, { step: string; input: string }[]> {
  const out: Record<string, { step: string; input: string }[]> = {};
  for (const [stepName, step] of Object.entries(definition.steps ?? {})) {
    for (const [input, ref] of Object.entries(step.inputs ?? {})) {
      const parsed = parseEvaluatorInputRef(ref);
      if (!parsed || parsed.root !== EVALUATOR_INPUTS_ROOT) continue;
      const key = parsed.path[0];
      if (typeof key !== "string" || parsed.path.length !== 1) continue;
      (out[key] ??= []).push({ step: stepName, input });
    }
  }
  return out;
}

/** The fixed assets an evaluator's steps take, as `{ "<step>.<input>": ref }`. */
export function evaluatorFixedAssets(
  definition: EvaluatorDefinition
): Record<string, EvaluatorAssetRef> {
  const out: Record<string, EvaluatorAssetRef> = {};
  for (const [stepName, step] of Object.entries(definition.steps ?? {})) {
    for (const [input, ref] of Object.entries(step.inputs ?? {})) {
      if (isAssetRef(ref)) out[`${stepName}.${input}`] = ref;
    }
  }
  return out;
}

type ParsedCategories =
  | { kind: "formula"; node: FormulaNode }
  | { kind: "named"; nodes: Record<string, FormulaNode> }
  | null;

type Parsed = {
  gates: Record<string, FormulaNode>;
  categories: ParsedCategories;
  score: FormulaNode;
};

function parseDefinitionFormulas(definition: EvaluatorDefinition): Parsed {
  const gates: Record<string, FormulaNode> = {};
  for (const [name, source] of Object.entries(definition.gates ?? {})) {
    gates[name] = parseFormula(source);
  }
  let categories: ParsedCategories = null;
  if (typeof definition.categories === "string") {
    categories = { kind: "formula", node: parseFormula(definition.categories) };
  } else if (isPlainObject(definition.categories)) {
    const nodes: Record<string, FormulaNode> = {};
    for (const [name, source] of Object.entries(definition.categories)) {
      nodes[name] = parseFormula(source);
    }
    categories = { kind: "named", nodes };
  }
  return { gates, categories, score: parseFormula(definition.score) };
}

/**
 * Check a definition's structure: names, references, formulas and ordering.
 * Returns problems written for the author; an empty list means it is sound.
 * What needs the platform (that routes exist, what inputs they take) is
 * checked by the backend.
 */
export function checkEvaluatorDefinition(definition: unknown): string[] {
  const problems: string[] = [];
  if (!isPlainObject(definition)) return ["The evaluator must be an object"];
  const def = definition as unknown as EvaluatorDefinition;

  if (!isPlainObject(def.steps) || Object.keys(def.steps).length === 0) {
    return ["An evaluator needs at least one step"];
  }
  const stepNames = Object.keys(def.steps);
  if (stepNames.length > EVALUATOR_MAX_STEPS) {
    problems.push(`An evaluator can have at most ${EVALUATOR_MAX_STEPS} steps`);
  }
  const gateNames = Object.keys(isPlainObject(def.gates) ? def.gates : {});
  const categoryNames = isPlainObject(def.categories)
    ? Object.keys(def.categories)
    : [];

  const seen = new Map<string, string>();
  const claim = (name: string, kind: string) => {
    if (!NAME.test(name)) {
      problems.push(
        `${kind} name "${name}" must start with a lowercase letter and use only lowercase letters, digits and underscores`
      );
    } else if (
      name === EVALUATOR_INPUTS_ROOT ||
      name === "score" ||
      FORMULA_RESERVED_NAMES.has(name)
    ) {
      problems.push(`"${name}" is reserved and can't name a ${kind.toLowerCase()}`);
    } else if (seen.has(name)) {
      problems.push(
        `"${name}" names both a ${seen.get(name)} and a ${kind.toLowerCase()}`
      );
    }
    seen.set(name, kind.toLowerCase());
  };
  stepNames.forEach((name) => claim(name, "Step"));
  gateNames.forEach((name) => claim(name, "Gate"));
  categoryNames.forEach((name) => claim(name, "Category"));

  const stepSet = new Set(stepNames);
  const gateSet = new Set(gateNames);

  // What each step waits on: steps whose output it reads, and its gates
  const stepDeps: Record<string, string[]> = {};
  for (const [name, step] of Object.entries(def.steps)) {
    stepDeps[name] = [];
    if (!isPlainObject(step) || typeof step.route_id !== "string" || !step.route_id) {
      problems.push(`Step "${name}" needs a route_id`);
      continue;
    }
    if (step.inputs != null && !isPlainObject(step.inputs)) {
      problems.push(`Step "${name}": inputs must be an object`);
      continue;
    }
    if (step.body != null && !isPlainObject(step.body)) {
      problems.push(`Step "${name}": body must be an object`);
    }
    for (const [input, ref] of Object.entries(step.inputs ?? {})) {
      if (isAssetRef(ref)) continue;
      if (typeof ref !== "string") {
        problems.push(
          `Step "${name}" input "${input}" must be a reference ("inputs.<key>" or "<step>.<field>") or a fixed asset ({ asset_id, asset_type })`
        );
        continue;
      }
      try {
        const parsed = parseEvaluatorInputRef(ref);
        if (!parsed) continue;
        if (parsed.root === EVALUATOR_INPUTS_ROOT) {
          if (parsed.path.length !== 1 || typeof parsed.path[0] !== "string") {
            problems.push(
              `Step "${name}" input "${input}": write a submitted asset as "inputs.<key>"`
            );
          }
        } else if (!stepSet.has(parsed.root)) {
          problems.push(
            `Step "${name}" input "${input}" reads "${parsed.root}", which is not a step`
          );
        } else if (parsed.root === name) {
          problems.push(`Step "${name}" input "${input}" reads its own output`);
        } else if (parsed.path.length === 0) {
          problems.push(
            `Step "${name}" input "${input}": name the field of "${parsed.root}" that holds the asset, e.g. "${parsed.root}.file"`
          );
        } else {
          stepDeps[name].push(parsed.root);
        }
      } catch (error) {
        problems.push(
          `Step "${name}" input "${input}": ${(error as Error).message}`
        );
      }
    }
    if (step.after != null && !Array.isArray(step.after)) {
      problems.push(`Step "${name}": after must be a list of gate names`);
      continue;
    }
    for (const gate of step.after ?? []) {
      if (!gateSet.has(gate)) {
        problems.push(`Step "${name}" waits on "${gate}", which is not a gate`);
      }
    }
  }

  const checkFormula = (
    label: string,
    source: unknown,
    allowed: Set<string>,
    allowedText: string
  ): string[] => {
    if (typeof source !== "string" || !source.trim()) {
      problems.push(`${label} needs a formula`);
      return [];
    }
    try {
      const roots = formulaRoots(parseFormula(source));
      for (const root of roots) {
        if (!allowed.has(root)) {
          problems.push(
            `${label} reads "${root}", which is not ${allowedText}`
          );
        }
      }
      return roots;
    } catch (error) {
      problems.push(`${label}: ${(error as Error).message}`);
      return [];
    }
  };

  const gateDeps: Record<string, string[]> = {};
  if (def.gates != null && !isPlainObject(def.gates)) {
    problems.push("gates must be an object of name: formula");
  }
  for (const name of gateNames) {
    gateDeps[name] = checkFormula(
      `Gate "${name}"`,
      (def.gates as Record<string, unknown>)[name],
      stepSet,
      "a step"
    ).filter((root) => stepSet.has(root));
  }

  const stepsAndGates = new Set([...stepNames, ...gateNames]);
  if (typeof def.categories === "string") {
    checkFormula("categories", def.categories, stepsAndGates, "a step or gate");
  } else if (isPlainObject(def.categories)) {
    for (const name of categoryNames) {
      checkFormula(
        `Category "${name}"`,
        def.categories[name],
        stepsAndGates,
        "a step or gate"
      );
    }
  } else if (def.categories != null) {
    problems.push("categories must be an object of name: formula, or one formula");
  }
  checkFormula(
    "score",
    def.score,
    new Set([...stepsAndGates, ...categoryNames]),
    "a step, gate or category"
  );

  if (def.pass != null) {
    const { min, max } = isPlainObject(def.pass)
      ? (def.pass as { min?: unknown; max?: unknown })
      : { min: NaN, max: NaN };
    const bad = (value: unknown) =>
      value != null && !(typeof value === "number" && Number.isFinite(value));
    if (bad(min) || bad(max)) {
      problems.push("pass.min and pass.max must be numbers");
    } else if (min != null && max != null && (min as number) > (max as number)) {
      problems.push("pass.min is greater than pass.max");
    }
  }

  // A step can't wait, directly or through a gate, on itself
  const waitsOn = (name: string): string[] => [
    ...(stepDeps[name] ?? []),
    ...((def.steps[name]?.after ?? []) as string[]).flatMap(
      (gate) => gateDeps[gate] ?? []
    ),
  ];
  const state = new Map<string, "visiting" | "done">();
  const visit = (name: string, trail: string[]): boolean => {
    if (state.get(name) === "done") return false;
    if (state.get(name) === "visiting") {
      problems.push(
        `Steps wait on each other in a loop: ${[...trail, name].join(" → ")}`
      );
      return true;
    }
    state.set(name, "visiting");
    for (const dep of waitsOn(name)) {
      if (visit(dep, [...trail, name])) return true;
    }
    state.set(name, "done");
    return false;
  };
  for (const name of stepNames) {
    if (visit(name, [])) break;
  }

  return problems;
}

/** Normalize a response fragment into `{ name: score }`, or null. */
export function normalizeCategoryScores(
  raw: unknown
): Record<string, number> | null {
  if (raw == null || typeof raw !== "object") return null;
  const out: Record<string, number> = {};
  const add = (key: unknown, value: unknown) => {
    if (typeof key !== "string") return;
    const name = key.trim();
    if (!name || BLOCKED_CATEGORY_KEYS.has(name)) return;
    const nested =
      isPlainObject(value) && value.score !== undefined ? value.score : value;
    const score = formulaNumber(nested);
    if (score != null) out[name] = score;
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!isPlainObject(item)) continue;
      add(
        item.name ?? item.key ?? item.label ?? item.category,
        item.score ?? item.value
      );
    }
  } else {
    for (const [key, value] of Object.entries(raw)) add(key, value);
  }
  return Object.keys(out).length > 0 ? out : null;
}

function withinPass(
  score: number,
  pass: EvaluatorDefinition["pass"]
): boolean {
  if (pass?.min != null && score < Number(pass.min)) return false;
  if (pass?.max != null && score > Number(pass.max)) return false;
  return true;
}

/**
 * Decide what happens next in a run. Call it whenever a step changes state:
 * start what it lists under `start`, mark what it lists under `skip`, and
 * when `result` is set the run is over.
 *
 * `states` must have an entry for every step. The definition must already
 * have passed `checkEvaluatorDefinition`.
 */
export function planEvaluation(
  definition: EvaluatorDefinition,
  states: Record<string, EvaluationStepState>
): EvaluationPlan {
  const parsed = parseDefinitionFormulas(definition);
  const stepNames = Object.keys(definition.steps);
  const statusOf = (name: string) => states[name]?.status ?? "pending";

  const scope: Record<string, unknown> = {};
  for (const name of stepNames) {
    if (statusOf(name) === "success") scope[name] = states[name].response ?? {};
  }

  const stepSet = new Set(stepNames);
  const gates: Record<string, boolean | null> = {};
  for (const [name, node] of Object.entries(parsed.gates)) {
    const reads = formulaRoots(node).filter((root) => stepSet.has(root));
    gates[name] = reads.every((step) => statusOf(step) === "success")
      ? evaluateFormula(node, scope) === true
      : null;
  }

  const failedStep = stepNames.find((name) => statusOf(name) === "error");
  const failedGate = Object.keys(gates).find((name) => gates[name] === false);

  const start: string[] = [];
  const skip: Record<string, string> = {};
  const pending = stepNames.filter((name) => statusOf(name) === "pending");
  if (failedStep || failedGate) {
    const reason = failedStep
      ? `Step "${failedStep}" failed`
      : `Gate "${failedGate}" did not pass`;
    for (const name of pending) skip[name] = reason;
  } else {
    for (const name of pending) {
      const step = definition.steps[name];
      const inputsReady = stepInputSteps(step).every(
        (dep) => statusOf(dep) === "success"
      );
      const gatesPassed = (step.after ?? []).every((gate) => gates[gate] === true);
      if (inputsReady && gatesPassed) start.push(name);
    }
    const running = stepNames.some((name) => statusOf(name) === "running");
    if (!running && start.length === 0) {
      // Nothing can move: what's left waits on something that will never come
      for (const name of pending) skip[name] = "A step it waits on did not run";
    }
  }

  const unfinished = stepNames.some((name) => {
    const status = statusOf(name);
    return status === "running" || (status === "pending" && !(name in skip));
  });
  if (unfinished) return { start, skip, gates, result: null };

  if (failedStep) {
    return {
      start,
      skip,
      gates,
      result: {
        status: "errored",
        score: null,
        passed: false,
        gates,
        categories: null,
        error: `Step "${failedStep}" failed`,
      },
    };
  }

  const fullScope: Record<string, unknown> = { ...scope };
  for (const [name, value] of Object.entries(gates)) fullScope[name] = value;

  let categories: Record<string, number> | null = null;
  if (parsed.categories?.kind === "formula") {
    categories = normalizeCategoryScores(
      evaluateFormula(parsed.categories.node, fullScope)
    );
  } else if (parsed.categories?.kind === "named") {
    const named: Record<string, number> = {};
    for (const [name, node] of Object.entries(parsed.categories.nodes)) {
      const value = formulaNumber(evaluateFormula(node, fullScope));
      fullScope[name] = value;
      if (value != null) named[name] = value;
    }
    categories = Object.keys(named).length > 0 ? named : null;
  }

  const score = formulaNumber(evaluateFormula(parsed.score, fullScope));
  const gatesPassed = Object.values(gates).every((value) => value === true);
  const stalled = Object.keys(skip).length > 0 && !failedGate;

  if (score == null && !failedGate) {
    return {
      start,
      skip,
      gates,
      result: {
        status: "errored",
        score: null,
        passed: false,
        gates,
        categories,
        error: stalled
          ? "Some steps could not run, so no score could be computed"
          : "The score formula did not produce a number from the step responses",
      },
    };
  }

  return {
    start,
    skip,
    gates,
    result: {
      status: "completed",
      score,
      passed: gatesPassed && score != null && withinPass(score, definition.pass),
      gates,
      categories,
      error: null,
    },
  };
}

/** Resolve a step input that reads an earlier step: the asset it points at. */
export function readStepOutputAsset(
  response: unknown,
  path: (string | number)[]
): EvaluatorAssetRef | null {
  const value = readFormulaPath({ response }, ["response", ...path]);
  if (!isPlainObject(value)) return null;
  const id = value.id ?? value.asset_id;
  const type = value.asset_type ?? value.assetType;
  if (typeof id !== "string" || typeof type !== "string") return null;
  return { asset_id: id, asset_type: type };
}

// ── The one-route form ─────────────────────────────────────────────────
// An evaluator that is a single route call can be written, and read back, as
// the flat fields quest items carried before evaluators existed.

export type SingleRouteEvaluatorFields = {
  eval_route_id: string;
  eval_score_path?: string | null;
  eval_categories_path?: string | null;
  eval_pass_min?: number | null;
  eval_pass_max?: number | null;
  eval_static_inputs?: Record<string, EvaluatorAssetRef> | null;
};

export const SINGLE_ROUTE_STEP = "eval";

function jsonPathToFormula(path: string | null | undefined, fallback: string) {
  const normalized = (typeof path === "string" && path.trim()) || fallback;
  if (!normalized.startsWith("$")) {
    throw new FormulaError(`"${normalized}" must start with "$."`);
  }
  const segments = normalized.slice(1).split(".").filter(Boolean);
  return pathToFormula([SINGLE_ROUTE_STEP, ...segments]);
}

function formulaToJsonPath(source: string): string | null {
  let path: (string | number)[] | null;
  try {
    path = formulaAsPath(parseFormula(source));
  } catch {
    return null;
  }
  if (!path || path[0] !== SINGLE_ROUTE_STEP) return null;
  const segments = path.slice(1);
  if (segments.some((s) => typeof s !== "string" || s.includes("."))) return null;
  return `$.${segments.join(".")}`;
}

/** Build the evaluator for one route call. `contributorKeys` are the route inputs entries fill. */
export function singleRouteEvaluator(
  fields: SingleRouteEvaluatorFields,
  contributorKeys: string[]
): EvaluatorDefinition {
  const inputs: Record<string, EvaluatorInputRef> = {};
  for (const [key, ref] of Object.entries(fields.eval_static_inputs ?? {})) {
    inputs[key] = { asset_id: ref.asset_id, asset_type: ref.asset_type };
  }
  for (const key of contributorKeys) {
    if (!(key in inputs)) {
      inputs[key] = pathToFormula([EVALUATOR_INPUTS_ROOT, key]);
    }
  }
  const pass =
    fields.eval_pass_min != null || fields.eval_pass_max != null
      ? {
          ...(fields.eval_pass_min != null ? { min: Number(fields.eval_pass_min) } : {}),
          ...(fields.eval_pass_max != null ? { max: Number(fields.eval_pass_max) } : {}),
        }
      : null;
  return {
    steps: { [SINGLE_ROUTE_STEP]: { route_id: fields.eval_route_id, inputs } },
    categories: jsonPathToFormula(fields.eval_categories_path, "$.categories"),
    score: jsonPathToFormula(fields.eval_score_path, "$.score"),
    ...(pass ? { pass } : {}),
  };
}

/** The flat fields for an evaluator that is one plain route call, else null. */
export function singleRouteEvaluatorFields(
  definition: EvaluatorDefinition | null | undefined
): Required<SingleRouteEvaluatorFields> | null {
  if (!definition || !isPlainObject(definition.steps)) return null;
  const names = Object.keys(definition.steps);
  if (names.length !== 1 || names[0] !== SINGLE_ROUTE_STEP) return null;
  const step = definition.steps[SINGLE_ROUTE_STEP];
  if (Object.keys(definition.gates ?? {}).length > 0) return null;
  if (Object.keys(step.body ?? {}).length > 0) return null;
  if (definition.categories != null && typeof definition.categories !== "string") {
    return null;
  }
  const scorePath = formulaToJsonPath(definition.score);
  const categoriesPath =
    definition.categories == null
      ? null
      : formulaToJsonPath(definition.categories);
  if (!scorePath || (definition.categories != null && !categoriesPath)) {
    return null;
  }
  const pins: Record<string, EvaluatorAssetRef> = {};
  for (const [key, ref] of Object.entries(step.inputs ?? {})) {
    if (isAssetRef(ref)) {
      pins[key] = ref;
    } else if (ref !== pathToFormula([EVALUATOR_INPUTS_ROOT, key])) {
      return null;
    }
  }
  return {
    eval_route_id: step.route_id,
    eval_score_path: scorePath,
    eval_categories_path: categoriesPath,
    eval_pass_min: definition.pass?.min ?? null,
    eval_pass_max: definition.pass?.max ?? null,
    eval_static_inputs: Object.keys(pins).length > 0 ? pins : null,
  };
}
