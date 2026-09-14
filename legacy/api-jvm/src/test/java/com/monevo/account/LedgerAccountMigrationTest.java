package com.monevo.account;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
class LedgerAccountMigrationTest {

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
		DockerImageName.parse("postgres:16-alpine"));

	@Test
	void v004BackfillsLegacyLinksAndPreservesSoftDeletion() throws Exception {
		Flyway.configure()
			.dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
			.target(MigrationVersion.fromVersion("3"))
			.load()
			.migrate();

		UUID userId = UUID.randomUUID();
		UUID activeLedgerId = UUID.randomUUID();
		UUID deletedLedgerId = UUID.randomUUID();
		UUID activeAccountId = UUID.randomUUID();
		UUID deletedAccountId = UUID.randomUUID();
		UUID deletedLedgerAccountId = UUID.randomUUID();
		UUID privateAccountId = UUID.randomUUID();
		UUID accountDeletedBy = UUID.randomUUID();
		UUID ledgerDeletedBy = UUID.randomUUID();
		Instant accountDeletedAt = Instant.parse("2026-08-01T01:02:03Z");
		Instant ledgerDeletedAt = Instant.parse("2026-08-02T04:05:06Z");

		try (Connection connection = connection()) {
			insertFixtures(connection, userId, activeLedgerId, deletedLedgerId, activeAccountId,
				deletedAccountId, deletedLedgerAccountId, privateAccountId, accountDeletedBy,
				ledgerDeletedBy, accountDeletedAt, ledgerDeletedAt);
		}

		Flyway.configure()
			.dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
			.load()
			.migrate();

		try (Connection connection = connection()) {
			Map<UUID, MigratedLink> links = migratedLinks(connection);

			assertThat(links).hasSize(3).doesNotContainKey(privateAccountId);
			assertThat(links.get(activeAccountId).deletedAt()).isNull();
			assertThat(links.get(deletedAccountId))
				.isEqualTo(new MigratedLink(activeLedgerId, accountDeletedAt, accountDeletedBy));
			assertThat(links.get(deletedLedgerAccountId))
				.isEqualTo(new MigratedLink(deletedLedgerId, ledgerDeletedAt, ledgerDeletedBy));
		}
	}

	private static Connection connection() throws Exception {
		return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
	}

	private static void insertFixtures(Connection connection, UUID userId, UUID activeLedgerId,
								UUID deletedLedgerId, UUID activeAccountId, UUID deletedAccountId,
								UUID deletedLedgerAccountId, UUID privateAccountId, UUID accountDeletedBy,
								UUID ledgerDeletedBy, Instant accountDeletedAt, Instant ledgerDeletedAt) throws Exception {
		try (var user = connection.prepareStatement("""
			INSERT INTO app_user
			(id, cognito_sub, email, email_normalized, display_name, status, display_currency)
			VALUES (?, ?, 'migration@test.local', 'migration@test.local', 'migration', 'ACTIVE', 'JPY')
			""")) {
			user.setObject(1, userId);
			user.setObject(2, UUID.randomUUID());
			user.executeUpdate();
		}

		try (var ledger = connection.prepareStatement("""
			INSERT INTO ledger (id, name, currency, owner_user_id, deleted_at, deleted_by)
			VALUES (?, ?, 'JPY', ?, ?, ?)
			""")) {
			insertLedger(ledger, activeLedgerId, "active", userId, null, null);
			insertLedger(ledger, deletedLedgerId, "deleted", userId, ledgerDeletedAt, ledgerDeletedBy);
		}

		try (var account = connection.prepareStatement("""
			INSERT INTO account
			(id, owner_user_id, name, type, currency, shared_ledger_id, deleted_at, deleted_by)
			VALUES (?, ?, ?, 'BANK', 'JPY', ?, ?, ?)
			""")) {
			insertAccount(account, activeAccountId, userId, "active", activeLedgerId, null, null);
			insertAccount(account, deletedAccountId, userId, "deleted account", activeLedgerId,
				accountDeletedAt, accountDeletedBy);
			insertAccount(account, deletedLedgerAccountId, userId, "deleted ledger", deletedLedgerId,
				null, null);
			insertAccount(account, privateAccountId, userId, "private", null, null, null);
		}
	}

	private static void insertLedger(java.sql.PreparedStatement statement, UUID id, String name,
								UUID ownerId, Instant deletedAt, UUID deletedBy) throws Exception {
		statement.setObject(1, id);
		statement.setString(2, name);
		statement.setObject(3, ownerId);
		statement.setTimestamp(4, deletedAt == null ? null : Timestamp.from(deletedAt));
		statement.setObject(5, deletedBy);
		statement.executeUpdate();
	}

	private static void insertAccount(java.sql.PreparedStatement statement, UUID id, UUID ownerId,
								String name, UUID ledgerId, Instant deletedAt, UUID deletedBy) throws Exception {
		statement.setObject(1, id);
		statement.setObject(2, ownerId);
		statement.setString(3, name);
		statement.setObject(4, ledgerId);
		statement.setTimestamp(5, deletedAt == null ? null : Timestamp.from(deletedAt));
		statement.setObject(6, deletedBy);
		statement.executeUpdate();
	}

	private static Map<UUID, MigratedLink> migratedLinks(Connection connection) throws Exception {
		Map<UUID, MigratedLink> result = new HashMap<>();
		try (var statement = connection.createStatement();
			ResultSet rows = statement.executeQuery("""
				SELECT ledger_id, account_id, deleted_at, deleted_by
				FROM ledger_account
				""")) {
			while (rows.next()) {
				result.put(rows.getObject("account_id", UUID.class), new MigratedLink(
					rows.getObject("ledger_id", UUID.class),
					rows.getTimestamp("deleted_at") == null ? null : rows.getTimestamp("deleted_at").toInstant(),
					rows.getObject("deleted_by", UUID.class)));
			}
		}
		return result;
	}

	private record MigratedLink(UUID ledgerId, Instant deletedAt, UUID deletedBy) {
	}
}
