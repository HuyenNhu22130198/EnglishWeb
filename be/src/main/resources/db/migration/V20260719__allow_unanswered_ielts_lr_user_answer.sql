ALTER TABLE ielts_lr_user_answer
DROP CONSTRAINT IF EXISTS chk_ielts_lr_user_answer_value;

ALTER TABLE ielts_lr_user_answer
ADD CONSTRAINT chk_ielts_lr_user_answer_value
CHECK (
    (
        answered_at IS NULL
        AND selected_option_id IS NULL
        AND NULLIF(BTRIM(selected_option_key), '') IS NULL
        AND NULLIF(BTRIM(answer_text), '') IS NULL
        AND COALESCE(is_correct, FALSE) = FALSE
    )
    OR
    (
        answered_at IS NOT NULL
        AND (
            selected_option_id IS NOT NULL
            OR NULLIF(BTRIM(selected_option_key), '') IS NOT NULL
            OR NULLIF(BTRIM(answer_text), '') IS NOT NULL
        )
    )
);
