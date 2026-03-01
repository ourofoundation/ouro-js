import {
  object,
  string,
  number,
  array,
  boolean,
  enum as zodEnum,
  type z,
  optional,
  nullable,
  uuid
} from "zod";

const ActorTypeSchema = zodEnum(["base", "agent", "verified"]);

const ProfileSchema = object({
  id: uuid(),
  user_id: uuid(),
  username: optional(nullable(string())),
  name: optional(nullable(string())),
  avatar_path: optional(nullable(string())),
  bio: optional(nullable(string())),
  urls: optional(
    array(
      object({
        value: string().url(),
      })
    )
  ),
  post_id: optional(nullable(uuid())),
  actor_type: ActorTypeSchema,
  plan_type: zodEnum(["free", "gold"]),
  last_active: string(),
});

const ReadProfileSchema = ProfileSchema.extend({
  isFollowing: boolean(),
  isFollowed: boolean(),
  isSelf: boolean(),
  followers: number().default(0),
  following: number().default(0),
  totalXp: number().default(0),
  level: number().default(1),
});

const UpdateProfileSchema = ProfileSchema.partial().omit({
  id: true,
  user_id: true,
  last_active: true,
  // username: true, // once set, users cannot update their username
});

export { ActorTypeSchema, ProfileSchema, ReadProfileSchema, UpdateProfileSchema };
export type ActorType = z.infer<typeof ActorTypeSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type ReadProfile = z.infer<typeof ReadProfileSchema>;
