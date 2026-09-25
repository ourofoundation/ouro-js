import assert from "node:assert/strict";
import test from "node:test";

import {
  AssetRenditionSchema,
  LanguageToolsPreferencesSchema,
  RouteCapabilitiesSchema,
  RouteInputAssetDeclarationSchema,
} from "../dist/index.js";

const id = "019b7d6d-2cc5-7df8-a575-91ecbfc72fc0";
const otherId = "019b7d6d-2cc5-7df8-a575-91ecbfc72fc1";

test("route inputs accept a post and comment union", () => {
  const declaration = RouteInputAssetDeclarationSchema.parse({
    asset_type: "post",
    asset_types: ["post", "comment"],
    primary: true,
  });

  assert.equal(declaration.asset_type, "post");
  assert.deepEqual(declaration.asset_types, ["post", "comment"]);
});

test("legacy singular route input declarations remain valid", () => {
  const declaration = RouteInputAssetDeclarationSchema.parse({
    asset_type: "post",
  });

  assert.equal(declaration.asset_type, "post");
  assert.equal(declaration.asset_types, undefined);
});

test("semantic text capabilities parse cache and voice metadata", () => {
  const capabilities = RouteCapabilitiesSchema.parse({
    "text.translate.v1": {
      supported_languages: ["en", "es"],
      cache_version: "2026-09-17",
      structured_content: true,
    },
    "text.speech.v1": {
      supported_languages: ["en-US"],
      voices: [{ id: "alloy", language: "en-US" }],
      cache_scope: "user",
      cache_version: "voice-model-2",
      trusted: true,
    },
    "speech.transcribe.v1": {
      supported_languages: ["*"],
      cache_version: "stt-1",
    },
  });

  assert.equal(capabilities["text.translate.v1"].cache_scope, "none");
  assert.equal(capabilities["text.translate.v1"].trusted, false);
  assert.equal(capabilities["text.speech.v1"].voices[0].id, "alloy");
  assert.equal(capabilities["speech.transcribe.v1"].cache_scope, "none");
});

test("translation and speech renditions share a status contract", () => {
  const translation = AssetRenditionSchema.parse({
    id,
    asset_id: otherId,
    route_id: id,
    provider_id: otherId,
    kind: "translation",
    status: "success",
    target_language: "es",
    content: {
      json: { type: "doc", content: [] },
      text: "Hola",
    },
    created_at: "2026-09-17T00:00:00.000Z",
    last_updated: "2026-09-17T00:00:00.000Z",
  });
  const speech = AssetRenditionSchema.parse({
    id,
    asset_id: otherId,
    route_id: id,
    provider_id: otherId,
    kind: "speech",
    status: "in-progress",
    language: "en-US",
    created_at: "2026-09-17T00:00:00.000Z",
    last_updated: "2026-09-17T00:00:00.000Z",
  });

  assert.equal(translation.content.text, "Hola");
  assert.equal(speech.status, "in-progress");
});

test("language tool preferences retain per-provider options", () => {
  const preferences = LanguageToolsPreferencesSchema.parse({
    language: "es-MX",
    translation: {
      route_id: id,
      options: { formality: "informal" },
    },
    speech: {
      route_id: otherId,
      voice: "alloy",
      options: {},
    },
    transcription: {
      route_id: id,
      options: {},
    },
  });

  assert.equal(preferences.translation.options.formality, "informal");
});
