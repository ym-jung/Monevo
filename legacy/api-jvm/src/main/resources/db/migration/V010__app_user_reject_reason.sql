ALTER TABLE app_user
    ADD COLUMN reject_reason VARCHAR(200);

COMMENT ON COLUMN app_user.reject_reason IS 'Why a sign-up was rejected. NULL unless status is REJECTED (03-5)';
