ALTER TABLE account
	DROP COLUMN initial_balance_minor;

DROP INDEX IF EXISTS ix_account_shared;
ALTER TABLE account
	DROP COLUMN shared_ledger_id;

ALTER TABLE transaction
	DROP CONSTRAINT transaction_category_id_fkey;

DROP TABLE category;
DROP FUNCTION IF EXISTS category_hierarchy_check();

