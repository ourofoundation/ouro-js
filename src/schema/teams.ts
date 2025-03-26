import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { RoleSchema, VisibilitySchema } from "./common";

import { OrganizationsSchema } from "./organizations";
import { ProfileSchema } from "./users";

const TeamSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  organization: OrganizationsSchema,
  name: z.string(),
  description: z.string().nullable().optional(),
  default_role: RoleSchema,
  visibility: VisibilitySchema,
  userMembership: z.object({
    user_id: z.string().uuid(),
    role: RoleSchema,
  }).optional().nullable(),
  memberCount: z.number().optional().nullable(),
  members: z.array(
    z.object({
      user_id: z.string().uuid(),
      role: RoleSchema,
      user: ProfileSchema.partial().optional().nullable(),
    })
  ),
  created_at: z.string(),
});

const CreateTeamSchema = TeamSchema.extend({
  id: z.string().default(() => uuidv7()),
  default_role: RoleSchema.default("write").refine(
    (v) => v === "read" || v === "write"
  ),
  visibility: VisibilitySchema.default("public").refine(
    (v) => v === "public" || v === "organization"
  ),
  created_at: z.string().default(() => new Date().toISOString()),
}).omit({
  organization: true,
  userMembership: true,
  memberCount: true,
  members: true,
  created_at: true,
});

const ReadTeamSchema = TeamSchema.extend({
  userMembership: z
    .object({
      user_id: z.string().uuid(),
      role: RoleSchema,
    })
    .optional()
    .nullable(),
  memberCount: z.number(),
  members: z.array(
    z.object({
      user_id: z.string().uuid(),
      role: RoleSchema,
      user: ProfileSchema.partial().optional().nullable(),
    })
  ),
  organization: OrganizationsSchema.partial().optional().nullable(),
});

const ReadTeamsSchema = z.array(
  ReadTeamSchema.extend({
    label: z.string(),
    value: z.string(),
  })
);

const UpdateTeamSchema = TeamSchema.partial()
  .omit({
    org_id: true,
    organization: true,
    created_at: true,
  })
  .extend({
    id: z.string().uuid(),
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
