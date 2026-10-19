// Asset lineage: what an asset is to the asset it came from.
//
// Every asset has a `lineage_role`, and a route's output declaration in
// `routes.output_assets` may set it with `role`:
//   new         a standalone thing (a generated structure, a report post)
//   version     the same thing, improved (a relaxed or symmetrized CIF)
//   result      computed about its source (phonons, a phase diagram)
//   supporting  intermediate or raw (a trajectory, logs, input decks)
//
// Every asset except a `new` one belongs to a source asset (`source_id`) and is
// folded into that source's family (`family_id`) in asset lists. The source is the run's primary input; a
// run without an input asset makes its primary output the source of the rest,
// so one run's outputs stay together. An embedded output's source is the post
// it goes into.
//
// An output that declares no role takes one from where it lands: embedded →
// supporting, a run with an input → result, otherwise the primary output is
// new and the rest are its results.
//
// Shared by the backend (where outputs are saved) and the frontend (route
// docs, the run form). ouro-py's `ouro.utils.route_outputs` ports the same
// rules; keep them in step.

export const ASSET_LINEAGE_ROLES = [
  "new",
  "version",
  "result",
  "supporting",
] as const;

export type AssetLineageRole = (typeof ASSET_LINEAGE_ROLES)[number];

/** Where an output's source asset comes from; null when it has none. */
export type RouteOutputSource = "input" | "primary_output" | "embedding_post";

export const ASSET_LINEAGE_ROLE_LABELS: Record<AssetLineageRole, string> = {
  new: "New asset",
  version: "Version",
  result: "Result",
  supporting: "Supporting",
};

export const ASSET_LINEAGE_ROLE_DESCRIPTIONS: Record<AssetLineageRole, string> = {
  new: "A standalone asset, listed on its own",
  version: "The same thing as its source, improved",
  result: "Computed about its source",
  supporting: "Intermediate or raw output, kept with its source",
};

export function isAssetLineageRole(value: unknown): value is AssetLineageRole {
  return (
    typeof value === "string" &&
    (ASSET_LINEAGE_ROLES as readonly string[]).includes(value)
  );
}

/**
 * The role a saved output takes and where its source comes from. An output
 * with no source is always `new`, whatever it declares.
 */
export function resolveRouteOutputRole(args: {
  /** The declaration's `role`, if any. */
  declared?: unknown;
  /** Saved inside a post the same run created. */
  embedded?: boolean;
  /** This is the run's primary output. */
  primary?: boolean;
  /** The run has an input asset. */
  hasInput: boolean;
}): { role: AssetLineageRole; source: RouteOutputSource | null } {
  const source: RouteOutputSource | null = args.embedded
    ? "embedding_post"
    : args.hasInput
      ? "input"
      : args.primary
        ? null
        : "primary_output";
  if (source == null) return { role: "new", source: null };

  if (isAssetLineageRole(args.declared)) {
    return { role: args.declared, source };
  }
  if (args.embedded) return { role: "supporting", source };
  return { role: "result", source };
}
