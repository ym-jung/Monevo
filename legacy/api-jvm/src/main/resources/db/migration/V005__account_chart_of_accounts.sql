ALTER TABLE account
	ADD COLUMN nature    VARCHAR(10),
	ADD COLUMN subtype   VARCHAR(10),
	ADD COLUMN ledger_id UUID REFERENCES ledger (id),
	ADD COLUMN parent_id UUID REFERENCES account (id),
	ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false;

UPDATE account
SET nature  = CASE WHEN type = 'CREDIT_CARD' THEN 'LIABILITY' ELSE 'ASSET' END,
	subtype = 'REAL';

ALTER TABLE account
	ALTER COLUMN nature SET NOT NULL,
	ALTER COLUMN subtype SET NOT NULL,
	ALTER COLUMN owner_user_id DROP NOT NULL,
	ALTER COLUMN currency DROP NOT NULL,
	ALTER COLUMN type DROP NOT NULL;

ALTER TABLE account
	ADD CONSTRAINT ck_account_nature CHECK (nature IN ('ASSET', 'LIABILITY', 'EQUITY', 'EXPENSE', 'INCOME')),
	ADD CONSTRAINT ck_account_subtype CHECK (subtype IN ('REAL', 'CATEGORY', 'SYSTEM')),
	ADD CONSTRAINT ck_account_nature_subtype CHECK (
		(subtype = 'REAL' AND nature IN ('ASSET', 'LIABILITY'))
			OR (subtype = 'CATEGORY' AND nature IN ('EXPENSE', 'INCOME'))
			OR (subtype = 'SYSTEM' AND nature = 'EQUITY')
		),
	ADD CONSTRAINT ck_account_shape CHECK (
		(subtype = 'REAL'
			AND owner_user_id IS NOT NULL AND currency IS NOT NULL AND type IS NOT NULL
			AND ledger_id IS NULL AND parent_id IS NULL)
			OR
		(subtype = 'CATEGORY'
			AND ledger_id IS NOT NULL
			AND owner_user_id IS NULL AND currency IS NULL AND type IS NULL)
			OR
		(subtype = 'SYSTEM'
			AND owner_user_id IS NOT NULL
			AND currency IS NULL AND type IS NULL AND ledger_id IS NULL AND parent_id IS NULL)
		);

DROP INDEX ux_account_owner_name;
CREATE UNIQUE INDEX ux_account_owner_name
	ON account (owner_user_id, LOWER(name))
	WHERE deleted_at IS NULL AND subtype = 'REAL';

CREATE UNIQUE INDEX ux_account_category_sibling
	ON account (ledger_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name))
	WHERE deleted_at IS NULL AND subtype = 'CATEGORY';

CREATE UNIQUE INDEX ux_account_system_owner
	ON account (owner_user_id)
	WHERE deleted_at IS NULL AND subtype = 'SYSTEM';

CREATE INDEX ix_account_ledger ON account (ledger_id) WHERE deleted_at IS NULL AND ledger_id IS NOT NULL;
CREATE INDEX ix_account_parent ON account (parent_id) WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION account_hierarchy_check() RETURNS trigger AS
$$
DECLARE
	parent_row account%ROWTYPE;
BEGIN
	IF NEW.parent_id IS NULL THEN
		RETURN NEW;
	END IF;

	IF NEW.parent_id = NEW.id THEN
		RAISE EXCEPTION 'account cannot be its own parent';
	END IF;

	SELECT * INTO parent_row FROM account WHERE id = NEW.parent_id;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'parent account % not found', NEW.parent_id;
	END IF;
	IF parent_row.parent_id IS NOT NULL THEN
		RAISE EXCEPTION 'category depth must be <= 2 (INV-06)';
	END IF;
	IF parent_row.ledger_id IS DISTINCT FROM NEW.ledger_id THEN
		RAISE EXCEPTION 'parent category belongs to another ledger (INV-06)';
	END IF;
	IF parent_row.nature <> NEW.nature THEN
		RAISE EXCEPTION 'child category nature must match parent (INV-06)';
	END IF;

	RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_hierarchy_guard
	BEFORE INSERT OR UPDATE
	ON account
	FOR EACH ROW EXECUTE FUNCTION account_hierarchy_check();

INSERT INTO account (id, owner_user_id, name, type, currency, initial_balance_minor,
					memo, sort_order, archived_at, nature, subtype, ledger_id, parent_id, is_system,
					created_at, created_by, updated_at, updated_by, deleted_at, deleted_by, version)
SELECT c.id,
	NULL, c.name, NULL, NULL, 0,
	NULL, c.sort_order, NULL,
	CASE c.kind WHEN 'EXPENSE' THEN 'EXPENSE' ELSE 'INCOME' END,
	'CATEGORY', c.ledger_id, NULL, c.is_system,
	c.created_at, c.created_by, c.updated_at, c.updated_by, c.deleted_at, c.deleted_by, 0
FROM category c
WHERE c.parent_id IS NULL;

INSERT INTO account (id, owner_user_id, name, type, currency, initial_balance_minor,
					memo, sort_order, archived_at, nature, subtype, ledger_id, parent_id, is_system,
					created_at, created_by, updated_at, updated_by, deleted_at, deleted_by, version)
SELECT c.id,
	NULL, c.name, NULL, NULL, 0,
	NULL, c.sort_order, NULL,
	CASE c.kind WHEN 'EXPENSE' THEN 'EXPENSE' ELSE 'INCOME' END,
	'CATEGORY', c.ledger_id, c.parent_id, c.is_system,
	c.created_at, c.created_by, c.updated_at, c.updated_by, c.deleted_at, c.deleted_by, 0
FROM category c
WHERE c.parent_id IS NOT NULL;

DO
$$
	DECLARE
		src_count BIGINT;
		dst_count BIGINT;
	BEGIN
		SELECT count(*) INTO src_count FROM category;
		SELECT count(*) INTO dst_count FROM account WHERE subtype = 'CATEGORY';
		IF src_count <> dst_count THEN
			RAISE EXCEPTION 'category promotion is incomplete: % source rows, % promoted', src_count, dst_count;
		END IF;

		IF EXISTS (SELECT 1
					FROM account child
							JOIN account parent ON parent.id = child.parent_id
					WHERE child.subtype = 'CATEGORY'
						AND (parent.parent_id IS NOT NULL
						OR parent.ledger_id IS DISTINCT FROM child.ledger_id
						OR parent.nature <> child.nature)) THEN
			RAISE EXCEPTION 'promoted category tree violates INV-06';
		END IF;
	END;
$$;
