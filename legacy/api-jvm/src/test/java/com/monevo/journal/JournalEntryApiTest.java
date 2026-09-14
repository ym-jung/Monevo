package com.monevo.journal;

import com.monevo.account.entity.Account;
import com.monevo.account.repository.AccountRepository;
import com.monevo.account.repository.LedgerAccountRepository;
import com.monevo.config.TestJwtFactory;
import com.monevo.fx.client.FxQuote;
import com.monevo.fx.client.FxServiceClient;
import com.monevo.fx.repository.FxRateRepository;
import com.monevo.journal.repository.JournalEntryRepository;
import com.monevo.journal.repository.JournalLineRepository;
import com.monevo.ledger.repository.LedgerInviteRepository;
import com.monevo.ledger.repository.LedgerMemberRepository;
import com.monevo.ledger.repository.LedgerRepository;
import com.monevo.support.IntegrationTest;
import com.monevo.user.entity.AppUser;
import com.monevo.user.repository.AppUserRepository;
import com.monevo.user.service.AppUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

@IntegrationTest
class JournalEntryApiTest {
	private static final String ISSUER =
		"https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_testPool0";
	private static final String CLIENT_ID = "test-client-id";
	private static final String JOURNAL = "/api/v1/journal-entries";

	@Autowired
	RestTestClient client;
	@Autowired
	ObjectMapper objectMapper;
	@Autowired
	JournalEntryRepository journalEntryRepository;
	@Autowired
	JournalLineRepository journalLineRepository;
	@Autowired
	AccountRepository accountRepository;
	@Autowired
	LedgerAccountRepository ledgerAccountRepository;
	@Autowired
	LedgerInviteRepository ledgerInviteRepository;
	@Autowired
	LedgerMemberRepository ledgerMemberRepository;
	@Autowired
	LedgerRepository ledgerRepository;
	@Autowired
	FxRateRepository fxRateRepository;
	@Autowired
	AppUserRepository appUserRepository;
	@Autowired
	AppUserService appUserService;

	@MockitoBean
	FxServiceClient fxServiceClient;

	private String me;
	private String other;
	private UUID shared;
	private UUID personal;
	private UUID salary;
	private UUID jcb;
	private UUID usd;
	private UUID otherPrivate;
	private UUID dining;
	private UUID groceries;
	private UUID payday;

	@BeforeEach
	void setUp() {
		wipe();

		UUID mySub = UUID.randomUUID();
		UUID otherSub = UUID.randomUUID();
		appUserRepository.save(activeUser(mySub, "me"));
		appUserRepository.save(activeUser(otherSub, "other"));
		appUserService.evictAll();
		me = TestJwtFactory.accessToken(mySub, ISSUER, CLIENT_ID);
		other = TestJwtFactory.accessToken(otherSub, ISSUER, CLIENT_ID);

		shared = createLedger(me, "우리집");
		personal = createLedger(me, "나 개인");
		joinLedger(other, shared);

		salary = createAccount(me, "내 월급통장", "BANK", "JPY", shared, 750_000);
		jcb = createAccount(me, "공용 JCB", "CREDIT_CARD", "JPY", shared, 0);
		usd = createAccount(me, "미국 계좌", "BANK", "USD", personal, 100_000);
		otherPrivate = createAccount(other, "other 비상금", "BANK", "JPY", null, 0);

		dining = leaf(shared, "외식");
		groceries = leaf(shared, "장보기");
		payday = createCategory(me, shared, "월급", null, "INCOME");
	}

	@Test
	@DisplayName("a two line expense comes back with both sides and the kind the server derived")
	void twoLineExpense() {
		JsonNode entry = entry(me, shared, "2026-08-05", "8월 전기요금",
			line("DEBIT", dining, 12_000), line("CREDIT", salary, 12_000));

		assertThat(entry.at("/data/kind").asString()).isEqualTo("EXPENSE");
		assertThat(entry.at("/data/baseCurrency").asString()).isEqualTo("JPY");
		assertThat(entry.at("/data/baseAmountMinor").asLong()).isEqualTo(12_000);
		assertThat(entry.at("/data/lines").size()).isEqualTo(2);
		assertThat(entry.at("/data/lines/0/side").asString()).isEqualTo("DEBIT");
		assertThat(entry.at("/data/lines/0/account/subtype").asString()).isEqualTo("CATEGORY");
		assertThat(entry.at("/data/lines/0/account/parentName").asString()).isEqualTo("식비");
		assertThat(entry.at("/data/lines/0/fxRateSource").asString()).isEqualTo("SAME_CURRENCY");
		assertThat(entry.at("/data/lines/1/account/subtype").asString()).isEqualTo("REAL");
		assertThat(entry.at("/data/lines/1/currency").asString()).isEqualTo("JPY");

		assertThat(balanceOf(salary)).isEqualTo(738_000);
	}

	@Test
	@DisplayName("income lands on the account and a transfer touches no category")
	void incomeAndTransfer() {
		entry(me, shared, "2026-08-25", "8월 급여", line("DEBIT", salary, 250_000), line("CREDIT", payday, 250_000));
		JsonNode card = entry(me, shared, "2026-08-08", "주말 외식",
			line("DEBIT", dining, 7_000), line("CREDIT", jcb, 7_000));
		JsonNode move = entry(me, shared, "2026-08-10", "JCB 카드값",
			line("DEBIT", jcb, 7_000), line("CREDIT", salary, 7_000));

		assertThat(card.at("/data/kind").asString()).isEqualTo("EXPENSE");
		assertThat(move.at("/data/kind").asString()).isEqualTo("TRANSFER");

		assertThat(balanceOf(salary)).isEqualTo(750_000 + 250_000 - 7_000);
		assertThat(balanceOf(jcb)).isZero();
	}

	@Test
	@DisplayName("an opening balance is an entry, and it is what the balance starts from")
	void openingBalanceIsAnEntry() {
		assertThat(balanceOf(salary)).isEqualTo(750_000);

		assertThat(list(me, shared).at("/data/items")).isEmpty();
	}

	@Test
	@DisplayName("each leg of a split carries its own note")
	void splitLinesKeepTheirOwnMemo() {
		JsonNode entry = json(post(me, JOURNAL, """
			{"ledgerId":"%s","entryDate":"2026-08-06","description":"다이소","lines":[
			{"side":"DEBIT","accountId":"%s","amountMinor":1200,"memo":"저녁"},
			{"side":"DEBIT","accountId":"%s","amountMinor":800,"memo":"세제"},
			{"side":"CREDIT","accountId":"%s","amountMinor":2000}]}
			""".formatted(shared, dining, groceries, jcb)).expectStatus().isCreated());

		assertThat(entry.at("/data/lines/0/memo").asString()).isEqualTo("저녁");
		assertThat(entry.at("/data/lines/1/memo").asString()).isEqualTo("세제");
		assertThat(entry.at("/data/lines/2/memo").isNull()).isTrue();
	}

	@Test
	@DisplayName("one receipt splits across two categories and still balances")
	void splitAcrossCategories() {
		JsonNode entry = entry(me, shared, "2026-08-06", "마트",
			line("DEBIT", dining, 1_200), line("DEBIT", groceries, 800), line("CREDIT", jcb, 2_000));

		assertThat(entry.at("/data/kind").asString()).isEqualTo("EXPENSE");
		assertThat(entry.at("/data/lines").size()).isEqualTo(3);
		assertThat(entry.at("/data/baseAmountMinor").asLong()).isEqualTo(2_000);
		assertThat(balanceOf(jcb)).isEqualTo(-2_000);

		JsonNode row = list(me, shared).at("/data/items/0");
		assertThat(row.at("/lineCount").asInt()).isEqualTo(3);

		assertThat(row.at("/primaryAccount/name").asString()).isEqualTo("공용 JCB");

		assertThat(row.at("/counterAccount").isNull()).isTrue();
	}

	@Test
	@DisplayName("a foreign line converts once and the split is carved out of that total")
	void foreignSplitConvertsOnce() {
		stubRate("150");
		UUID subscription = leaf(personal, "구독 서비스");
		UUID hobby = leaf(personal, "취미");

		JsonNode entry = entry(me, personal, "2026-08-11", "미국 결제",
			line("DEBIT", subscription, 1_200), line("DEBIT", hobby, 800), line("CREDIT", usd, 2_000));

		assertThat(entry.at("/data/baseAmountMinor").asLong()).isEqualTo(3_000);
		long debit = entry.at("/data/lines/0/baseAmountMinor").asLong()
			+ entry.at("/data/lines/1/baseAmountMinor").asLong();
		assertThat(debit).isEqualTo(3_000);
	}

	@Test
	@DisplayName("a cross-currency transfer balances by pinning the base currency side")
	void crossCurrencyTransfer() {
		stubRate("150");
		UUID jpyPrivate = createAccount(me, "엔화 통장", "BANK", "JPY", personal, 0);

		JsonNode entry = entry(me, personal, "2026-08-12", "달러 환전",
			line("DEBIT", jpyPrivate, 15_000), line("CREDIT", usd, 10_000));

		assertThat(entry.at("/data/kind").asString()).isEqualTo("TRANSFER");
		assertThat(entry.at("/data/baseAmountMinor").asLong()).isEqualTo(15_000);
		assertThat(balanceOf(jpyPrivate)).isEqualTo(15_000);
		assertThat(balanceOf(usd)).isEqualTo(100_000 - 10_000);

		assertThat(entry.at("/data/lines/0/fxRateSource").asString()).isEqualTo("SAME_CURRENCY");
		assertThat(entry.at("/data/lines/1/baseAmountMinor").asLong()).isEqualTo(15_000);
	}

	@Test
	@DisplayName("debits and credits that do not add up are a 400, not a commit-time crash")
	void unbalancedIsRejected() {
		post(me, JOURNAL, body(shared, "2026-08-05", "안 맞음",
			line("DEBIT", dining, 1_000), line("CREDIT", salary, 2_000)))
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.code").isEqualTo("JOURNAL_ENTRY_UNBALANCED");
	}

	@Test
	@DisplayName("one-sided and self-referential entries are refused")
	void shapeIsChecked() {
		post(me, JOURNAL, body(shared, "2026-08-05", "차변만",
			line("DEBIT", dining, 1_000), line("DEBIT", groceries, 1_000)))
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.code").isEqualTo("JOURNAL_ENTRY_SHAPE_INVALID");

		post(me, JOURNAL, body(shared, "2026-08-05", "자기 자신",
			line("DEBIT", salary, 1_000), line("CREDIT", salary, 1_000)))
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.code").isEqualTo("JOURNAL_LINE_DUPLICATE_ACCOUNT");

		post(me, JOURNAL, body(shared, "2026-08-05", "한 줄",
			line("DEBIT", dining, 1_000)))
			.expectStatus().isBadRequest();
	}

	@Test
	@DisplayName("someone else's private account is not usable, and neither is a foreign category")
	void accessIsChecked() {
		post(me, JOURNAL, body(shared, "2026-08-05", "남의 통장",
			line("DEBIT", dining, 1_000), line("CREDIT", otherPrivate, 1_000)))
			.expectStatus().isForbidden()
			.expectBody().jsonPath("$.error.code").isEqualTo("ACCOUNT_NOT_ACCESSIBLE");

		UUID personalCategory = leaf(personal, "구독 서비스");
		post(me, JOURNAL, body(shared, "2026-08-05", "남의 가계부 분류",
			line("DEBIT", personalCategory, 1_000), line("CREDIT", salary, 1_000)))
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.code").isEqualTo("CATEGORY_LEDGER_MISMATCH");
	}

	@Test
	@DisplayName("a parent category holds nothing - only leaves do (INV-07)")
	void parentCategoryIsRefused() {
		UUID food = accountRepository.findById(dining).orElseThrow().getParentId();

		post(me, JOURNAL, body(shared, "2026-08-05", "대분류에 직접",
			line("DEBIT", food, 1_000), line("CREDIT", salary, 1_000)))
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.code").isEqualTo("CATEGORY_NOT_LEAF");
	}

	@Test
	@DisplayName("an archived account stops taking new entries")
	void archivedAccountIsRefused() {
		JsonNode account = json(client.get().uri("/api/v1/accounts/" + jcb)
			.header("Authorization", "Bearer " + me).exchange().expectStatus().isOk());
		patch(me, "/api/v1/accounts/" + jcb,
			"{\"archived\":true,\"version\":%d}".formatted(account.at("/data/version").asLong()))
			.expectStatus().isOk();

		post(me, JOURNAL, body(shared, "2026-08-05", "보관된 카드",
			line("DEBIT", dining, 1_000), line("CREDIT", jcb, 1_000)))
			.expectStatus().isEqualTo(409)
			.expectBody().jsonPath("$.error.code").isEqualTo("ACCOUNT_ARCHIVED");
	}

	@Test
	@DisplayName("the same idempotency key replays instead of writing twice")
	void idempotentReplay() {
		UUID key = UUID.randomUUID();
		String payload = body(key, shared, "2026-08-05", "점심",
			line("DEBIT", dining, 1_000), line("CREDIT", salary, 1_000));

		UUID first = idOf(json(post(me, JOURNAL, payload).expectStatus().isCreated()));
		UUID replayed = idOf(json(post(me, JOURNAL, payload).expectStatus().isCreated()));

		assertThat(replayed).isEqualTo(first);
		assertThat(list(me, shared).at("/data/items").size()).isEqualTo(1);

		post(me, JOURNAL, body(key, shared, "2026-08-05", "점심",
			line("DEBIT", dining, 2_000), line("CREDIT", salary, 2_000)))
			.expectStatus().isEqualTo(409)
			.expectBody().jsonPath("$.error.code").isEqualTo("TRANSACTION_IDEMPOTENCY_KEY_REUSED");
	}

	@Test
	@DisplayName("an update replaces the whole line set and re-prices it")
	void updateReplacesLines() {
		JsonNode created = entry(me, shared, "2026-08-05", "점심",
			line("DEBIT", dining, 1_000), line("CREDIT", salary, 1_000));
		UUID id = idOf(created);

		JsonNode updated = json(patch(me, JOURNAL + "/" + id, """
			{"description":"점심 (정정)","version":%d,"lines":[%s,%s,%s]}
			""".formatted(created.at("/data/version").asLong(),
			line("DEBIT", dining, 600), line("DEBIT", groceries, 400), line("CREDIT", salary, 1_000)))
			.expectStatus().isOk());

		assertThat(updated.at("/data/kind").asString()).isEqualTo("EXPENSE");
		assertThat(updated.at("/data/lines").size()).isEqualTo(3);
		assertThat(updated.at("/data/description").asString()).isEqualTo("점심 (정정)");
		assertThat(balanceOf(salary)).isEqualTo(749_000);

		assertThat(journalLineRepository.findByEntryIdAndDeletedAtIsNullOrderByLineNoAsc(id)).hasSize(3);
	}

	@Test
	@DisplayName("a stale version loses")
	void staleUpdateIsRejected() {
		UUID id = idOf(entry(me, shared, "2026-08-05", "점심",
			line("DEBIT", dining, 1_000), line("CREDIT", salary, 1_000)));

		patch(me, JOURNAL + "/" + id, "{\"description\":\"뭐라도\",\"version\":99}")
			.expectStatus().isEqualTo(409)
			.expectBody().jsonPath("$.error.code").isEqualTo("CONCURRENT_MODIFICATION");
	}

	@Test
	@DisplayName("deleting an entry takes its lines out of the balance")
	void deleteRemovesTheLines() {
		UUID id = idOf(entry(me, shared, "2026-08-05", "점심",
			line("DEBIT", dining, 1_000), line("CREDIT", salary, 1_000)));
		assertThat(balanceOf(salary)).isEqualTo(749_000);

		client.delete().uri(JOURNAL + "/" + id).header("Authorization", "Bearer " + me)
			.exchange().expectStatus().isNoContent();

		assertThat(balanceOf(salary)).isEqualTo(750_000);
		assertThat(list(me, shared).at("/data/items")).isEmpty();
	}

	@Test
	@DisplayName("an account with only an opening balance can still be deleted")
	void openingBalanceDoesNotPinAnAccount() {
		UUID spare = createAccount(me, "여분 통장", "CASH", "JPY", null, 5_000);

		client.delete().uri("/api/v1/accounts/" + spare).header("Authorization", "Bearer " + me)
			.exchange().expectStatus().isNoContent();

		entry(me, shared, "2026-08-05", "점심", line("DEBIT", dining, 1_000), line("CREDIT", salary, 1_000));
		client.delete().uri("/api/v1/accounts/" + salary).header("Authorization", "Bearer " + me)
			.exchange().expectStatus().isEqualTo(409)
			.expectBody().jsonPath("$.error.code").isEqualTo("ACCOUNT_HAS_TRANSACTIONS");
	}

	private long balanceOf(UUID accountId) {
		return json(client.get().uri("/api/v1/accounts/" + accountId + "/balance")
			.header("Authorization", "Bearer " + me).exchange().expectStatus().isOk())
			.at("/data/balanceMinor").asLong();
	}

	private JsonNode list(String token, UUID ledgerId) {
		return json(client.get().uri(JOURNAL + "?ledgerId=" + ledgerId)
			.header("Authorization", "Bearer " + token).exchange().expectStatus().isOk());
	}

	private static String line(String side, UUID accountId, long amountMinor) {
		return "{\"side\":\"%s\",\"accountId\":\"%s\",\"amountMinor\":%d}".formatted(side, accountId, amountMinor);
	}

	private static String body(UUID ledgerId, String date, String description, String... lines) {
		return body(null, ledgerId, date, description, lines);
	}

	private static String body(UUID clientRequestId, UUID ledgerId, String date, String description, String... lines) {
		String key = clientRequestId == null ? "" : "\"clientRequestId\":\"" + clientRequestId + "\",";
		return """
			{%s"ledgerId":"%s","entryDate":"%s","description":"%s","lines":[%s]}
			""".formatted(key, ledgerId, date, description, String.join(",", lines));
	}

	private JsonNode entry(String token, UUID ledgerId, String date, String description, String... lines) {
		return json(post(token, JOURNAL, body(ledgerId, date, description, lines)).expectStatus().isCreated());
	}

	private void stubRate(String rate) {
		given(fxServiceClient.fetch(eq("JPY"), eq("USD"), any(LocalDate.class)))
			.willAnswer(call -> Optional.of(new FxQuote(new BigDecimal(rate), call.getArgument(2), "YFINANCE")));
	}

	private UUID createLedger(String token, String name) {
		return idOf(json(post(token, "/api/v1/ledgers", """
			{"name":"%s","currency":"JPY","timezone":"Asia/Tokyo","confirmCurrencyIrreversible":true}
			""".formatted(name)).expectStatus().isCreated()));
	}

	private void joinLedger(String token, UUID ledgerId) {
		String code = json(post(me, "/api/v1/ledgers/" + ledgerId + "/invites",
			"{\"expiresInDays\":1,\"maxUses\":1}").expectStatus().isCreated())
			.at("/data/code").asString();
		post(token, "/api/v1/invites/" + code + "/accept", null).expectStatus().isOk();
	}

	private UUID createAccount(String token, String name, String type, String currency,
								UUID ledgerId, long openingBalanceMinor) {
		String ledgerIds = ledgerId == null ? "[]" : "[\"" + ledgerId + "\"]";
		return idOf(json(post(token, "/api/v1/accounts", """
			{"name":"%s","type":"%s","currency":"%s","ledgerIds":%s,"openingBalanceMinor":%d}
			""".formatted(name, type, currency, ledgerIds, openingBalanceMinor)).expectStatus().isCreated()));
	}

	private UUID createCategory(String token, UUID ledgerId, String name, UUID parentId, String kind) {
		String parent = parentId == null ? "null" : "\"" + parentId + "\"";
		return idOf(json(post(token, "/api/v1/ledgers/" + ledgerId + "/categories", """
			{"name":"%s","kind":"%s","parentId":%s}
			""".formatted(name, kind, parent)).expectStatus().isCreated()));
	}

	private UUID leaf(UUID ledgerId, String name) {
		JsonNode tree = json(client.get().uri("/api/v1/ledgers/" + ledgerId + "/categories")
			.header("Authorization", "Bearer " + me).exchange().expectStatus().isOk());
		for (JsonNode node : tree.at("/data")) {
			for (JsonNode child : node.at("/children")) {
				if (name.equals(child.at("/name").asString())) {
					return UUID.fromString(child.at("/id").asString());
				}
			}
		}
		throw new IllegalStateException("no leaf category " + name);
	}

	private RestTestClient.ResponseSpec post(String token, String uri, String body) {
		RestTestClient.RequestBodySpec spec = client.post().uri(uri)
			.header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON);
		return body == null ? spec.exchange() : spec.body(body).exchange();
	}

	private RestTestClient.ResponseSpec patch(String token, String uri, String body) {
		return client.patch().uri(uri)
			.header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.body(body).exchange();
	}

	private JsonNode json(RestTestClient.ResponseSpec spec) {
		return objectMapper.readTree(spec.expectBody(String.class).returnResult().getResponseBody());
	}

	private static UUID idOf(JsonNode body) {
		return UUID.fromString(body.at("/data/id").asString());
	}

	private static AppUser activeUser(UUID sub, String displayName) {
		AppUser user = AppUser.register(sub, sub + "@test.local", displayName, "JPY", "ko", "UTC");
		user.approve(null);
		return user;
	}

	private void wipe() {
		journalLineRepository.deleteAll();
		journalEntryRepository.deleteAll();
		fxRateRepository.deleteAll();
		ledgerAccountRepository.deleteAll();

		List<Account> accounts = accountRepository.findAll();
		accountRepository.deleteAll(accounts.stream().filter(a -> a.getParentId() != null).toList());
		accountRepository.deleteAll(accounts.stream().filter(a -> a.getParentId() == null).toList());

		ledgerMemberRepository.deleteAll();
		ledgerInviteRepository.deleteAll();
		ledgerRepository.deleteAll();
		appUserRepository.deleteAll();
		appUserService.evictAll();
	}
}
