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
  uuid,
  record,
  any,
} from "zod";

const ActorTypeSchema = zodEnum(["base", "agent", "verified"]);

const LanguageToolProviderPreferenceSchema = object({
  route_id: nullable(uuid()),
  options: record(string(), any()),
}).catchall(any());

const SpeechProviderPreferenceSchema =
  LanguageToolProviderPreferenceSchema.extend({
    voice: nullable(string()),
  });

const LanguageToolsPreferencesSchema = object({
  language: string(),
  translation: LanguageToolProviderPreferenceSchema,
  speech: SpeechProviderPreferenceSchema,
  transcription: optional(LanguageToolProviderPreferenceSchema),
}).catchall(any());

const PreferencesSchema = object({
  id: uuid(),
  user_id: uuid(),
  notifications: optional(record(string(), any())),
  webhooks: optional(array(record(string(), any()))),
  onboarding: optional(record(string(), any())),
  language_tools: optional(nullable(LanguageToolsPreferencesSchema)),
}).catchall(any());

const ProfileSchema = object({
  id: uuid(),
  user_id: uuid(),
  username: optional(nullable(string())),
  name: optional(nullable(string())),
  first_name: optional(nullable(string())),
  last_name: optional(nullable(string())),
  avatar_path: optional(nullable(string())),
  bio: optional(nullable(string())),
  is_provisioned: optional(boolean()),
  claimed_at: optional(nullable(string())),
  urls: optional(
    array(
      object({
        value: string().url(),
      }),
    ),
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
  is_provisioned: true,
  claimed_at: true,
  actor_type: true,
  // username: true, // once set, users cannot update their username
});

export {
  ActorTypeSchema,
  LanguageToolsPreferencesSchema,
  PreferencesSchema,
  ProfileSchema,
  ReadProfileSchema,
  UpdateProfileSchema,
};
export type ActorType = z.infer<typeof ActorTypeSchema>;
export type LanguageToolsPreferences = z.infer<
  typeof LanguageToolsPreferencesSchema
>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type ReadProfile = z.infer<typeof ReadProfileSchema>;
