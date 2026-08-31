-- M6 postflight performance hardening: add covering indexes only for M6-introduced foreign keys.

create index artisan_payout_accounts_requested_by_idx
  on private.artisan_payout_accounts(requested_by_user_id);
create index artisan_payout_accounts_reviewed_by_idx
  on private.artisan_payout_accounts(reviewed_by_user_id)
  where reviewed_by_user_id is not null;
create index artisan_payout_accounts_superseded_by_idx
  on private.artisan_payout_accounts(superseded_by_account_id)
  where superseded_by_account_id is not null;
create index payout_account_events_actor_idx
  on private.payout_account_events(actor_user_id)
  where actor_user_id is not null;
create index payout_batch_events_actor_idx
  on private.payout_batch_events(actor_user_id)
  where actor_user_id is not null;
create index payout_batch_items_payout_account_idx
  on private.payout_batch_items(payout_account_id);
create index payout_batches_paid_by_idx
  on private.payout_batches(paid_by_user_id)
  where paid_by_user_id is not null;
create index payout_batches_cancelled_by_idx
  on private.payout_batches(cancelled_by_user_id)
  where cancelled_by_user_id is not null;
