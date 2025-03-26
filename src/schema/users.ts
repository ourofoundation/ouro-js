import { z } from "zod";

const ProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  username: z.string().optional().nullable(),
  avatar_path: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  urls: z
    .array(
      z.object({
        value: z.string().url(),
      })
    )
    .optional(),
  post_id: z.string().uuid().optional().nullable(),
  is_agent: z.boolean(),
  plan_type: z.enum(["free", "gold"]),
  last_active: z.string(),
});

const ReadProfileSchema = ProfileSchema.extend({
  is_agent: z.boolean(),
  isFollowing: z.boolean(),
  isFollowed: z.boolean(),
  isSelf: z.boolean(),
  followers: z.number().default(0),
  following: z.number().default(0),
});

const UpdateProfileSchema = ProfileSchema.partial().omit({
  id: true,
  user_id: true,
  last_active: true,
  // username: true, // once set, users cannot update their username
});
// .extend({
//   user_id: z.string().uuid(),
// })

export { ProfileSchema, ReadProfileSchema, UpdateProfileSchema };
export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type ReadProfile = z.infer<typeof ReadProfileSchema>;
