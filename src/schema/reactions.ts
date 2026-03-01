import {
    object,
    string,
    uuid,
    boolean,
    type z,
    record,
    any,
    optional,
    nullable
} from "zod";

const reactionSchema = object({
    id: uuid(),
    user_id: uuid(),
    asset_id: uuid(),
    content: record(string(), any()),
    created_at: string(),
    active: optional(nullable(boolean())),
});

export { reactionSchema };
export type Reaction = z.infer<typeof reactionSchema>;