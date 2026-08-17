-- Forum enhancements: categories, saved posts (bookmarks), reports, notifications.
-- Note: forum_posts / forum_comments / forum_post_likes / forum_comment_likes already exist,
-- created implicitly via spring.jpa.hibernate.ddl-auto=update (no earlier migration tracked them).
-- This migration only adds the new columns/tables introduced by this change so future schema
-- changes for the forum feature can be tracked through Flyway going forward.
--
-- IMPORTANT: flyway-core is not currently a dependency of this project (see pom.xml), so this
-- file is NOT executed automatically today -- schema changes are still applied only through
-- spring.jpa.hibernate.ddl-auto=update. It is kept here as the correct, data-safe version of
-- this change (adds category with a DEFAULT so existing rows backfill instead of failing a
-- NOT NULL check) for whenever Flyway is wired in. Do not assume it has run.

ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'KHAC';

CREATE TABLE IF NOT EXISTS forum_saved_posts (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES forum_posts (id),
    user_id INTEGER NOT NULL REFERENCES users (id),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_forum_saved_posts_post_user UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_reports (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    post_id INTEGER NOT NULL,
    comment_id INTEGER NULL,
    reporter_id INTEGER NOT NULL REFERENCES users (id),
    reason VARCHAR(300) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL REFERENCES users (id),
    type VARCHAR(30) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(300) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
);
