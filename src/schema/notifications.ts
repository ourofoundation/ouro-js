import {
  object,
  string,
  boolean,
  number,
  array,
  any,
  type z,
  enum as zodEnum,
  optional,
  nullable,
  uuid,
  literal,
  discriminatedUnion,
} from "zod";

import { AssetTypeSchema, PriceCurrencySchema } from "./common";
import { ProfileSchema } from "./users";

const NotificationTypeSchema = zodEnum([
  "follow",
  "like",
  "comment",
  "reply",
  "mention",
  "reference",
  "invite",
  "payment",
  "event",
  "share",
  "badge",
  "reaction",
  "deposit",
  "action-complete",
  "action-failed",
  "quest-entry",
  "quest-entry-accepted",
  "quest-entry-eval-failed",
  "onboarding-complete",
  "onboarding-action-required",
  "route-earnings-milestone",
  "route-payout",
  "ownership-transfer",
  "content-moved",
  "content-deleted",
  "other",
]);

/** Stored pointer written when creating a notification. */
const NotificationAssetRefSchema = object({
  assetId: string(),
  assetType: AssetTypeSchema,
});

/**
 * `content.asset` is a ref at write time and a list-row asset after API
 * hydration (which replaces the ref and may attach `parent`).
 */
const NotificationContentAssetSchema = object({
  assetId: optional(string()),
  assetType: optional(AssetTypeSchema),
  id: optional(string()),
  asset_type: optional(AssetTypeSchema),
  name: optional(nullable(string())),
  user_id: optional(string()),
  preview: optional(any()),
  description: optional(any()),
  slug: optional(nullable(string())),
  name_url_slug: optional(nullable(string())),
  org_id: optional(string()),
  parent_id: optional(nullable(string())),
  parent: optional(any()),
  user: optional(any()),
  organization: optional(any()),
  team: optional(any()),
});

const NotificationParentRefSchema = object({
  assetId: string(),
  assetType: AssetTypeSchema,
});

const NotificationRootInfoSchema = object({
  slug: string(),
  assetType: AssetTypeSchema,
});

const NotificationBadgeContentSchema = object({
  name: string(),
  description: optional(nullable(string())),
  slug: optional(nullable(string())),
});

const NotificationQuestRefSchema = object({
  id: string(),
  name: optional(nullable(string())),
});

const NotificationQuestEntryRefSchema = object({
  id: string(),
  asset_id: optional(nullable(string())),
  asset_type: optional(nullable(string())),
  asset_name: optional(nullable(string())),
});

const NotificationContentBase = {
  text: optional(string()),
};

const MentionContentSchema = object({
  ...NotificationContentBase,
  asset: optional(NotificationContentAssetSchema),
  parent: optional(NotificationParentRefSchema),
  root: optional(NotificationRootInfoSchema),
});

const CommentContentSchema = object({
  ...NotificationContentBase,
  asset: optional(NotificationContentAssetSchema),
  parent: optional(NotificationParentRefSchema),
  root: optional(NotificationRootInfoSchema),
});

const ReplyContentSchema = CommentContentSchema;

const ReferenceContentSchema = object({
  ...NotificationContentBase,
  asset: optional(NotificationContentAssetSchema),
  referencedAssetIds: optional(array(string())),
  referencedAssets: optional(array(NotificationAssetRefSchema)),
  referenceCount: optional(number()),
});

const ReactionContentSchema = object({
  ...NotificationContentBase,
  asset: optional(NotificationContentAssetSchema),
  reaction_label: optional(string()),
  reaction_verb: optional(string()),
  aggregate_count: optional(number()),
});

const ShareContentSchema = object({
  ...NotificationContentBase,
  asset: optional(NotificationContentAssetSchema),
});

const OwnershipTransferContentSchema = ShareContentSchema;

const FollowContentSchema = object({
  ...NotificationContentBase,
});

const InviteContentSchema = object({
  ...NotificationContentBase,
  organization: optional(
    object({
      id: string(),
      name: string(),
    })
  ),
  team: optional(
    object({
      id: string(),
      name: string(),
    })
  ),
  kind: optional(
    zodEnum(["added", "join_request", "join_approved", "join_rejected"])
  ),
});

const PaymentContentSchema = object({
  ...NotificationContentBase,
  asset: optional(NotificationContentAssetSchema),
  currency: optional(PriceCurrencySchema),
  value: optional(number()),
});

const DepositContentSchema = object({
  ...NotificationContentBase,
  value: optional(number()),
});

const BadgeContentSchema = object({
  ...NotificationContentBase,
  badge: optional(NotificationBadgeContentSchema),
});

const ActionCompleteContentSchema = object({
  ...NotificationContentBase,
  status: optional(zodEnum(["success", "error", "timed-out"])),
  duration: optional(number()),
  route: optional(
    object({
      id: string(),
      name: optional(nullable(string())),
    })
  ),
});

const ActionFailedContentSchema = ActionCompleteContentSchema;

const QuestEntryContentSchema = object({
  ...NotificationContentBase,
  quest: optional(NotificationQuestRefSchema),
  entry: optional(NotificationQuestEntryRefSchema),
});

const QuestEntryAcceptedContentSchema = object({
  ...NotificationContentBase,
  quest: optional(NotificationQuestRefSchema),
  entry: optional(NotificationQuestEntryRefSchema),
  source: optional(zodEnum(["review", "eval"])),
  reviewer: optional(
    nullable(
      object({
        id: string(),
        username: optional(nullable(string())),
      })
    )
  ),
});

const QuestEntryEvalFailedContentSchema = object({
  ...NotificationContentBase,
  quest: optional(NotificationQuestRefSchema),
  entry: optional(NotificationQuestEntryRefSchema),
  eval_status: optional(zodEnum(["failed", "errored"])),
  eval_score: optional(nullable(number())),
});

const OnboardingCompleteContentSchema = object({
  ...NotificationContentBase,
});

const OnboardingActionRequiredContentSchema = object({
  ...NotificationContentBase,
  requirements: optional(array(string())),
});

const RouteEarningsMilestoneContentSchema = object({
  ...NotificationContentBase,
  milestone_cents: optional(number()),
  total_earnings_cents: optional(number()),
});

const RoutePayoutContentSchema = object({
  ...NotificationContentBase,
  payout_cents: optional(number()),
  gross_cents: optional(number()),
  platform_fee_cents: optional(number()),
  assets: optional(any()),
  asset_names: optional(array(string())),
  invoice_id: optional(string()),
});

const ContentMovedContentSchema = object({
  ...NotificationContentBase,
  team_id: optional(string()),
  team_name: optional(nullable(string())),
  asset_name: optional(nullable(string())),
  asset_type: optional(nullable(string())),
  action: optional(string()),
  reason: optional(nullable(string())),
  moderator_scope: optional(zodEnum(["platform", "team"])),
});

const ContentDeletedContentSchema = ContentMovedContentSchema;

const EventContentSchema = object({
  ...NotificationContentBase,
  event: optional(
    object({
      type: zodEnum(["success", "error"]),
    })
  ),
});

const LikeContentSchema = object({
  ...NotificationContentBase,
  asset: optional(NotificationContentAssetSchema),
});

const OtherContentSchema = object({
  ...NotificationContentBase,
});

const NotificationRowBaseSchema = object({
  id: uuid(),
  source_user_id: uuid(),
  destination_user_id: uuid(),
  org_id: optional(nullable(uuid())),
  asset_id: optional(nullable(uuid())),
  reaction_id: optional(nullable(uuid())),
  action_id: optional(nullable(uuid())),
  parent_asset_id: optional(nullable(uuid())),
  root_asset_id: optional(nullable(uuid())),
  viewed: boolean(),
  created_at: string(),
  last_updated: string(),
  /** Joined on list/read responses. */
  source_user: optional(ProfileSchema.partial()),
  /** Joined `assets` row for `asset_id` (not `content.asset`). */
  asset: optional(NotificationContentAssetSchema),
});

const notificationVariant = <
  T extends z.infer<typeof NotificationTypeSchema>,
  C extends z.ZodType,
>(
  type: T,
  content: C
) =>
  NotificationRowBaseSchema.extend({
    type: literal(type),
    content,
  });

const NotificationSchema = discriminatedUnion("type", [
  notificationVariant("follow", FollowContentSchema),
  notificationVariant("like", LikeContentSchema),
  notificationVariant("comment", CommentContentSchema),
  notificationVariant("reply", ReplyContentSchema),
  notificationVariant("mention", MentionContentSchema),
  notificationVariant("reference", ReferenceContentSchema),
  notificationVariant("invite", InviteContentSchema),
  notificationVariant("payment", PaymentContentSchema),
  notificationVariant("event", EventContentSchema),
  notificationVariant("share", ShareContentSchema),
  notificationVariant("badge", BadgeContentSchema),
  notificationVariant("reaction", ReactionContentSchema),
  notificationVariant("deposit", DepositContentSchema),
  notificationVariant("action-complete", ActionCompleteContentSchema),
  notificationVariant("action-failed", ActionFailedContentSchema),
  notificationVariant("quest-entry", QuestEntryContentSchema),
  notificationVariant("quest-entry-accepted", QuestEntryAcceptedContentSchema),
  notificationVariant(
    "quest-entry-eval-failed",
    QuestEntryEvalFailedContentSchema
  ),
  notificationVariant("onboarding-complete", OnboardingCompleteContentSchema),
  notificationVariant(
    "onboarding-action-required",
    OnboardingActionRequiredContentSchema
  ),
  notificationVariant(
    "route-earnings-milestone",
    RouteEarningsMilestoneContentSchema
  ),
  notificationVariant("route-payout", RoutePayoutContentSchema),
  notificationVariant("ownership-transfer", OwnershipTransferContentSchema),
  notificationVariant("content-moved", ContentMovedContentSchema),
  notificationVariant("content-deleted", ContentDeletedContentSchema),
  notificationVariant("other", OtherContentSchema),
]);

type Notification = z.infer<typeof NotificationSchema>;
type NotificationType = z.infer<typeof NotificationTypeSchema>;
type NotificationOfType<T extends NotificationType> = Extract<
  Notification,
  { type: T }
>;
type NotificationContentAsset = z.infer<typeof NotificationContentAssetSchema>;
type NotificationAssetRef = z.infer<typeof NotificationAssetRefSchema>;

export {
  NotificationSchema,
  NotificationTypeSchema,
  NotificationAssetRefSchema,
  NotificationContentAssetSchema,
  NotificationParentRefSchema,
  NotificationRootInfoSchema,
  MentionContentSchema,
  CommentContentSchema,
  ReplyContentSchema,
  ReferenceContentSchema,
  ReactionContentSchema,
  ShareContentSchema,
  OwnershipTransferContentSchema,
  FollowContentSchema,
  InviteContentSchema,
  PaymentContentSchema,
  DepositContentSchema,
  BadgeContentSchema,
  ActionCompleteContentSchema,
  QuestEntryContentSchema,
  QuestEntryAcceptedContentSchema,
  QuestEntryEvalFailedContentSchema,
  OnboardingCompleteContentSchema,
  OnboardingActionRequiredContentSchema,
  RouteEarningsMilestoneContentSchema,
  RoutePayoutContentSchema,
  ContentMovedContentSchema,
  ContentDeletedContentSchema,
  EventContentSchema,
};
export type {
  Notification,
  NotificationType,
  NotificationOfType,
  NotificationContentAsset,
  NotificationAssetRef,
};
