import assert from "node:assert/strict";
import test from "node:test";

import { createNameUrlSlug } from "../dist/index.js";

test("createNameUrlSlug keeps plain names unchanged", () => {
  // Pre-existing behaviour must hold for ordinary names so stored slugs
  // keep matching what the function produces.
  const cases = {
    "Crystal structures for composition: SnS 1": "crystal-structures-for-composition-sns-1",
    "POST /generate": "post-generate",
    "Relax a crystal structure": "relax-a-crystal-structure",
    "Li-O-Ti — 3 MatterGen structures (Fm-3m, P4_2/mnm)":
      "li-o-ti-3-mattergen-structures-fm-3m-p4-2-mnm",
    "Café résumé": "cafe-resume",
    "  --leading and trailing--  ": "leading-and-trailing",
  };
  for (const [name, slug] of Object.entries(cases)) {
    assert.equal(createNameUrlSlug(name), slug, name);
  }
});

test("createNameUrlSlug keeps decimals readable", () => {
  assert.equal(
    createNameUrlSlug("PbTe (Fm-3m): thermoelectric ZT estimate (ZT_max 1.21 at 700 K)"),
    "pbte-fm-3m-thermoelectric-zt-estimate-zt-max-1-21-at-700-k"
  );
  assert.equal(createNameUrlSlug("Stable Diffusion 3.5"), "stable-diffusion-3-5");
  // Sentence-ending periods and file extensions are still dropped/joined
  assert.equal(createNameUrlSlug("results.zip"), "resultszip");
  assert.equal(createNameUrlSlug("Done."), "done");
});

test("createNameUrlSlug spells out Greek letters", () => {
  assert.equal(
    createNameUrlSlug("PbTe (Fm-3m): simulated XRD pattern (Cu Kα)"),
    "pbte-fm-3m-simulated-xrd-pattern-cu-k-alpha"
  );
  assert.equal(createNameUrlSlug("κ_lat vs T"), "kappa-lat-vs-t");
  assert.equal(createNameUrlSlug("α-Fe"), "alpha-fe");
  assert.equal(createNameUrlSlug("ΔG of formation"), "delta-g-of-formation");
  assert.equal(createNameUrlSlug("10 µm film"), "10-mu-m-film");
});

test("createNameUrlSlug folds superscripts and unicode dashes", () => {
  assert.equal(
    createNameUrlSlug("Magnetic density 0.1 Å⁻³"),
    "magnetic-density-0-1-a-3"
  );
  assert.equal(createNameUrlSlug("n = 1e20 cm⁻³"), "n-1e20-cm-3");
  assert.equal(createNameUrlSlug("Area m²"), "area-m2");
  assert.equal(createNameUrlSlug("Before—after"), "before-after");
});
