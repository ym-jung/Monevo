package com.monevo.report;

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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

@IntegrationTest
class ReportApiTest {
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
	private UUID otherSalary;
	private UUID electricity;
	private UUID dining;
	private UUID groceries;
	private UUID subscription;

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
		otherSalary = createAccount(other, "other 월급통장", "BANK", "JPY", shared, 398_000);

		electricity = leaf(shared, "전기");
		dining = leaf(shared, "외식");
		groceries = leaf(shared, "장보기");
		subscription = leaf(personal, "구독 서비스");
	}

	@Test
	@DisplayName("the S4 scenario adds up and the card payment stays out of it")
	void scenario() {
		stubRate("150");
		expense(me, shared, salary, electricity, 12_000, "JPY", "2026-08-05", "8월 전기요금");
		expense(me, shared, jcb, dining, 7_000, "JPY", "2026-08-08", "주말 외식");
		transfer(me, shared, salary, jcb, 7_000, "2026-08-10", "JCB 카드값");
		expense(other, shared, otherSalary, groceries, 1_200, "JPY", "2026-08-06", "장보기");
		expense(other, shared, otherSalary, groceries, 1_500, "JPY", "2026-08-07", "카페");
		expense(other, shared, otherSalary, groceries, 1_600, "JPY", "2026-08-09", "정기권");

		JsonNode summary = summary(me, shared, "2026-08");

		assertThat(summary.at("/data/month").asString()).isEqualTo("2026-08");
		assertThat(summary.at("/data/currency").asString()).isEqualTo("JPY");
		assertThat(summary.at("/data/incomeMinor").asLong()).isZero();
		assertThat(summary.at("/data/expenseMinor").asLong()).isEqualTo(23_300);
		assertThat(summary.at("/data/netMinor").asLong()).isEqualTo(-23_300);

		assertThat(accountTotal(summary, "내 월급통장")).isEqualTo(12_000);
		assertThat(accountTotal(summary, "공용 JCB")).isEqualTo(7_000);
		assertThat(accountTotal(summary, "other 월급통장")).isEqualTo(4_300);

		assertThat(categoryTotal(summary, "주거/공과금")).isEqualTo(12_000);
		assertThat(categoryTotal(summary, "식비")).isEqualTo(11_300);
		assertThat(childTotal(summary, "식비", "외식")).isEqualTo(7_000);
		assertThat(childTotal(summary, "식비", "장보기")).isEqualTo(4_300);

		assertThat(names(summary.at("/data/byCategory"))).containsExactly("주거/공과금", "식비");
		assertThat(names(summary.at("/data/byAccount"))).containsExactly("내 월급통장", "공용 JCB", "other 월급통장");
	}

	@Test
	@DisplayName("repeated account and category filters apply to the entire summary")
	void multiFiltersApplyToWholeSummary() {
		expense(me, shared, salary, electricity, 12_000, "JPY", "2026-08-05", "전기");
		expense(me, shared, jcb, dining, 7_000, "JPY", "2026-08-08", "외식");
		expense(other, shared, otherSalary, groceries, 4_300, "JPY", "2026-08-06", "장보기");
		UUID food = accountRepository.findById(dining).orElseThrow().getParentId();
		UUID housing = accountRepository.findById(electricity).orElseThrow().getParentId();

		JsonNode union = get(me, "/api/v1/ledgers/" + shared + "/summary?month=2026-08&accountId="
			+ salary + "&accountId=" + otherSalary + "&categoryId=" + food + "&categoryId=" + housing);

		assertThat(union.at("/data/expenseMinor").asLong()).isEqualTo(16_300);
		assertThat(names(union.at("/data/byAccount"))).containsExactly("내 월급통장", "other 월급통장");
		assertThat(names(union.at("/data/byCategory"))).containsExactly("주거/공과금", "식비");

		JsonNode intersection = get(me, "/api/v1/ledgers/" + shared
			+ "/summary?month=2026-08&accountId=" + salary + "&accountId=" + otherSalary
			+ "&categoryId=" + food);

		assertThat(intersection.at("/data/expenseMinor").asLong()).isEqualTo(4_300);
		assertThat(names(intersection.at("/data/byAccount"))).containsExactly("other 월급통장");
		assertThat(names(intersection.at("/data/byCategory"))).containsExactly("식비");
	}

	@Test
	@DisplayName("everything is converted before it is summed")
	void foreignCurrencyIsSummedInBaseCurrency() {
		stubRate("150");
		expense(me, personal, usd, subscription, 1_200, "USD", "2026-08-11", "넷플릭스");

		JsonNode summary = summary(me, personal, "2026-08");

		assertThat(summary.at("/data/expenseMinor").asLong()).isEqualTo(1_800);
		assertThat(categoryTotal(summary, "문화/여가")).isEqualTo(1_800);
	}

	@Test
	@DisplayName("income and expense are counted separately, transfers in neither")
	void incomeAndExpense() {
		stubRate("150");
		UUID payday = leaf(shared, "월급");
		income(me, shared, salary, payday, 250_000, "2026-08-25", "8월 급여");
		expense(me, shared, salary, electricity, 12_000, "JPY", "2026-08-05", "8월 전기요금");
		transfer(me, shared, salary, jcb, 7_000, "2026-08-10", "JCB 카드값");

		JsonNode summary = summary(me, shared, "2026-08");

		assertThat(summary.at("/data/incomeMinor").asLong()).isEqualTo(250_000);
		assertThat(summary.at("/data/expenseMinor").asLong()).isEqualTo(12_000);
		assertThat(summary.at("/data/netMinor").asLong()).isEqualTo(238_000);

		assertThat(names(summary.at("/data/byCategory"))).containsExactly("주거/공과금");
	}

	@Test
	@DisplayName("month boundaries are the calendar month, February included")
	void monthBoundaries() {
		stubRate("150");
		expense(me, shared, salary, electricity, 1_000, "JPY", "2026-01-31", "1월 말");
		expense(me, shared, salary, electricity, 2_000, "JPY", "2026-02-01", "2월 초");
		expense(me, shared, salary, electricity, 4_000, "JPY", "2026-02-28", "2월 말");
		expense(me, shared, salary, electricity, 8_000, "JPY", "2026-03-01", "3월 초");

		assertThat(summary(me, shared, "2026-02").at("/data/expenseMinor").asLong()).isEqualTo(6_000);
	}

	@Test
	@DisplayName("a month with nothing in it is 200 with zeros, not 404")
	void emptyMonth() {
		JsonNode summary = summary(me, shared, "2026-07");

		assertThat(summary.at("/data/incomeMinor").asLong()).isZero();
		assertThat(summary.at("/data/expenseMinor").asLong()).isZero();
		assertThat(summary.at("/data/netMinor").asLong()).isZero();
		assertThat(summary.at("/data/byCategory")).isEmpty();
		assertThat(summary.at("/data/byAccount")).isEmpty();
	}

	@Test
	@DisplayName("a deleted entry leaves the summary")
	void deletedTransactionDropsOut() {
		stubRate("150");
		UUID id = idOf(expense(me, shared, salary, electricity, 12_000, "JPY", "2026-08-05", "전기"));
		assertThat(summary(me, shared, "2026-08").at("/data/expenseMinor").asLong()).isEqualTo(12_000);

		client.delete().uri(JOURNAL + "/" + id).header("Authorization", "Bearer " + me)
			.exchange().expectStatus().isNoContent();

		JsonNode summary = summary(me, shared, "2026-08");
		assertThat(summary.at("/data/expenseMinor").asLong()).isZero();
		assertThat(summary.at("/data/byCategory")).isEmpty();
	}

	@Test
	@DisplayName("a category that already holds transactions cannot take children (INV-07)")
	void aCategoryWithTransactionsCannotBecomeAParent() {
		stubRate("150");
		UUID pets = createCategory(me, shared, "반려동물", null);
		expense(me, shared, salary, pets, 5_000, "JPY", "2026-08-03", "사료");

		post(me, "/api/v1/ledgers/" + shared + "/categories",
			"{\"name\":\"병원\",\"kind\":\"EXPENSE\",\"parentId\":\"%s\"}".formatted(pets))
			.expectStatus().isEqualTo(409)
			.expectBody().jsonPath("$.error.code").isEqualTo("CATEGORY_HAS_TRANSACTIONS");
	}

	@Test
	@DisplayName("a node with both its own transactions and children still comes back once")
	void rootWithOwnTransactionsAndChildrenIsMerged() {
		stubRate("150");
		UUID pets = createCategory(me, shared, "반려동물", null);
		expense(me, shared, salary, pets, 5_000, "JPY", "2026-08-03", "사료");

		UUID vet = accountRepository.save(
			Account.category(shared, pets, "동물병원", Account.Nature.EXPENSE, (short) 0, false)).getId();
		expense(me, shared, salary, vet, 3_000, "JPY", "2026-08-04", "예방접종");

		JsonNode summary = summary(me, shared, "2026-08");

		assertThat(names(summary.at("/data/byCategory"))).containsExactly("반려동물");
		assertThat(categoryTotal(summary, "반려동물")).isEqualTo(8_000);
		assertThat(childTotal(summary, "반려동물", "동물병원")).isEqualTo(3_000);

		assertThat(summary.at("/data/expenseMinor").asLong()).isEqualTo(8_000);
	}

	@Test
	@DisplayName("only members read a ledger's summary")
	void nonMemberIsRejected() {
		UUID others = createLedger(other, "other 개인");

		client.get().uri("/api/v1/ledgers/" + others + "/summary?month=2026-08")
			.header("Authorization", "Bearer " + me).exchange()
			.expectStatus().isForbidden()
			.expectBody().jsonPath("$.error.code").isEqualTo("LEDGER_NOT_MEMBER");

		client.get().uri("/api/v1/ledgers/" + UUID.randomUUID() + "/summary?month=2026-08")
			.header("Authorization", "Bearer " + me).exchange()
			.expectStatus().isNotFound()
			.expectBody().jsonPath("$.error.code").isEqualTo("LEDGER_NOT_FOUND");
	}

	@Test
	@DisplayName("a month that isn't one is 400, not 500")
	void badMonthIsRejected() {
		client.get().uri("/api/v1/ledgers/" + shared + "/summary?month=2026-13")
			.header("Authorization", "Bearer " + me).exchange()
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.details[0].issue").isEqualTo("TYPE_MISMATCH");

		client.get().uri("/api/v1/ledgers/" + shared + "/summary")
			.header("Authorization", "Bearer " + me).exchange()
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.details[0].issue").isEqualTo("REQUIRED");
	}

	@Test
	@DisplayName("period analysis fills daily and monthly buckets")
	void periodAnalysisFillsBuckets() {
		UUID payday = leaf(shared, "월급");
		income(me, shared, salary, payday, 10_000, "2026-08-05", "급여");
		expense(me, shared, salary, dining, 2_000, "JPY", "2026-08-05", "점심");
		expense(me, shared, salary, groceries, 3_000, "JPY", "2026-08-08", "장보기");
		transfer(me, shared, salary, jcb, 4_000, "2026-08-06", "카드값");

		JsonNode daily = get(me, "/api/v1/ledgers/" + shared
			+ "/analysis?from=2026-08-05&to=2026-08-08&bucket=DAY");

		assertThat(daily.at("/data/incomeMinor").asLong()).isEqualTo(10_000);
		assertThat(daily.at("/data/expenseMinor").asLong()).isEqualTo(5_000);
		assertThat(daily.at("/data/netMinor").asLong()).isEqualTo(5_000);
		assertThat(daily.at("/data/series").size()).isEqualTo(4);
		assertThat(daily.at("/data/series/0/periodStart").asString()).isEqualTo("2026-08-05");
		assertThat(daily.at("/data/series/0/incomeMinor").asLong()).isEqualTo(10_000);
		assertThat(daily.at("/data/series/0/expenseMinor").asLong()).isEqualTo(2_000);
		assertThat(daily.at("/data/series/1/netMinor").asLong()).isZero();
		assertThat(daily.at("/data/series/3/expenseMinor").asLong()).isEqualTo(3_000);
		assertThat(childTotal(daily, "식비", "외식")).isEqualTo(2_000);
		assertThat(childTotal(daily, "식비", "장보기")).isEqualTo(3_000);

		JsonNode monthly = get(me, "/api/v1/ledgers/" + shared
			+ "/analysis?from=2026-08-05&to=2026-09-02&bucket=MONTH");
		assertThat(monthly.at("/data/series").size()).isEqualTo(2);
		assertThat(monthly.at("/data/series/0/periodStart").asString()).isEqualTo("2026-08-01");
		assertThat(monthly.at("/data/series/1/periodStart").asString()).isEqualTo("2026-09-01");
		assertThat(monthly.at("/data/series/1/netMinor").asLong()).isZero();
	}

	@Test
	@DisplayName("period analysis validates its inclusive range")
	void periodAnalysisValidatesRange() {
		client.get().uri("/api/v1/ledgers/" + shared
			+ "/analysis?from=2026-08-02&to=2026-08-01&bucket=DAY")
			.header("Authorization", "Bearer " + me).exchange()
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.code").isEqualTo("VALIDATION_FAILED");

		client.get().uri("/api/v1/ledgers/" + shared
			+ "/analysis?from=2025-01-01&to=2026-01-02&bucket=MONTH")
			.header("Authorization", "Bearer " + me).exchange()
			.expectStatus().isBadRequest()
			.expectBody().jsonPath("$.error.code").isEqualTo("VALIDATION_FAILED");
	}

	private JsonNode summary(String token, UUID ledgerId, String month) {
		return get(token, "/api/v1/ledgers/" + ledgerId + "/summary?month=" + month);
	}

	private static long accountTotal(JsonNode summary, String name) {
		return amountOf(summary.at("/data/byAccount"), name);
	}

	private static long categoryTotal(JsonNode summary, String name) {
		return amountOf(summary.at("/data/byCategory"), name);
	}

	private static long childTotal(JsonNode summary, String parentName, String childName) {
		for (JsonNode node : summary.at("/data/byCategory")) {
			if (parentName.equals(node.at("/name").asString())) {
				return amountOf(node.at("/children"), childName);
			}
		}
		throw new IllegalStateException("no category " + parentName);
	}

	private static long amountOf(JsonNode nodes, String name) {
		for (JsonNode node : nodes) {
			if (name.equals(node.at("/name").asString())) {
				return node.at("/expenseMinor").asLong();
			}
		}
		throw new IllegalStateException("no row named " + name);
	}

	private static List<String> names(JsonNode nodes) {
		List<String> out = new ArrayList<>();
		nodes.forEach(node -> out.add(node.at("/name").asString()));
		return out;
	}

	private void stubRate(String rate) {
		given(fxServiceClient.fetch(eq("JPY"), eq("USD"), any(LocalDate.class)))
			.willAnswer(call -> Optional.of(new FxQuote(new BigDecimal(rate), call.getArgument(2), "YFINANCE")));
	}

	private UUID createCategory(String token, UUID ledgerId, String name, UUID parentId) {
		String parent = parentId == null ? "null" : "\"" + parentId + "\"";
		return idOf(json(post(token, "/api/v1/ledgers/" + ledgerId + "/categories", """
			{"name":"%s","kind":"EXPENSE","parentId":%s}
			""".formatted(name, parent)).expectStatus().isCreated()));
	}

	private JsonNode expense(String token, UUID ledgerId, UUID accountId, UUID categoryId,
							long amountMinor, String currency, String date, String description) {
		return entry(token, ledgerId, date, description,
			line("DEBIT", categoryId, amountMinor), line("CREDIT", accountId, amountMinor));
	}

	private JsonNode income(String token, UUID ledgerId, UUID accountId, UUID categoryId,
							long amountMinor, String date, String description) {
		return entry(token, ledgerId, date, description,
			line("DEBIT", accountId, amountMinor), line("CREDIT", categoryId, amountMinor));
	}

	private JsonNode transfer(String token, UUID ledgerId, UUID from, UUID to,
							long amountMinor, String date, String description) {
		return entry(token, ledgerId, date, description,
			line("DEBIT", to, amountMinor), line("CREDIT", from, amountMinor));
	}

	private static String line(String side, UUID accountId, long amountMinor) {
		return "{\"side\":\"%s\",\"accountId\":\"%s\",\"amountMinor\":%d}"
			.formatted(side, accountId, amountMinor);
	}

	private JsonNode entry(String token, UUID ledgerId, String date, String description, String... lines) {
		return json(post(token, JOURNAL, """
			{"ledgerId":"%s","entryDate":"%s","description":"%s","lines":[%s]}
			""".formatted(ledgerId, date, description, String.join(",", lines)))
			.expectStatus().isCreated());
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

	private UUID leaf(UUID ledgerId, String name) {
		for (JsonNode node : get(me, "/api/v1/ledgers/" + ledgerId + "/categories").at("/data")) {
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

	private JsonNode get(String token, String uri) {
		return json(client.get().uri(uri).header("Authorization", "Bearer " + token)
			.exchange().expectStatus().isOk());
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
