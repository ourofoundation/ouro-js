import {
  object,
  string,
  number,
  array,
  record,
  any,
  optional,
  nullable,
  union,
  uuid,
  boolean as zodBoolean,
  enum as zodEnum,
  type z,
} from "zod";

import { AssetTypeSchema } from "./common";
import { checkEvaluatorDefinition } from "../utils/evaluator";

/** A fixed asset the quest's author supplies to a step. */
const EvaluatorAssetRefSchema = object({
  asset_id: uuid(),
  asset_type: AssetTypeSchema,
});

/**
 * Where a step input comes from: `"inputs.<key>"` (an asset the contributor
 * submits), `"<step>.<field>"` (an asset an earlier step returned), or a
 * fixed asset.
 */
const EvaluatorInputRefSchema = union([string().min(1), EvaluatorAssetRefSchema]);

const EvaluatorStepSchema = object({
  route_id: uuid(),
  inputs: optional(nullable(record(string(), EvaluatorInputRefSchema))),
  /** Fixed request parameters sent with the step's inputs. */
  body: optional(nullable(record(string(), any()))),
  /** Gates that must pass before this step starts. */
  after: optional(nullable(array(string()))),
  /**
   * The route gives back what it is given when that already came out of it
   * (a relaxation): a run of it that made the step's input stands for the step.
   */
  idempotent: optional(nullable(zodBoolean())),
});

/**
 * How a quest item scores an entry: routes to run as steps, then formulas
 * over their responses. See `utils/formula` for the formula language.
 */
const EvaluatorDefinitionShapeSchema = object({
  steps: record(string(), EvaluatorStepSchema),
  /** Conditions an entry must meet. A failed gate stops steps not yet started. */
  gates: optional(nullable(record(string(), string()))),
  /** Named sub-scores, or one formula reading `{ name: score }` from a response. */
  categories: optional(nullable(union([record(string(), string()), string()]))),
  score: string().min(1),
  /** Inclusive score band an entry must land in to pass. */
  pass: optional(
    nullable(
      object({
        min: optional(nullable(number())),
        max: optional(nullable(number())),
      })
    )
  ),
});

/** The shape plus its checks: names, references, formulas and step ordering. */
const EvaluatorDefinitionSchema = EvaluatorDefinitionShapeSchema.superRefine(
  (value, context) => {
    for (const message of checkEvaluatorDefinition(value)) {
      context.addIssue({ code: "custom", message });
    }
  }
);

const EvaluatorSchema = object({
  id: uuid(),
  quest_id: uuid(),
  definition: EvaluatorDefinitionShapeSchema,
  created_by: optional(nullable(uuid())),
  created_at: string(),
});

const EvaluationStepStatusSchema = zodEnum([
  "pending",
  "running",
  "success",
  "error",
  "skipped",
]);

const EvaluationRunStatusSchema = zodEnum(["running", "completed", "errored"]);

/** Why a run happened: an entry's evaluation, a re-score, or a trial with no entry. */
const EvaluationRunPurposeSchema = zodEnum(["entry", "rescore", "test"]);

const EvaluationRunStepSchema = object({
  status: EvaluationStepStatusSchema,
  route_id: optional(nullable(uuid())),
  /** The route run behind this step, once it started. */
  action_id: optional(nullable(uuid())),
  /** Why the step was skipped or failed. */
  reason: optional(nullable(string())),
  /** The evaluation run this step's result was taken from, when it wasn't run again. */
  reused_from: optional(nullable(string())),
  /** True when action_id is an earlier route run the step took over instead of running. */
  reused_action: optional(nullable(zodBoolean())),
});

const EvaluationRunSchema = object({
  id: uuid(),
  evaluator_id: optional(nullable(uuid())),
  quest_id: uuid(),
  item_id: optional(nullable(uuid())),
  entry_id: optional(nullable(uuid())),
  user_id: uuid(),
  purpose: EvaluationRunPurposeSchema,
  status: EvaluationRunStatusSchema,
  steps: record(string(), EvaluationRunStepSchema),
  score: optional(nullable(number())),
  passed: optional(nullable(zodBoolean())),
  /** true passed, false failed, null not decided. */
  gates: optional(nullable(record(string(), nullable(zodBoolean())))),
  categories: optional(nullable(record(string(), number()))),
  error: optional(nullable(string())),
  created_at: string(),
  finished_at: optional(nullable(string())),
});

export {
  EvaluatorAssetRefSchema,
  EvaluatorInputRefSchema,
  EvaluatorStepSchema,
  EvaluatorDefinitionShapeSchema,
  EvaluatorDefinitionSchema,
  EvaluatorSchema,
  EvaluationStepStatusSchema,
  EvaluationRunStatusSchema,
  EvaluationRunPurposeSchema,
  EvaluationRunStepSchema,
  EvaluationRunSchema,
};

export type Evaluator = z.infer<typeof EvaluatorSchema>;
export type EvaluationRunStatus = z.infer<typeof EvaluationRunStatusSchema>;
export type EvaluationRunPurpose = z.infer<typeof EvaluationRunPurposeSchema>;
export type EvaluationRunStep = z.infer<typeof EvaluationRunStepSchema>;
export type EvaluationRun = z.infer<typeof EvaluationRunSchema>;
