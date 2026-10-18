// Charts a route declares over the lists in its JSON response.
//
// An operation may carry `x-ouro-response-charts`, a list of:
//
//   { "data": "magnetization_curve",        // dot path to a list of records
//     "title": "Magnetization curve",
//     "description": "Tc = {Tc_K:0} K, where the susceptibility peaks.",
//     "sort": "temperature_K",              // optional; "-key" for descending
//     "limit": 30,                          // optional
//     "dataset": "magnetization_curve_dataset",  // optional dataset output
//     "config": { ...a dataset view's chart config, keyed by the records' own keys } }
//
// Strings may name response values as `{path}` or `{path:decimals}`, and a
// reference line's value may be `{"field": "path"}`, so a chart can mark a
// per-run value such as Tc.
//
// Shared by the backend (spec validation, the dataset view a chart becomes)
// and the frontend (the charts drawn on a run).

export type ResponseChart = {
  /** Dot path to a list of records in the response */
  data: string;
  title: string;
  description?: string | null;
  /** The dataset output this chart becomes the saved view of */
  dataset?: string | null;
  /** Record key to sort by; "-key" for descending */
  sort?: string | null;
  limit?: number | null;
  config: Record<string, unknown>;
};

export type ResolvedResponseChart = {
  key: string;
  title: string;
  description: string | null;
  rows: Record<string, unknown>[];
  config: Record<string, any>;
};

/** Dot path into a response: "summary.phases" → response.summary.phases */
export function getResponsePath(response: unknown, path: string): unknown {
  let value: any = response;
  for (const part of path.split(".")) {
    if (value == null || typeof value !== "object") return undefined;
    value = value[part];
  }
  return value;
}

/** Fill `{path}` / `{path:decimals}` from the response; unknown paths stay. */
export function fillResponseTemplate(text: string, response: unknown): string {
  return text.replace(
    /\{([A-Za-z0-9_.]+)(?::(\d+))?\}/g,
    (whole, path: string, decimals?: string) => {
      const value = getResponsePath(response, path);
      if (value == null || typeof value === "object") return whole;
      if (decimals !== undefined && typeof value === "number") {
        return value.toFixed(Number(decimals));
      }
      return String(value);
    }
  );
}

/**
 * The config with response values filled in: templated strings, and
 * reference lines whose value is `{field}`. A reference line whose field is
 * missing from the response is dropped.
 */
export function resolveResponseChartConfig(
  config: Record<string, unknown>,
  response: unknown
): Record<string, any> {
  const fill = (value: unknown): unknown => {
    if (typeof value === "string") return fillResponseTemplate(value, response);
    if (Array.isArray(value)) return value.map(fill);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, fill(v)])
      );
    }
    return value;
  };
  const resolved = fill(config) as Record<string, any>;
  if (Array.isArray(resolved.referenceLines)) {
    resolved.referenceLines = resolved.referenceLines.flatMap((line: any) => {
      const ref = line?.value;
      if (!ref || typeof ref !== "object") return [line];
      const value = getResponsePath(response, String(ref.field ?? ""));
      return typeof value === "number" || typeof value === "string"
        ? [{ ...line, value }]
        : [];
    });
  }
  return resolved;
}

/** The records a chart draws from a response, sorted and limited. */
export function responseChartRows(
  chart: Pick<ResponseChart, "data" | "sort" | "limit">,
  response: unknown
): Record<string, unknown>[] {
  const rows = getResponsePath(response, chart.data);
  if (!Array.isArray(rows)) return [];
  let out = rows.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row)
  );
  if (chart.sort) {
    const descending = chart.sort.startsWith("-");
    const key = chart.sort.replace(/^-/, "");
    out = [...out].sort((a, b) => {
      const x = a[key] as any;
      const y = b[key] as any;
      if (x == null) return 1;
      if (y == null) return -1;
      const order = x < y ? -1 : x > y ? 1 : 0;
      return descending ? -order : order;
    });
  }
  return chart.limit ? out.slice(0, chart.limit) : out;
}

const isNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value);

/**
 * The charts this response can draw. A chart is left out when its list is
 * missing or empty, or when no row has a number in any series, so a route
 * can declare alternatives (e.g. a score when targets were set, counts when
 * not) and only the one with data shows.
 */
export function resolveResponseCharts(
  charts: unknown,
  response: unknown
): ResolvedResponseChart[] {
  if (!Array.isArray(charts) || !response || typeof response !== "object") {
    return [];
  }
  return (charts as ResponseChart[]).flatMap((chart, index) => {
    if (!chart?.data || !chart.config) return [];
    const rows = responseChartRows(chart, response);
    if (!rows.length) return [];
    const config = resolveResponseChartConfig(chart.config, response);
    const seriesKeys: string[] = [
      ...((config.series as any[]) ?? []).map((s) => s?.dataKey),
      config.dataKey,
    ].filter((k): k is string => typeof k === "string");
    if (!rows.some((row) => seriesKeys.some((k) => isNumber(row[k])))) {
      return [];
    }
    return [
      {
        key: `${index}-${chart.data}`,
        title: fillResponseTemplate(chart.title, response),
        description: chart.description
          ? fillResponseTemplate(chart.description, response)
          : null,
        rows,
        config,
      },
    ];
  });
}
