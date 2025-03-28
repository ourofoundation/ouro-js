import { uuidv7 } from "uuidv7";
import {
  object,
  string,
  number,
  array,
  type z,
  optional,
  nullable
} from "zod";

import { RoleSchema, VisibilitySchema } from "./common";
import { OrganizationsSchema } from "./organizations";
import { ProfileSchema } from "./users";

const TeamSchema = object({
  id: string().uuid(),
  org_id: string().uuid(),
  organization: OrganizationsSchema,
  name: string(),
  description: optional(nullable(string())),
  default_role: RoleSchema,
  visibility: VisibilitySchema,
  userMembership: optional(
    nullable(
      object({
        user_id: string().uuid(),
        role: RoleSchema,
      })
    )
  ),
  memberCount: optional(nullable(number())),
  members: array(
    object({
      user_id: string().uuid(),
      role: RoleSchema,
      user: optional(nullable(ProfileSchema.partial())),
    })
  ),
  created_at: string(),
});

const CreateTeamSchema = TeamSchema.extend({
  id: string().default(() => uuidv7()),
  default_role: RoleSchema.default("write").refine(
    (v) => v === "read" || v === "write"
  ),
  visibility: VisibilitySchema.default("public").refine(
    (v) => v === "public" || v === "organization"
  ),
  created_at: string().default(() => new Date().toISOString()),
}).omit({
  organization: true,
  userMembership: true,
  memberCount: true,
  members: true,
  created_at: true,
});

const ReadTeamSchema = TeamSchema.extend({
  userMembership: optional(
    nullable(
      object({
        user_id: string().uuid(),
        role: RoleSchema,
      })
    )
  ),
  memberCount: number(),
  members: array(
    object({
      user_id: string().uuid(),
      role: RoleSchema,
      user: optional(nullable(ProfileSchema.partial())),
    })
  ),
  organization: optional(nullable(OrganizationsSchema.partial())),
});

const ReadTeamsSchema = array(
  ReadTeamSchema.extend({
    label: string(),
    value: string(),
  })
);

const UpdateTeamSchema = TeamSchema.partial()
  .omit({
    org_id: true,
    organization: true,
    created_at: true,
  })
  .extend({
    id: string().uuid(),
  });

export {
  TeamSchema,
  CreateTeamSchema,
  ReadTeamSchema,
  ReadTeamsSchema,
  UpdateTeamSchema,
};
export type Team = z.infer<typeof TeamSchema>;
export type CreateTeam = z.infer<typeof CreateTeamSchema>;
export type ReadTeam = z.infer<typeof ReadTeamSchema>;
export type ReadTeams = z.infer<typeof ReadTeamsSchema>;
export type UpdateTeam = z.infer<typeof UpdateTeamSchema>;
