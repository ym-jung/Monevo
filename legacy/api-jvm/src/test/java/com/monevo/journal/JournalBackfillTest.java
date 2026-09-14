package com.monevo.journal;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class JournalBackfillTest {
	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("postgres:16-alpine"));

	private static final UUID USER = UUID.randomUUID();
	private static final UUID LEDGER = UUID.randomUUID();
	private static final UUID SALARY = UUID.randomUUID();
	private static final UUID CARD = UUID.randomUUID();
	private static final UUID FOOD = UUID.randomUUID();
	private static final UUID DINING = UUID.randomUUID();
	private static final UUID PAY = UUID.randomUUID();
	private static final UUID EXPENSE_TXN = UUID.randomUUID();
	private static final UUID INCOME_TXN = UUID.randomUUID();
	private static final UUID TRANSFER_TXN = UUID.randomUUID();
	private static final UUID DELETED_TXN = UUID.randomUUID();

	@Test
	@DisplayName("single-entry rows come out the other side as balanced journal entries")
	void singleEntryDataSurvivesTheMigration() throws Exception {
		migrateTo("4");

		try (Connection connection = connection()) {
			seedSingleEntryData(connection);
		}

		migrateAll();

		try (Connection connection = connection(); Statement statement = connection.createStatement()) {
			assertThat(scalar(statement, """
				SELECT count(*) FROM account
				WHERE subtype = 'CATEGORY' AND id IN ('%s', '%s', '%s')
				""".formatted(FOOD, DINING, PAY))).isEqualTo(3);
			assertThat(scalar(statement, """
				SELECT count(*) FROM account WHERE id = '%s' AND parent_id = '%s' AND nature = 'EXPENSE'
				""".formatted(DINING, FOOD))).isEqualTo(1);

			assertThat(scalar(statement, "SELECT count(*) FROM journal_entry WHERE kind <> 'OPENING'"))
				.isEqualTo(4);
			assertThat(scalar(statement, """
				SELECT count(*) FROM journal_entry WHERE id = '%s' AND deleted_at IS NOT NULL
				""".formatted(DELETED_TXN))).isEqualTo(1);
			assertThat(scalar(statement, """
				SELECT count(*) FROM journal_line WHERE entry_id = '%s' AND deleted_at IS NOT NULL
				""".formatted(DELETED_TXN))).isEqualTo(2);

			assertThat(scalar(statement, """
				SELECT count(*) FROM journal_line
				WHERE entry_id = '%s' AND side = 'DEBIT' AND account_id = '%s'
				""".formatted(EXPENSE_TXN, DINING))).isEqualTo(1);
			assertThat(scalar(statement, """
				SELECT count(*) FROM journal_line
				WHERE entry_id = '%s' AND side = 'CREDIT' AND account_id = '%s'
				""".formatted(INCOME_TXN, PAY))).isEqualTo(1);
			assertThat(scalar(statement, """
				SELECT count(*) FROM journal_line
				WHERE entry_id = '%s' AND side = 'DEBIT' AND account_id = '%s'
				""".formatted(TRANSFER_TXN, CARD))).isEqualTo(1);

			assertThat(scalar(statement, "SELECT count(*) FROM account WHERE subtype = 'SYSTEM'")).isEqualTo(1);
			assertThat(scalar(statement, """
				SELECT count(*) FROM journal_entry WHERE kind = 'OPENING' AND ledger_id IS NULL
				AND owner_user_id = '%s'
				""".formatted(USER))).isEqualTo(1);

			assertThat(scalar(statement, """
				SELECT balance_minor FROM v_account_balance WHERE account_id = '%s'
				""".formatted(SALARY))).isEqualTo(981_000);
			assertThat(scalar(statement, """
				SELECT balance_minor FROM v_account_balance WHERE account_id = '%s'
				""".formatted(CARD))).isEqualTo(7_000);

			assertThat(scalar(statement, """
				SELECT count(*) FROM (
					SELECT e.id FROM journal_entry e
					JOIN journal_line l ON l.entry_id = e.id AND l.deleted_at IS NULL
					WHERE e.deleted_at IS NULL
					GROUP BY e.id
					HAVING SUM(CASE WHEN l.side = 'DEBIT' THEN l.base_amount_minor
						ELSE -l.base_amount_minor END) <> 0) unbalanced
				""")).isZero();

			assertThat(scalar(statement, """
				SELECT count(*) FROM information_schema.tables WHERE table_name = 'transaction'
				""")).isZero();
			assertThat(scalar(statement, """
				SELECT count(*) FROM information_schema.columns
				WHERE table_name = 'account' AND column_name = 'initial_balance_minor'
				""")).isZero();
			assertThat(scalar(statement, """
				SELECT count(*) FROM information_schema.tables WHERE table_name = 'category'
				""")).isZero();
		}
	}

	private static void migrateTo(String version) {
		Flyway.configure()
			.dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
			.target(MigrationVersion.fromVersion(version))
			.load()
			.migrate();
	}

	private static void migrateAll() {
		Flyway.configure()
			.dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
			.load()
			.migrate();
	}

	private static Connection connection() throws Exception {
		return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
	}

	private static long scalar(Statement statement, String sql) throws Exception {
		try (ResultSet rows = statement.executeQuery(sql)) {
			assertThat(rows.next()).as(sql).isTrue();
			return rows.getLong(1);
		}
	}

	private static void seedSingleEntryData(Connection connection) throws Exception {
		try (Statement statement = connection.createStatement()) {
			statement.executeUpdate("""
				INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name, status, display_currency)
				VALUES ('%s', '%s', 'backfill@test.local', 'backfill@test.local', 'backfill', 'ACTIVE', 'JPY')
				""".formatted(USER, UUID.randomUUID()));

			statement.executeUpdate("""
				INSERT INTO ledger (id, name, currency, owner_user_id) VALUES ('%s', '우리집', 'JPY', '%s')
				""".formatted(LEDGER, USER));

			statement.executeUpdate("""
				INSERT INTO account (id, owner_user_id, name, type, currency, initial_balance_minor)
				VALUES ('%s', '%s', '월급통장', 'BANK', 'JPY', 750000),
					('%s', '%s', 'JCB', 'CREDIT_CARD', 'JPY', 0)
				""".formatted(SALARY, USER, CARD, USER));

			statement.executeUpdate("""
				INSERT INTO category (id, ledger_id, parent_id, name, kind) VALUES
					('%s', '%s', NULL, '식비', 'EXPENSE'),
					('%s', '%s', '%s', '외식', 'EXPENSE'),
					('%s', '%s', NULL, '급여', 'INCOME')
				""".formatted(FOOD, LEDGER, DINING, LEDGER, FOOD, PAY, LEDGER));

			insertTransaction(statement, EXPENSE_TXN, "EXPENSE", SALARY, null, DINING, 12_000, false);
			insertTransaction(statement, INCOME_TXN, "INCOME", SALARY, null, PAY, 250_000, false);
			insertTransaction(statement, TRANSFER_TXN, "TRANSFER", SALARY, CARD, null, 7_000, false);
			insertTransaction(statement, DELETED_TXN, "EXPENSE", CARD, null, DINING, 4_000, true);
		}
	}

	private static void insertTransaction(Statement statement, UUID id, String type, UUID accountId,
										UUID counterAccountId, UUID categoryId, long amountMinor,
										boolean deleted) throws Exception {
		statement.executeUpdate("""
			INSERT INTO transaction
				(id, ledger_id, type, transaction_date, account_id, counter_account_id, category_id,
				currency, amount_minor, fx_rate, base_amount_minor, fx_rate_source, description,
				created_by_user_id, client_request_id, create_request_hash, deleted_at)
			VALUES ('%s', '%s', '%s', DATE '2026-08-05', '%s', %s, %s,
				'JPY', %d, 1, %d, 'SAME_CURRENCY', '%s',
				'%s', '%s', 'legacy:%s', %s)
			""".formatted(id, LEDGER, type, accountId,
			counterAccountId == null ? "NULL" : "'" + counterAccountId + "'",
			categoryId == null ? "NULL" : "'" + categoryId + "'",
			amountMinor, amountMinor, type.toLowerCase(),
			USER, UUID.randomUUID(), id,
			deleted ? "TIMESTAMPTZ '2026-08-20T00:00:00Z'" : "NULL"));
	}
}
