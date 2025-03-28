import {
  object,
  string,
  array,
  type z,
  optional,
  nullable
} from "zod";

import { RoleSchema, VisibilitySchema } from "./common";
import { ProfileSchema } from "./users";

const OrganizationsSchema = object({
  id: string().uuid(),
  name: string(),
  avatar_path: optional(nullable(string())),
  mission: optional(nullable(string())),
  size: string(),
  email: optional(nullable(string())),
  domain: optional(nullable(string())),
  urls: optional(
    nullable(
      array(
        object({
          value: string(),
        })
      )
    )
  ),
  base_role: RoleSchema.default("write"),
});

const MembershipSchema = object({
  id: string().uuid(),
  user_id: string().uuid(),
  user: optional(nullable(ProfileSchema)),
  org_id: string().uuid(),
  team_id: string().uuid(),
  role: RoleSchema,
  added_at: string().default(() => new Date().toISOString()),
  visibility: VisibilitySchema.default("public"),
});

export { OrganizationsSchema, MembershipSchema };
export type Organization = z.infer<typeof OrganizationsSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
