import {
  object,
  string,
  uuid,
  type z,
  any,
  optional,
  nullable,
} from "zod";

/**
 * Display-time seed for `[label](action:<uuid>)` chips.
 * Resolved server-side when reading content that links to route actions.
 * `route` is intentionally loose to avoid pulling RouteSchema into this module.
 */
const ContentActionRefSchema = object({
  id: uuid(),
  status: optional(nullable(string())),
  name: optional(nullable(string())),
  web_url: optional(nullable(string())),
  route: optional(nullable(any())),
});

export { ContentActionRefSchema };
export type ContentActionRef = z.infer<typeof ContentActionRefSchema>;
