import assert from "node:assert/strict";
import test from "node:test";

import { parseMarkdown } from "../dist/utils/air/markdown-parser.js";
import {
  extractAssetWikiLinks,
  getReferencesInContent,
} from "../dist/index.js";

const DATASET_ID = "01a06cb9-cb9e-72d0-acaa-c36468a1b1ba";

test("extractAssetWikiLinks finds collapsed [dataset:uuid] spans", () => {
  const matches = extractAssetWikiLinks(
    `See [dataset:${DATASET_ID}] and [dataset:${DATASET_ID}](dataset:${DATASET_ID}).`
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].href, `dataset:${DATASET_ID}`);
});

test("parseMarkdown turns [dataset:uuid] into an anchor", () => {
  const html = parseMarkdown(`See [dataset:${DATASET_ID}] for rows.`);
  assert.match(
    String(html),
    new RegExp(`href="dataset:${DATASET_ID}"`)
  );
});

test("parseMarkdown leaves [label](dataset:uuid) to the built-in link tokenizer", () => {
  const html = parseMarkdown(`See [results](dataset:${DATASET_ID}).`);
  assert.match(String(html), />results<\/a>/);
  assert.match(String(html), new RegExp(`href="dataset:${DATASET_ID}"`));
});

test("getReferencesInContent extracts wiki-links from plain text nodes", () => {
  const refs = getReferencesInContent({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Re-probed [dataset:${DATASET_ID}] via MCP`,
          },
        ],
      },
    ],
  });
  assert.equal(refs.assets.length, 1);
  assert.equal(refs.assets[0].id, DATASET_ID);
  assert.equal(refs.assets[0].assetType, "dataset");
});

test("parseMarkdown turns a [!NOTE] blockquote into a callout", () => {
  const html = String(
    parseMarkdown("> [!NOTE]\n> AI-generated. See [the API](https://example.com).\n>\n> Second paragraph.")
  );
  assert.match(html, /^<div data-type="callout" data-callout="note">/);
  assert.match(html, /<p>AI-generated\. See <a href="https:\/\/example\.com">the API<\/a>\.<\/p>/);
  assert.match(html, /<p>Second paragraph\.<\/p>/);
  assert.doesNotMatch(html, /\[!NOTE\]|blockquote/);
});

test("parseMarkdown keeps the callout kind and leaves plain quotes alone", () => {
  assert.match(
    String(parseMarkdown("> [!warning]\n> Careful.")),
    /data-callout="warning"/
  );
  assert.match(String(parseMarkdown("> Just a quote.")), /^<blockquote>/);
  assert.match(String(parseMarkdown("> [!SOMETHING]\n> text")), /^<blockquote>/);
});
