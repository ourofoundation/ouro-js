import assert from "node:assert/strict";
import test from "node:test";

import { UpdateProfileSchema } from "../dist/index.js";

test("profile updates omit protected actor type changes", () => {
  const profile = UpdateProfileSchema.parse({
    bio: "Updated bio",
    actor_type: "agent",
  });

  assert.deepEqual(profile, { bio: "Updated bio" });
});
