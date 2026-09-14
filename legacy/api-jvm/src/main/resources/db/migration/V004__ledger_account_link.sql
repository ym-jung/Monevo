CREATE TABLE ledger_account
(
    id         UUID PRIMARY KEY,
    ledger_id  UUID        NOT NULL REFERENCES ledger (id),
    account_id UUID        NOT NULL REFERENCES account (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

CREATE UNIQUE INDEX ux_ledger_account_active
    ON ledger_account (ledger_id, account_id) WHERE deleted_at IS NULL;

CREATE INDEX ix_ledger_account_account
    ON ledger_account (account_id) WHERE deleted_at IS NULL;

CREATE TRIGGER ledger_account_set_updated_at
    BEFORE UPDATE
    ON ledger_account
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO ledger_account (id, ledger_id, account_id, deleted_at, deleted_by)
SELECT gen_random_uuid(),
       a.shared_ledger_id,
       a.id,
       CASE
           WHEN a.deleted_at IS NOT NULL THEN a.deleted_at
           ELSE l.deleted_at
           END,
       CASE
           WHEN a.deleted_at IS NOT NULL THEN a.deleted_by
           ELSE l.deleted_by
           END
FROM account a
         JOIN ledger l ON l.id = a.shared_ledger_id
WHERE a.shared_ledger_id IS NOT NULL;

DO
$$
BEGIN
    IF
EXISTS (SELECT 1
               FROM account a
                        LEFT JOIN ledger_account la
                                  ON la.ledger_id = a.shared_ledger_id
                                      AND la.account_id = a.id
               WHERE a.shared_ledger_id IS NOT NULL
                 AND la.id IS NULL) THEN
        RAISE EXCEPTION 'ledger_account backfill is incomplete';
END IF;
END;
$$;
