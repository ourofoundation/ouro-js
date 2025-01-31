import { z } from "zod";

import { VisibilitySchema } from "./common";

const authType = z.enum(["Personal Access Token", "None", "OAuth 2.0"]);

const serviceSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  org_id: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  visibility: VisibilitySchema,
  version: z.string().nullable().optional(),
  authentication: authType,
  base_url: z.string(),
  spec_path: z.string(),
  created_at: z.string(),
  last_updated: z.string(),
});

const routeSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  service_id: z.string(),
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  summary: z.string().nullable().optional(),
  parameters: z.array(z.object({}).passthrough()).nullable().optional(),
  request_body: z.object({}).passthrough().nullable().optional(),
  responses: z.array(z.object({}).passthrough()).nullable().optional(),
  security: z.object({}).passthrough().nullable().optional(),
  // created_at: z.string(),
  rate_limit: z.number().nullable().optional(),
  last_updated: z.string(),
});

export { routeSchema, serviceSchema, authType };
export type Service = z.infer<typeof serviceSchema>;
export type Route = z.infer<typeof routeSchema>;
export type AuthType = z.infer<typeof authType>;
