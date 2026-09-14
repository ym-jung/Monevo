DO
$$
    BEGIN
        IF EXISTS (SELECT 1
                   FROM transaction t
                   WHERE NOT EXISTS (SELECT 1 FROM journal_entry e WHERE e.id = t.id)) THEN
            RAISE EXCEPTION 'transaction rows have no journal_entry counterpart - V007 backfill incomplete';
        END IF;
    END;
$$;

DROP TABLE transaction;

DROP FUNCTION IF EXISTS transaction_currency_check();
