package com.monevo.config;

import com.monevo.support.IntegrationTest;
import com.monevo.user.entity.AppUser;
import com.monevo.user.repository.AppUserRepository;
import com.monevo.user.service.AppUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@IntegrationTest
class SecurityFilterChainTest {

	private static final String ISSUER =
		"https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_testPool0";
	private static final String CLIENT_ID = "test-client-id";
	private static final String ME = "/api/v1/users/me";

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
	@DisplayName("meta endpoints need no token")
	void publicPaths() {
		client.get().uri("/api/v1/meta/currencies").exchange().expectStatus().isOk();
	}

	@Test
	@DisplayName("no token means 401 with a parseable body, not an empty response")
	void missingToken() {
		client.get().uri(ME).exchange()
			.expectStatus().isUnauthorized()
			.expectBody().jsonPath("$.error.code").isEqualTo("UNAUTHENTICATED");
	}

	@Test
	@DisplayName("the error message follows Accept-Language, and comes back as UTF-8")
	void errorMessageFollowsAcceptLanguage() {
		client.get().uri(ME).header("Accept-Language", "ko").exchange()
			.expectStatus().isUnauthorized()
			.expectBody()
			.jsonPath("$.error.code").isEqualTo("UNAUTHENTICATED")
			.jsonPath("$.error.message").isEqualTo("로그인이 필요합니다.");

		client.get().uri(ME).header("Accept-Language", "fr").exchange()
			.expectStatus().isUnauthorized()
			.expectBody().jsonPath("$.error.message").isEqualTo("Sign-in is required.");
	}

	@Test
	@DisplayName("a wrong verb is 405 in the envelope, not an unhandled 500")
	void wrongMethodIsNotAllowed() {
		client.delete().uri("/api/v1/meta/currencies").exchange()
			.expectStatus().isEqualTo(HttpStatus.METHOD_NOT_ALLOWED)
			.expectBody().jsonPath("$.error.code").isEqualTo("METHOD_NOT_ALLOWED");
	}

	@Test
	@DisplayName("id token is rejected - Cognito signs it with the same key as access tokens")
	void idTokenRejected() {
		me(TestJwtFactory.idToken(UUID.randomUUID(), ISSUER, CLIENT_ID))
			.expectStatus().isUnauthorized()
			.expectBody().jsonPath("$.error.code").isEqualTo("TOKEN_INVALID");
	}

	@Test
	@DisplayName("right claims but signed by someone else")
	void forgedSignatureRejected() {
		me(TestJwtFactory.forgedAccessToken(UUID.randomUUID(), ISSUER, CLIENT_ID))
			.expectStatus().isUnauthorized()
			.expectBody().jsonPath("$.error.code").isEqualTo("TOKEN_INVALID");
	}

	@Test
	@DisplayName("an expired token says so, so the client can refresh instead of treating it as broken")
	void expiredRejected() {
		me(TestJwtFactory.expiredAccessToken(UUID.randomUUID(), ISSUER, CLIENT_ID))
			.expectStatus().isUnauthorized()
			.expectBody().jsonPath("$.error.code").isEqualTo("TOKEN_EXPIRED");
	}

	@Test
	@DisplayName("token minted for another app client in the same pool")
	void otherClientRejected() {
		me(TestJwtFactory.accessToken(UUID.randomUUID(), ISSUER, "another-app"))
			.expectStatus().isUnauthorized()
			.expectBody().jsonPath("$.error.code").isEqualTo("TOKEN_INVALID");
	}

	@Test
	@DisplayName("first call from a new Cognito account creates the row as PENDING")
	void provisionsOnFirstCall() {
		UUID sub = UUID.randomUUID();

		me(TestJwtFactory.accessToken(sub, ISSUER, CLIENT_ID))
			.expectStatus().isOk()
			.expectBody().jsonPath("$.data.status").isEqualTo("PENDING");

		assertThat(appUserRepository.findByCognitoSub(sub)).isPresent();
	}

	@Test
	@DisplayName("soft deleted account gets 401, not a unique violation - ux_user_cognito is not partial")
	void softDeletedRejected() {
		UUID sub = UUID.randomUUID();
		AppUser user = appUserRepository.save(activeUser(sub));
		user.softDelete(user.getId(), Instant.now());
		user.softDelete();
		appUserRepository.saveAndFlush(user);
		appUserService.evictAll();

		me(TestJwtFactory.accessToken(sub, ISSUER, CLIENT_ID))
			.expectStatus().isUnauthorized()
			.expectBody().jsonPath("$.error.code").isEqualTo("AUTH_USER_NOT_PROVISIONED");
	}

	@Test
	@DisplayName("PENDING can read and rename itself while waiting for approval")
	void pendingAllowedPaths() {
		UUID sub = UUID.randomUUID();
		appUserRepository.save(pendingUser(sub));
		String token = TestJwtFactory.accessToken(sub, ISSUER, CLIENT_ID);

		me(token).expectStatus().isOk();

		client.patch().uri(ME)
			.header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON)
			.body("{\"displayName\":\"renamed\"}")
			.exchange()
			.expectStatus().isOk()
			.expectBody().jsonPath("$.data.displayName").isEqualTo("renamed");
	}

	@Test
	@DisplayName("PENDING is blocked everywhere else")
	void pendingBlockedElsewhere() {
		UUID sub = UUID.randomUUID();
		appUserRepository.save(pendingUser(sub));

		client.get().uri("/api/v1/admin/users")
			.header("Authorization", "Bearer " + TestJwtFactory.accessToken(sub, ISSUER, CLIENT_ID))
			.exchange()
			.expectStatus().isForbidden()
			.expectBody().jsonPath("$.error.code").isEqualTo("USER_PENDING_APPROVAL");
	}

	@Test
	@DisplayName("SUSPENDED is blocked even on the PENDING allowlist")
	void suspendedBlocked() {
		UUID sub = UUID.randomUUID();
		AppUser user = appUserRepository.save(activeUser(sub));
		user.suspend(user.getId());
		appUserRepository.saveAndFlush(user);

		me(TestJwtFactory.accessToken(sub, ISSUER, CLIENT_ID))
			.expectStatus().isForbidden()
			.expectBody().jsonPath("$.error.code").isEqualTo("USER_SUSPENDED");
	}

	@Test
	@DisplayName("approval takes effect on the next request, not after the cache TTL")
	void approvalIsNotDelayedByCache() {
		UUID sub = UUID.randomUUID();
		AppUser user = appUserRepository.save(pendingUser(sub));
		String token = TestJwtFactory.accessToken(sub, ISSUER, CLIENT_ID);

		client.get().uri("/api/v1/admin/users").header("Authorization", "Bearer " + token)
			.exchange().expectStatus().isForbidden();

		user.approve(user.getId());
		user.promoteToAdmin(user.getId());
		appUserRepository.saveAndFlush(user);
		appUserService.evict(sub);

		client.get().uri("/api/v1/admin/users").header("Authorization", "Bearer " + token)
			.exchange().expectStatus().isOk();
	}

	private RestTestClient.ResponseSpec me(String token) {
		return client.get().uri(ME).header("Authorization", "Bearer " + token).exchange();
	}

	private static AppUser pendingUser(UUID sub) {
		return AppUser.register(sub, sub + "@test.local", "tester", "JPY", "en", "UTC");
	}

	private static AppUser activeUser(UUID sub) {
		AppUser user = pendingUser(sub);
		user.approve(null);
		return user;
	}
}
