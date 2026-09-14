CREATE
OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
	NEW.updated_at
:= now();
RETURN NEW;
END $$
LANGUAGE plpgsql;

CREATE TABLE currency
(
    code                 CHAR(3) PRIMARY KEY,
    name_ko              VARCHAR(50) NOT NULL,
    name_ja              VARCHAR(50) NOT NULL,
    name_en              VARCHAR(50) NOT NULL,
    symbol               VARCHAR(8)  NOT NULL,
    minor_unit_exponent  SMALLINT    NOT NULL DEFAULT 0,
    yfinance_symbol_base VARCHAR(20),
    is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order           SMALLINT    NOT NULL DEFAULT 0,
    CONSTRAINT ck_currency_exponent CHECK (minor_unit_exponent BETWEEN 0 AND 4)
);

COMMENT
ON COLUMN currency.minor_unit_exponent IS 'Minor unit. JPY/KRW=0, USD=2';

INSERT INTO currency (code, name_ko, name_ja, name_en, symbol, minor_unit_exponent, yfinance_symbol_base, sort_order)
VALUES ('USD', '미국 달러', '米ドル', 'US Dollar', '$', 2, NULL, 1),
       ('KRW', '대한민국 원', '韓国ウォン', 'South Korean Won', '₩', 0, 'KRW=X', 2),
       ('JPY', '일본 엔', '日本円', 'Japanese Yen', '¥', 0, 'JPY=X', 3);

CREATE TABLE app_user
(
    id                  UUID PRIMARY KEY,
    cognito_sub         UUID         NOT NULL,
    email               VARCHAR(255) NOT NULL,
    email_normalized    VARCHAR(255) NOT NULL,
    display_name        VARCHAR(60)  NOT NULL,
    role                VARCHAR(20)  NOT NULL DEFAULT 'USER',
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    approved_by_user_id UUID REFERENCES app_user (id),
    display_currency    CHAR(3)      NOT NULL REFERENCES currency (code),
    locale              VARCHAR(10)  NOT NULL DEFAULT 'en',
    timezone            VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    last_login_at       TIMESTAMPTZ,
    cognito_synced_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by          UUID,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          UUID,
    deleted_at          TIMESTAMPTZ,
    deleted_by          UUID,
    version             BIGINT       NOT NULL DEFAULT 0,

    CONSTRAINT ck_user_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT ck_user_status CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'DELETED')),
    CONSTRAINT ck_user_locale CHECK (locale IN ('ko', 'ja', 'en'))
);

CREATE UNIQUE INDEX ux_user_email ON app_user (email_normalized) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_user_cognito ON app_user (cognito_sub);
CREATE INDEX ix_user_status ON app_user (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_user_updated
    BEFORE UPDATE
    ON app_user
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE ledger
(
    id            UUID PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    currency      CHAR(3)      NOT NULL DEFAULT 'USD' REFERENCES currency (code),
    owner_user_id UUID REFERENCES app_user (id),
    timezone      VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by    UUID,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by    UUID,
    deleted_at    TIMESTAMPTZ,
    deleted_by    UUID,
    version       BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX ix_ledger_owner ON ledger (owner_user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_ledger_updated
    BEFORE UPDATE
    ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE
OR REPLACE FUNCTION ledger_currency_immutable() RETURNS trigger AS
$$
BEGIN
    IF
OLD.currency IS DISTINCT FROM NEW.currency THEN
        RAISE EXCEPTION 'ledger.currency is immutable (INV-03): old=%, new=%',
            OLD.currency, NEW.currency;
END IF;
RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER ledger_currency_guard
    BEFORE UPDATE
    ON ledger
    FOR EACH ROW
    EXECUTE FUNCTION ledger_currency_immutable();

CREATE TABLE ledger_invite
(
    id                 UUID PRIMARY KEY,
    ledger_id          UUID        NOT NULL REFERENCES ledger (id),
    code               VARCHAR(12) NOT NULL,
    created_by_user_id UUID        NOT NULL REFERENCES app_user (id),
    expires_at         TIMESTAMPTZ NOT NULL,
    max_uses           SMALLINT    NOT NULL DEFAULT 1,
    used_count         SMALLINT    NOT NULL DEFAULT 0,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_invite_uses CHECK (max_uses > 0 AND used_count >= 0 AND used_count <= max_uses)
);

CREATE UNIQUE INDEX ux_invite_code ON ledger_invite (code);
CREATE INDEX ix_invite_ledger ON ledger_invite (ledger_id);

CREATE TABLE ledger_member
(
    id                   UUID PRIMARY KEY,
    ledger_id            UUID        NOT NULL REFERENCES ledger (id),
    user_id              UUID        NOT NULL REFERENCES app_user (id),
    role                 VARCHAR(10) NOT NULL,
    joined_via_invite_id UUID REFERENCES ledger_invite (id),
    joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by           UUID,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by           UUID,
    deleted_at           TIMESTAMPTZ,
    deleted_by           UUID,
    CONSTRAINT ck_member_role CHECK (role IN ('OWNER', 'MEMBER'))
);

CREATE UNIQUE INDEX ux_member_ledger_user ON ledger_member (ledger_id, user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_member_single_owner ON ledger_member (ledger_id) WHERE role = 'OWNER' AND deleted_at IS NULL;
CREATE INDEX ix_member_user ON ledger_member (user_id) WHERE deleted_at IS NULL;
CREATE TRIGGER ledger_member_set_updated_at
    BEFORE UPDATE
    ON ledger_member
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE account
(
    id                    UUID PRIMARY KEY,
    owner_user_id         UUID        NOT NULL REFERENCES app_user (id),
    name                  VARCHAR(50) NOT NULL,
    type                  VARCHAR(20) NOT NULL,
    currency              CHAR(3)     NOT NULL REFERENCES currency (code),
    shared_ledger_id      UUID REFERENCES ledger (id),
    initial_balance_minor BIGINT      NOT NULL DEFAULT 0,
    memo                  VARCHAR(200),
    sort_order            SMALLINT    NOT NULL DEFAULT 0,
    archived_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by            UUID,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by            UUID,
    deleted_at            TIMESTAMPTZ,
    deleted_by            UUID,
    version               BIGINT      NOT NULL DEFAULT 0,
    CONSTRAINT ck_account_type CHECK (type IN ('BANK', 'CASH', 'E_MONEY', 'CREDIT_CARD'))
);

CREATE UNIQUE INDEX ux_account_owner_name ON account (owner_user_id, LOWER(name)) WHERE deleted_at IS NULL;
CREATE INDEX ix_account_owner ON account (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_account_shared ON account (shared_ledger_id) WHERE deleted_at IS NULL AND shared_ledger_id IS NOT NULL;

CREATE TRIGGER account_set_updated_at
    BEFORE UPDATE
    ON account
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE
OR REPLACE FUNCTION account_currency_immutable() RETURNS trigger AS $$
BEGIN
	IF
NEW.currency IS DISTINCT FROM OLD.currency THEN
		RAISE EXCEPTION 'account.currency is immutable (INV-04)';
END IF;
RETURN NEW;
END $$
LANGUAGE plpgsql;

CREATE TRIGGER account_currency_guard
    BEFORE UPDATE
    ON account
    FOR EACH ROW EXECUTE FUNCTION account_currency_immutable();

CREATE TABLE category
(
    id         UUID PRIMARY KEY,
    ledger_id  UUID        NOT NULL REFERENCES ledger (id),
    parent_id  UUID REFERENCES category (id),
    name       VARCHAR(40) NOT NULL,
    kind       VARCHAR(10) NOT NULL,
    sort_order SMALLINT    NOT NULL DEFAULT 0,
    is_system  BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    CONSTRAINT ck_category_kind CHECK (kind IN ('EXPENSE', 'INCOME'))
);

CREATE UNIQUE INDEX ux_category_sibling_name
    ON category (ledger_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name)) WHERE deleted_at IS NULL;
CREATE INDEX ix_category_ledger ON category (ledger_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_category_parent ON category (parent_id) WHERE deleted_at IS NULL AND parent_id IS NOT NULL;

CREATE TRIGGER category_set_updated_at
    BEFORE UPDATE
    ON category
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE
OR REPLACE FUNCTION category_hierarchy_check() RETURNS trigger AS $$
DECLARE
parent_row category%ROWTYPE;
BEGIN
	IF
NEW.parent_id IS NULL THEN
		RETURN NEW;
END IF;

	IF
NEW.parent_id = NEW.id THEN
		RAISE EXCEPTION 'category cannot be its own parent';
END IF;

SELECT *
INTO parent_row
FROM category
WHERE id = NEW.parent_id;
IF
NOT FOUND THEN
		RAISE EXCEPTION 'parent category % not found', NEW.parent_id;
END IF;
	IF
parent_row.parent_id IS NOT NULL THEN
		RAISE EXCEPTION 'category depth must be <= 2 (INV-06)';
END IF;
	IF
parent_row.ledger_id <> NEW.ledger_id THEN
		RAISE EXCEPTION 'parent category belongs to another ledger (INV-06)';
END IF;
	IF
parent_row.kind <> NEW.kind THEN
		RAISE EXCEPTION 'child category kind must match parent (INV-06)';
END IF;

RETURN NEW;
END $$
LANGUAGE plpgsql;

CREATE TRIGGER category_hierarchy_guard
    BEFORE INSERT OR
UPDATE ON category
    FOR EACH ROW EXECUTE FUNCTION category_hierarchy_check();

CREATE TABLE transaction
(
    id                 UUID PRIMARY KEY,
    ledger_id          UUID           NOT NULL REFERENCES ledger (id),
    type               VARCHAR(10)    NOT NULL,
    transaction_date   DATE           NOT NULL,
    account_id         UUID           NOT NULL REFERENCES account (id),
    counter_account_id UUID REFERENCES account (id),
    category_id        UUID REFERENCES category (id),
    currency           CHAR(3)        NOT NULL REFERENCES currency (code),
    amount_minor       BIGINT         NOT NULL,
    fx_rate            NUMERIC(18, 8) NOT NULL,
    base_amount_minor  BIGINT         NOT NULL,
    fx_rate_source     VARCHAR(15)    NOT NULL,
    fx_rate_as_of      DATE,
    description        VARCHAR(200)   NOT NULL,
    memo               TEXT,
    created_by_user_id UUID           NOT NULL REFERENCES app_user (id),
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by         UUID,
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_by         UUID,
    deleted_at         TIMESTAMPTZ,
    deleted_by         UUID,
    version            BIGINT         NOT NULL DEFAULT 0,

    CONSTRAINT ck_txn_type CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
    CONSTRAINT ck_txn_fx_source CHECK (fx_rate_source IN ('SAME_CURRENCY', 'FX_SERVICE', 'MANUAL')),
    CONSTRAINT ck_txn_amount CHECK (amount_minor > 0 AND base_amount_minor > 0),
    CONSTRAINT ck_txn_fx_rate CHECK (fx_rate > 0),

    CONSTRAINT ck_txn_shape CHECK (
        (type IN ('EXPENSE', 'INCOME')
            AND counter_account_id IS NULL
            AND category_id IS NOT NULL)
            OR
        (type = 'TRANSFER'
            AND category_id IS NULL
            AND counter_account_id IS NOT NULL
            AND counter_account_id <> account_id)
        )
);

CREATE INDEX ix_txn_ledger_date ON transaction (ledger_id, transaction_date DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX ix_txn_account ON transaction (account_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_txn_counter ON transaction (counter_account_id) WHERE deleted_at IS NULL AND counter_account_id IS NOT NULL;
CREATE INDEX ix_txn_category ON transaction (category_id) WHERE deleted_at IS NULL AND category_id IS NOT NULL;

CREATE TRIGGER transaction_set_updated_at
    BEFORE UPDATE
    ON transaction
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE
OR REPLACE FUNCTION transaction_currency_check() RETURNS trigger AS $$
DECLARE
acct_currency    CHAR(3);
	counter_currency
CHAR(3);
	ledger_currency
CHAR(3);
BEGIN
SELECT currency
INTO acct_currency
FROM account
WHERE id = NEW.account_id;
IF
acct_currency IS DISTINCT FROM NEW.currency THEN
		RAISE EXCEPTION 'transaction.currency(%) must match account.currency(%) (INV-10)',
			NEW.currency, acct_currency;
END IF;

	IF
NEW.type = 'TRANSFER' THEN
SELECT currency
INTO counter_currency
FROM account
WHERE id = NEW.counter_account_id;
IF
counter_currency IS DISTINCT FROM NEW.currency THEN
			RAISE EXCEPTION 'cross-currency transfer is not supported in MVP: % -> % (INV-11)',
				NEW.currency, counter_currency;
END IF;
END IF;

SELECT currency
INTO ledger_currency
FROM ledger
WHERE id = NEW.ledger_id;
IF
ledger_currency = NEW.currency THEN
		IF NEW.fx_rate <> 1 OR NEW.fx_rate_source <> 'SAME_CURRENCY' OR NEW.amount_minor <> NEW.base_amount_minor THEN
			RAISE EXCEPTION 'same-currency transaction must have fx_rate=1, source=SAME_CURRENCY, amount=base_amount (INV-12)';
END IF;
	ELSIF
NEW.fx_rate_source = 'SAME_CURRENCY' THEN
		RAISE EXCEPTION 'fx_rate_source=SAME_CURRENCY but currency(%) differs from ledger currency(%) (INV-12)',
			NEW.currency, ledger_currency;
END IF;

RETURN NEW;
END $$
LANGUAGE plpgsql;

CREATE TRIGGER transaction_currency_guard
    BEFORE INSERT OR
UPDATE ON transaction
    FOR EACH ROW EXECUTE FUNCTION transaction_currency_check();

CREATE TABLE fx_rate
(
    base       CHAR(3)        NOT NULL REFERENCES currency (code),
    quote      CHAR(3)        NOT NULL REFERENCES currency (code),
    rate_date  DATE           NOT NULL,
    rate       NUMERIC(18, 8) NOT NULL,
    source     VARCHAR(20)    NOT NULL,
    fetched_at TIMESTAMPTZ    NOT NULL DEFAULT now(),
    PRIMARY KEY (base, quote, rate_date),
    CONSTRAINT ck_fx_rate_positive CHECK (rate > 0),
    CONSTRAINT ck_fx_rate_different CHECK (base <> quote)
);

CREATE VIEW v_account_balance AS
WITH movement AS (
    SELECT account_id AS account_id, -amount_minor AS delta
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
      AND type = 'TRANSFER')
SELECT a.id AS account_id,
       a.owner_user_id,
       a.shared_ledger_id,
       a.currency,
       (a.initial_balance_minor + COALESCE(SUM(m.delta), 0)) ::BIGINT AS balance_minor
FROM account a
         LEFT JOIN movement m ON m.account_id = a.id
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.owner_user_id, a.shared_ledger_id, a.currency, a.initial_balance_minor;
