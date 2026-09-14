INSERT INTO journal_entry (id, ledger_id, owner_user_id, kind, entry_date, description, memo,
						created_by_user_id, client_request_id, create_request_hash,
						created_at, created_by, updated_at, updated_by, deleted_at, deleted_by, version)
SELECT t.id,
	t.ledger_id,
	NULL,
	t.type,
	t.transaction_date,
	t.description,
	t.memo,
	t.created_by_user_id,
	t.client_request_id,
	t.create_request_hash,
	t.created_at, t.created_by, t.updated_at, t.updated_by, t.deleted_at, t.deleted_by,
	t.version
FROM transaction t;

INSERT INTO journal_line (id, entry_id, line_no, side, account_id, currency, amount_minor,
						fx_rate, base_amount_minor, fx_rate_source, fx_rate_as_of,
						created_at, created_by, updated_at, updated_by, deleted_at, deleted_by)
SELECT gen_random_uuid(),
	t.id,
	0,
	'DEBIT',
	CASE t.type
		WHEN 'EXPENSE' THEN t.category_id
		WHEN 'INCOME' THEN t.account_id
		ELSE t.counter_account_id
		END,
	t.currency, t.amount_minor, t.fx_rate, t.base_amount_minor, t.fx_rate_source, t.fx_rate_as_of,
	t.created_at, t.created_by, t.updated_at, t.updated_by, t.deleted_at, t.deleted_by
FROM transaction t;

INSERT INTO journal_line (id, entry_id, line_no, side, account_id, currency, amount_minor,
						fx_rate, base_amount_minor, fx_rate_source, fx_rate_as_of,
						created_at, created_by, updated_at, updated_by, deleted_at, deleted_by)
SELECT gen_random_uuid(),
	t.id,
	1,
	'CREDIT',
	CASE t.type
		WHEN 'INCOME' THEN t.category_id
		ELSE t.account_id
		END,
	t.currency, t.amount_minor, t.fx_rate, t.base_amount_minor, t.fx_rate_source, t.fx_rate_as_of,
	t.created_at, t.created_by, t.updated_at, t.updated_by, t.deleted_at, t.deleted_by
FROM transaction t;

INSERT INTO account (id, owner_user_id, name, type, currency, initial_balance_minor,
					memo, sort_order, archived_at, nature, subtype, ledger_id, parent_id, is_system,
					created_at, updated_at, version)
SELECT gen_random_uuid(), u.id, 'Opening balances', NULL, NULL, 0,
	NULL, 0, NULL, 'EQUITY', 'SYSTEM', NULL, NULL, true,
	now(), now(), 0
FROM (SELECT DISTINCT a.owner_user_id AS id
	FROM account a
	WHERE a.subtype = 'REAL'
		AND a.initial_balance_minor <> 0) u;

INSERT INTO journal_entry (id, ledger_id, owner_user_id, kind, entry_date, description, memo,
						created_by_user_id, client_request_id, create_request_hash,
						created_at, updated_at, deleted_at, deleted_by, version)
SELECT gen_random_uuid(), NULL, a.owner_user_id, 'OPENING', a.created_at::date,
	'Opening balance', NULL,
	a.owner_user_id, gen_random_uuid(), 'opening:' || a.id::text,
	a.created_at, a.created_at, a.deleted_at, a.deleted_by, 0
FROM account a
WHERE a.subtype = 'REAL'
	AND a.initial_balance_minor <> 0;

INSERT INTO journal_line (id, entry_id, line_no, side, account_id, currency, amount_minor,
						fx_rate, base_amount_minor, fx_rate_source, fx_rate_as_of,
						created_at, updated_at, deleted_at, deleted_by)
SELECT gen_random_uuid(), e.id, 0,
	CASE WHEN a.initial_balance_minor > 0 THEN 'DEBIT' ELSE 'CREDIT' END,
	a.id, a.currency, abs(a.initial_balance_minor),
	1, abs(a.initial_balance_minor), 'SAME_CURRENCY', NULL,
	a.created_at, a.created_at, a.deleted_at, a.deleted_by
FROM account a
		JOIN journal_entry e ON e.create_request_hash = 'opening:' || a.id::text
WHERE a.subtype = 'REAL'
	AND a.initial_balance_minor <> 0;

INSERT INTO journal_line (id, entry_id, line_no, side, account_id, currency, amount_minor,
						fx_rate, base_amount_minor, fx_rate_source, fx_rate_as_of,
						created_at, updated_at, deleted_at, deleted_by)
SELECT gen_random_uuid(), e.id, 1,
	CASE WHEN a.initial_balance_minor > 0 THEN 'CREDIT' ELSE 'DEBIT' END,
	eq.id, a.currency, abs(a.initial_balance_minor),
	1, abs(a.initial_balance_minor), 'SAME_CURRENCY', NULL,
	a.created_at, a.created_at, a.deleted_at, a.deleted_by
FROM account a
		JOIN journal_entry e ON e.create_request_hash = 'opening:' || a.id::text
		JOIN account eq ON eq.owner_user_id = a.owner_user_id AND eq.subtype = 'SYSTEM'
WHERE a.subtype = 'REAL'
	AND a.initial_balance_minor <> 0;

DROP VIEW v_account_balance;

CREATE VIEW v_account_balance AS
SELECT a.id            AS account_id,
	a.owner_user_id,
	a.currency,
	COALESCE(SUM(CASE WHEN l.side = 'DEBIT' THEN l.amount_minor ELSE -l.amount_minor END), 0)::BIGINT
						AS balance_minor
FROM account a
		LEFT JOIN journal_line l ON l.account_id = a.id AND l.deleted_at IS NULL
		LEFT JOIN journal_entry e ON e.id = l.entry_id AND e.deleted_at IS NULL
WHERE a.deleted_at IS NULL
	AND a.subtype = 'REAL'
GROUP BY a.id, a.owner_user_id, a.currency;

DO
$$
	DECLARE
		mismatch RECORD;
	BEGIN
		FOR mismatch IN
			WITH movement AS (SELECT account_id, -amount_minor AS delta
							FROM transaction
							WHERE deleted_at IS NULL
								AND type IN ('EXPENSE', 'TRANSFER')
							UNION ALL
							SELECT account_id, amount_minor
							FROM transaction
							WHERE deleted_at IS NULL
								AND type = 'INCOME'
							UNION ALL
							SELECT counter_account_id, amount_minor
							FROM transaction
							WHERE deleted_at IS NULL
								AND type = 'TRANSFER'),
				legacy AS (SELECT a.id,
								(a.initial_balance_minor + COALESCE(SUM(m.delta), 0))::BIGINT AS balance_minor
							FROM account a
									LEFT JOIN movement m ON m.account_id = a.id
							WHERE a.deleted_at IS NULL
								AND a.subtype = 'REAL'
							GROUP BY a.id, a.initial_balance_minor)
			SELECT legacy.id, legacy.balance_minor AS before_minor, v.balance_minor AS after_minor
			FROM legacy
					JOIN v_account_balance v ON v.account_id = legacy.id
			WHERE legacy.balance_minor <> v.balance_minor
			LOOP
				RAISE EXCEPTION 'account % balance changed during migration: % -> %',
					mismatch.id, mismatch.before_minor, mismatch.after_minor;
			END LOOP;

		IF EXISTS (SELECT 1
					FROM journal_entry e
							JOIN journal_line l ON l.entry_id = e.id AND l.deleted_at IS NULL
					WHERE e.deleted_at IS NULL
					GROUP BY e.id
					HAVING SUM(CASE WHEN l.side = 'DEBIT' THEN l.base_amount_minor ELSE -l.base_amount_minor END) <> 0) THEN
			RAISE EXCEPTION 'backfill produced unbalanced journal entries (INV-15)';
		END IF;
	END;
$$;
