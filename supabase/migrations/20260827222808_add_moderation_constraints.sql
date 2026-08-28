alter table public.moderation_requests
add constraint moderation_requests_subject_type_check
check (
  subject_type in (
    'product',
    'promotion',
    'video',
    'review_reply',
    'artisan_craft_change',
    'payout_details_change'
  )
);

alter table public.moderation_requests
add constraint moderation_requests_action_check
check (
  action in (
    'create',
    'update',
    'publish'
  )
);