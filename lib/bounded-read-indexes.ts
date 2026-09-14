export type BoundedReadIndex = {
  readonly collection: string;
  readonly name: string;
  readonly keys: Readonly<Record<string, 1 | -1>>;
};

export const BOUNDED_READ_INDEXES: readonly BoundedReadIndex[] = [
  { collection: 'users', name: 'idx_users_created_id', keys: { createdAt: -1, _id: -1 } },
  {
    collection: 'users',
    name: 'idx_users_role_created_id',
    keys: { role: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'consultations',
    name: 'idx_consultations_created_id',
    keys: { createdAt: -1, _id: -1 },
  },
  {
    collection: 'consultations',
    name: 'idx_consultations_status_created_id',
    keys: { status: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'consultations',
    name: 'idx_consultations_staff_created_id',
    keys: { assignedStaffId: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'consultations',
    name: 'idx_consultations_user_created_id',
    keys: { userEmail: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'adminLogs',
    name: 'idx_admin_logs_timestamp_id',
    keys: { timestamp: -1, _id: -1 },
  },
  {
    collection: 'adminLogs',
    name: 'idx_admin_logs_admin_timestamp_id',
    keys: { adminId: 1, timestamp: -1, _id: -1 },
  },
  {
    collection: 'adminLogs',
    name: 'idx_admin_logs_action_timestamp_id',
    keys: { action: 1, timestamp: -1, _id: -1 },
  },
  {
    collection: 'adminLogs',
    name: 'idx_admin_logs_severity_timestamp_id',
    keys: { severity: 1, timestamp: -1, _id: -1 },
  },
  {
    collection: 'customerCards',
    name: 'idx_customer_cards_created_id',
    keys: { createdAt: -1, _id: -1 },
  },
  {
    collection: 'customerCards',
    name: 'idx_customer_cards_staff_created_id',
    keys: { assignedStaffId: 1, createdAt: -1, _id: -1 },
  },
  { collection: 'expert-examiners', name: 'idx_examiners_name_id', keys: { name: 1, _id: 1 } },
  {
    collection: 'expert-examiners',
    name: 'idx_examiners_published_order_id',
    keys: { isPublished: 1, sortOrder: 1, _id: 1 },
  },
  { collection: 'experts', name: 'idx_experts_name_id', keys: { name: 1, _id: 1 } },
  {
    collection: 'experts',
    name: 'idx_experts_active_order_id',
    keys: { isActive: 1, order: 1, _id: 1 },
  },
  {
    collection: 'policynewsposts',
    name: 'idx_policy_news_draft_created_id',
    keys: { isDraft: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'policynewsposts',
    name: 'idx_policy_news_main_draft_created_id',
    keys: { isMain: 1, isDraft: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'policyanalysisposts',
    name: 'idx_policy_analysis_created_id',
    keys: { createdAt: -1, _id: -1 },
  },
  {
    collection: 'policyanalysisposts',
    name: 'idx_policy_analysis_category_created_id',
    keys: { category: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'policyanalysisposts',
    name: 'idx_policy_analysis_views_id',
    keys: { views: -1, _id: -1 },
  },
  {
    collection: 'shorts',
    name: 'idx_shorts_active_order_id',
    keys: { isActive: 1, sortOrder: 1, _id: 1 },
  },
  {
    collection: 'naraddontubeentries',
    name: 'idx_tube_published_order_id',
    keys: { isPublished: 1, sortOrder: 1, _id: 1 },
  },
  {
    collection: 'ttontokposts',
    name: 'idx_ttontok_draft_created_id',
    keys: { isDraft: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'ttontokposts',
    name: 'idx_ttontok_archived_created_id',
    keys: { isArchived: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'ttontokposts',
    name: 'idx_ttontok_archived_category_created_id',
    keys: { isArchived: 1, category: 1, createdAt: -1, _id: -1 },
  },
  {
    collection: 'ttontokposts',
    name: 'idx_ttontok_archived_likes_id',
    keys: { isArchived: 1, likeCount: -1, _id: -1 },
  },
  {
    collection: 'ttontokposts',
    name: 'idx_ttontok_archived_replies_id',
    keys: { isArchived: 1, replyCount: -1, _id: -1 },
  },
  { collection: 'ddontalks', name: 'idx_ddontalk_created_id', keys: { createdAt: -1, _id: -1 } },
  { collection: 'ddontalks', name: 'idx_ddontalk_likes_id', keys: { likes: -1, _id: -1 } },
  {
    collection: 'businessvoiceinterviewvideos',
    name: 'idx_interview_video_published_order_id',
    keys: { isPublished: 1, sortOrder: 1, _id: 1 },
  },
  {
    collection: 'page-visits',
    name: 'idx_page_visits_timestamp_id',
    keys: { timestamp: -1, _id: -1 },
  },
  {
    collection: 'page-visits',
    name: 'idx_page_visits_session_timestamp_id',
    keys: { sessionId: 1, timestamp: -1, _id: -1 },
  },
  {
    collection: 'page-visits',
    name: 'idx_page_visits_path_timestamp_id',
    keys: { pathname: 1, timestamp: -1, _id: -1 },
  },
  {
    collection: 'conversions',
    name: 'idx_conversions_timestamp_id',
    keys: { timestamp: -1, _id: -1 },
  },
  {
    collection: 'conversions',
    name: 'idx_conversions_type_timestamp_id',
    keys: { conversionType: 1, timestamp: -1, _id: -1 },
  },
  {
    collection: 'conversions',
    name: 'idx_conversions_session_timestamp_id',
    keys: { sessionId: 1, timestamp: -1, _id: -1 },
  },
  {
    collection: 'examinerblacklists',
    name: 'idx_examiner_blacklist_registered_id',
    keys: { registeredAt: -1, _id: -1 },
  },
] as const;
