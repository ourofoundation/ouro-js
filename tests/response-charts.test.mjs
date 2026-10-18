import assert from "node:assert/strict";
import test from "node:test";

import {
  fillResponseTemplate,
  getResponsePath,
  resolveResponseChartConfig,
  resolveResponseCharts,
  responseChartRows,
} from "../dist/index.js";

const CURVE_CHART = {
  data: "magnetization_curve",
  title: "Magnetization curve",
  description: "Tc = {Tc_K:0} K, where the susceptibility peaks.",
  sort: "temperature_K",
  config: {
    type: "line",
    category: { dataKey: "temperature_K", type: "number" },
    series: [{ dataKey: "order_parameter", name: "Order parameter" }],
    referenceLines: [
      { axis: "category", value: { field: "Tc_K" }, label: "Tc {Tc_K:0} K" },
    ],
  },
};

const RESPONSE = {
  Tc_K: 3088.4,
  summary: { phases: [{ name: "A" }] },
  magnetization_curve: [
    { temperature_K: 500, order_parameter: 0.2 },
    { temperature_K: 100, order_parameter: 0.9 },
  ],
};

test("dot paths read nested values", () => {
  assert.deepEqual(getResponsePath(RESPONSE, "summary.phases"), [{ name: "A" }]);
  assert.equal(getResponsePath(RESPONSE, "Tc_K.nope"), undefined);
  assert.equal(getResponsePath(null, "x"), undefined);
});

test("templates fill known paths and keep unknown ones", () => {
  assert.equal(
    fillResponseTemplate("Tc {Tc_K:0} K, {missing}", RESPONSE),
    "Tc 3088 K, {missing}"
  );
});

test("reference lines read their field, or drop out without it", () => {
  assert.deepEqual(resolveResponseChartConfig(CURVE_CHART.config, RESPONSE).referenceLines, [
    { axis: "category", value: 3088.4, label: "Tc 3088 K" },
  ]);
  assert.deepEqual(resolveResponseChartConfig(CURVE_CHART.config, {}).referenceLines, []);
});

test("rows are sorted and limited", () => {
  assert.deepEqual(
    responseChartRows({ ...CURVE_CHART, limit: 1 }, RESPONSE).map((r) => r.temperature_K),
    [100]
  );
  assert.deepEqual(
    responseChartRows({ ...CURVE_CHART, sort: "-temperature_K" }, RESPONSE).map(
      (r) => r.temperature_K
    ),
    [500, 100]
  );
  assert.deepEqual(responseChartRows({ data: "nope" }, RESPONSE), []);
});

test("a run draws only charts with numbers to plot", () => {
  const counts = {
    data: "magnetization_curve",
    title: "Counts",
    config: { type: "bar", series: [{ dataKey: "count" }] },
  };
  const charts = resolveResponseCharts([CURVE_CHART, counts], RESPONSE);
  assert.equal(charts.length, 1);
  assert.equal(charts[0].description, "Tc = 3088 K, where the susceptibility peaks.");
  assert.deepEqual(resolveResponseCharts([CURVE_CHART], null), []);
});
