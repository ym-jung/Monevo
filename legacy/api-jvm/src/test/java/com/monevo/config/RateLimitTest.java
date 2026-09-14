package com.monevo.config;

import com.monevo.support.IntegrationTest;
import com.monevo.user.entity.AppUser;
import com.monevo.user.repository.AppUserRepository;
import com.monevo.user.service.AppUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;

import java.util.UUID;

@IntegrationTest
@TestPropertySource(properties = {
	"app.security.rate-limit.enabled=true",
	"app.security.rate-limit.user.default.capacity=5",
	"app.security.rate-limit.user.default.window=PT1M",
	"app.security.rate-limit.user.report.capacity=2",
	"app.security.rate-limit.user.report.window=PT1M",
	"app.security.rate-limit.ip.default.capacity=30",
	"app.security.rate-limit.ip.default.window=PT1M",
})
class RateLimitTest {

	private static final String ISSUER =
		"https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_testPool0";
	private static final String CLIENT_ID = "test-client-id";
	private static final String ME = "/api/v1/users/me";
	private static final String CURRENCIES = "/api/v1/meta/currencies";

	@Autowired
	RestTestClient client;
	@Autowired
	AppUserRepository appUserRepository;
	@Autowired
	AppUserService appUserService;

	@BeforeEach
	void reset() {
		appUserRepository.deleteAll();
		appUserService.evictAll();
	}

	@Test
	@DisplayName("the sixth request from one account is 429, with the headers a client can act on")
	void userBucketRunsOut() {
		String token = activeToken();

		for (int i = 0; i < 5; i++) {
			get(ME, "10.0.0.1", token)
				.expectStatus().isOk()
				.expectHeader().valueEquals("X-RateLimit-Limit", "5");
		}

		get(ME, "10.0.0.1", token)
			.expectStatus().isEqualTo(429)
			.expectHeader().exists("Retry-After")
			.expectHeader().valueEquals("X-RateLimit-Remaining", "0")
			.expectBody().jsonPath("$.error.code").isEqualTo("RATE_LIMITED");
	}

	@Test
	@DisplayName("two accounts do not share a bucket")
	void bucketsArePerAccount() {
		String spender = activeToken();
		for (int i = 0; i < 5; i++) {
			get(ME, "10.0.0.2", spender).expectStatus().isOk();
		}
		get(ME, "10.0.0.2", spender).expectStatus().isEqualTo(429);

		get(ME, "10.0.0.2", activeToken()).expectStatus().isOk();
	}

	@Test
	@DisplayName("a tiered route spends its own budget, not the default one")
	void tieredRouteHasItsOwnBucket() {
		String token = activeToken();
		String summary = "/api/v1/ledgers/" + UUID.randomUUID() + "/summary?month=2026-08";

		get(summary, "10.0.0.3", token).expectStatus().is4xxClientError();
		get(summary, "10.0.0.3", token).expectStatus().is4xxClientError();
		get(summary, "10.0.0.3", token)
			.expectStatus().isEqualTo(429)
			.expectBody().jsonPath("$.error.code").isEqualTo("RATE_LIMITED");

		get(ME, "10.0.0.3", token).expectStatus().isOk();
	}

	@Test
	@DisplayName("public paths are counted too - no token means no user bucket to charge")
	void anonymousTrafficHitsTheIpBucket() {
		for (int i = 0; i < 30; i++) {
			get(CURRENCIES, "10.0.0.4", null).expectStatus().isOk();
		}
		get(CURRENCIES, "10.0.0.4", null)
			.expectStatus().isEqualTo(429)
			.expectBody().jsonPath("$.error.code").isEqualTo("RATE_LIMITED");
	}

	@Test
	@DisplayName("a bad token is counted - it never reaches AppUserFilter, so only the IP bucket can")
	void rejectedTokensHitTheIpBucket() {
		String forged = TestJwtFactory.forgedAccessToken(UUID.randomUUID(), ISSUER, CLIENT_ID);

		for (int i = 0; i < 30; i++) {
			get(ME, "10.0.0.5", forged).expectStatus().isUnauthorized();
		}
		get(ME, "10.0.0.5", forged)
			.expectStatus().isEqualTo(429)
			.expectBody().jsonPath("$.error.code").isEqualTo("RATE_LIMITED");
	}

	@Test
	@DisplayName("one address running out does not touch another")
	void ipBucketsAreIndependent() {
		for (int i = 0; i < 30; i++) {
			get(CURRENCIES, "10.0.0.6", null).expectStatus().isOk();
		}
		get(CURRENCIES, "10.0.0.6", null).expectStatus().isEqualTo(429);

		get(CURRENCIES, "10.0.0.7", null).expectStatus().isOk();
	}

	private RestTestClient.ResponseSpec get(String uri, String ip, String token) {
		var spec = client.get().uri(uri).header("CF-Connecting-IP", ip);
		if (token != null) {
			spec = spec.header("Authorization", "Bearer " + token);
		}
		return spec.exchange();
	}

	private String activeToken() {
		UUID sub = UUID.randomUUID();
		AppUser user = AppUser.register(sub, sub + "@test.local", "tester", "JPY", "en", "UTC");
		user.approve(null);
		appUserRepository.saveAndFlush(user);
		return TestJwtFactory.accessToken(sub, ISSUER, CLIENT_ID);
	}
}
