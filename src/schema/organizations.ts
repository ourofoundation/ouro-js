import { z } from "zod";

import { RoleSchema, VisibilitySchema } from "./common";

const OrganizationsSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
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

type Organization = z.infer<typeof OrganizationsSchema>;
type Membership = z.infer<typeof MembershipSchema>;

export {
  OrganizationsSchema,
  MembershipSchema,
  type Organization,
  type Membership,
};
