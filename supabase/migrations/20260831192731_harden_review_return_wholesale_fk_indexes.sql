create index if not exists customer_reviews_order_id_idx on private.customer_reviews(order_id);
create index if not exists customer_reviews_product_id_idx on private.customer_reviews(product_id) where product_id is not null;
create index if not exists market_return_window_history_changed_by_idx on private.market_return_window_history(changed_by_user_id);
create index if not exists review_artisan_replies_artisan_id_idx on private.review_artisan_replies(artisan_id);
create index if not exists review_events_actor_user_id_idx on private.review_events(actor_user_id) where actor_user_id is not null;
create index if not exists wholesale_requests_closed_by_user_id_idx on private.wholesale_requests(closed_by_user_id) where closed_by_user_id is not null;
create index if not exists wholesale_requests_craft_id_idx on private.wholesale_requests(craft_id) where craft_id is not null;
create index if not exists wholesale_requests_customer_user_id_idx on private.wholesale_requests(customer_user_id) where customer_user_id is not null;
