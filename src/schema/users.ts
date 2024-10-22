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

type Profile = z.infer<typeof ProfileSchema>;
type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
type ReadProfile = z.infer<typeof ReadProfileSchema>;

export {
  ProfileSchema,
  ReadProfileSchema,
  UpdateProfileSchema,
  type Profile,
  type UpdateProfile,
  type ReadProfile,
};