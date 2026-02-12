import {
  boolean,
  object,
  string,
  array,
  type z,
  optional,
  nullable,
  uuid,
} from "zod";

import { RoleSchema, VisibilitySchema } from "./common";
import { ProfileSchema } from "./users";

const JoinPolicySchema = string().refine(
  (val) => ["invite_only", "request", "open"].includes(val),
  { message: "Invalid join policy" }
);

const MembershipTypeSchema = string().refine(
  (val) => ["internal", "external"].includes(val),
  { message: "Invalid membership type" }
);

const OrganizationsSchema = object({
  id: uuid(),
  name: string(),
  display_name: optional(nullable(string())),
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
  allow_external_members: optional(boolean()).default(false),
  join_policy: optional(JoinPolicySchema).default("invite_only"),
});

const MembershipSchema = object({
  id: uuid(),
  user_id: uuid(),
  user: optional(nullable(ProfileSchema)),
  org_id: uuid(),
  team_id: uuid(),
  role: RoleSchema,
  membership_type: optional(MembershipTypeSchema).default("internal"),
  added_at: string().default(() => new Date().toISOString()),
  visibility: VisibilitySchema.default("public"),
});

export { OrganizationsSchema, MembershipSchema };
export type Organization = z.infer<typeof OrganizationsSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
