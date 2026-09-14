CREATE TABLE journal_entry
(
	id                  UUID PRIMARY KEY,
	ledger_id           UUID REFERENCES ledger (id),
	owner_user_id       UUID REFERENCES app_user (id),
	kind                VARCHAR(10)  NOT NULL,
	entry_date          DATE         NOT NULL,
	description         VARCHAR(200) NOT NULL,
	memo                TEXT,
	created_by_user_id  UUID         NOT NULL REFERENCES app_user (id),
	client_request_id   UUID         NOT NULL,
	create_request_hash VARCHAR(64)  NOT NULL,
	created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
	created_by          UUID,
	updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
	updated_by          UUID,
	deleted_at          TIMESTAMPTZ,
	deleted_by          UUID,
	version             BIGINT       NOT NULL DEFAULT 0,

	CONSTRAINT ck_entry_kind CHECK (kind IN ('EXPENSE', 'INCOME', 'TRANSFER', 'SPLIT', 'OPENING')),
	CONSTRAINT ck_entry_scope CHECK (num_nonnulls(ledger_id, owner_user_id) = 1)
);

CREATE UNIQUE INDEX ux_entry_creator_client_request
	ON journal_entry (created_by_user_id, client_request_id);
CREATE INDEX ix_entry_ledger_date
	ON journal_entry (ledger_id, entry_date DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX ix_entry_owner
	ON journal_entry (owner_user_id) WHERE deleted_at IS NULL AND owner_user_id IS NOT NULL;

CREATE TRIGGER journal_entry_set_updated_at
	BEFORE UPDATE
	ON journal_entry
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE journal_line
(
	id                UUID PRIMARY KEY,
	entry_id          UUID           NOT NULL REFERENCES journal_entry (id),
	line_no           SMALLINT       NOT NULL,
	side              VARCHAR(6)     NOT NULL,
	account_id        UUID           NOT NULL REFERENCES account (id),
	currency          CHAR(3)        NOT NULL REFERENCES currency (code),
	amount_minor      BIGINT         NOT NULL,
	fx_rate           NUMERIC(18, 8) NOT NULL,
	base_amount_minor BIGINT         NOT NULL,
	fx_rate_source    VARCHAR(15)    NOT NULL,
	fx_rate_as_of     DATE,
	created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
	created_by        UUID,
	updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
	updated_by        UUID,
	deleted_at        TIMESTAMPTZ,
	deleted_by        UUID,

	CONSTRAINT ck_line_side CHECK (side IN ('DEBIT', 'CREDIT')),
	CONSTRAINT ck_line_amount CHECK (amount_minor > 0 AND base_amount_minor > 0),
	CONSTRAINT ck_line_fx_rate CHECK (fx_rate > 0),
	CONSTRAINT ck_line_fx_source CHECK (fx_rate_source IN ('SAME_CURRENCY', 'FX_SERVICE', 'MANUAL', 'DERIVED'))
);

CREATE INDEX ix_line_entry ON journal_line (entry_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_line_account ON journal_line (account_id) WHERE deleted_at IS NULL;

CREATE TRIGGER journal_line_set_updated_at
	BEFORE UPDATE
	ON journal_line
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION journal_line_currency_check() RETURNS trigger AS
$$
DECLARE
	acct          account%ROWTYPE;
	base_currency CHAR(3);
BEGIN
	SELECT * INTO acct FROM account WHERE id = NEW.account_id;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'account % not found', NEW.account_id;
	END IF;

	IF acct.subtype = 'REAL' AND acct.currency IS DISTINCT FROM NEW.currency THEN
		RAISE EXCEPTION 'journal_line.currency(%) must match account.currency(%) (INV-10)',
			NEW.currency, acct.currency;
	END IF;

	SELECT l.currency
	INTO base_currency
	FROM journal_entry e
			LEFT JOIN ledger l ON l.id = e.ledger_id
	WHERE e.id = NEW.entry_id;

	IF base_currency IS NULL THEN
		base_currency := NEW.currency;
	END IF;

	IF base_currency = NEW.currency THEN
		IF NEW.fx_rate <> 1 OR NEW.fx_rate_source <> 'SAME_CURRENCY'
			OR NEW.amount_minor <> NEW.base_amount_minor THEN
			RAISE EXCEPTION 'same-currency line must have fx_rate=1, source=SAME_CURRENCY, amount=base_amount (INV-12)';
		END IF;
	ELSIF NEW.fx_rate_source = 'SAME_CURRENCY' THEN
		RAISE EXCEPTION 'fx_rate_source=SAME_CURRENCY but line currency(%) differs from base currency(%) (INV-12)',
			NEW.currency, base_currency;
	END IF;

	RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_line_currency_guard
	BEFORE INSERT OR UPDATE
	ON journal_line
	FOR EACH ROW EXECUTE FUNCTION journal_line_currency_check();

CREATE OR REPLACE FUNCTION journal_entry_balance_check() RETURNS trigger AS
$$
DECLARE
	target_entry UUID;
	active_lines BIGINT;
	diff         BIGINT;
BEGIN
	IF TG_OP = 'DELETE' THEN
		target_entry := OLD.entry_id;
	ELSE
		target_entry := NEW.entry_id;
	END IF;

	SELECT count(*),
		COALESCE(SUM(CASE WHEN side = 'DEBIT' THEN base_amount_minor ELSE -base_amount_minor END), 0)
	INTO active_lines, diff
	FROM journal_line
	WHERE entry_id = target_entry
		AND deleted_at IS NULL;

	IF active_lines > 0 AND diff <> 0 THEN
		RAISE EXCEPTION 'journal entry % is unbalanced by % (INV-15)', target_entry, diff;
	END IF;

	RETURN NULL;
END
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER journal_entry_balance_guard
	AFTER INSERT OR UPDATE OR DELETE
	ON journal_line
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW EXECUTE FUNCTION journal_entry_balance_check();
