import {
    object,
    string,
    boolean,
    type z,
    record,
    any,
    optional,
    nullable
} from "zod";

const reactionSchema = object({
    id: string().uuid(),
    user_id: string().uuid(),
    asset_id: string().uuid(),
    content: record(string(), any()),
    created_at: string(),
    active: optional(nullable(boolean())),
});

export { reactionSchema };
export type Reaction = z.infer<typeof reactionSchema>;