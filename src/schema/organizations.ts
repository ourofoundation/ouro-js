import { z } from "zod";

import { RoleSchema, VisibilitySchema } from "./common";

const OrganizationsSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  avatar_path: z.string().nullable().optional(),
  mission: z.string().nullable().optional(),
  size: z.string(),
  email: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  urls: z
    .array(
      z.object({
        value: z.string(),
      })
    )
    .nullable()
    .optional(),
  base_role: RoleSchema.default("write"),
});

const MembershipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: z.string().uuid(),
  team_id: z.string().uuid(),
  role: RoleSchema,
  added_at: z.string().default(() => new Date().toISOString()),
  visibility: VisibilitySchema.default("public"),
});

export { OrganizationsSchema, MembershipSchema };
export type Organization = z.infer<typeof OrganizationsSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
