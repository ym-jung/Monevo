package com.monevo.config;

import com.monevo.common.security.JwtClaims;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenValidatorTest {

	private static final String ISSUER = "https://cognito-idp.ap-northeast-1.amazonaws.com/mock-pool-1";
	private static final String CLIENT_ID = "mock-client-1";

	private final OAuth2TokenValidator<Jwt> validator = SecurityConfig.tokenValidator(
			new AppProperties.Cognito("ap-northeast-1", "mock-pool-1", CLIENT_ID,
					ISSUER, ISSUER + "/.well-known/jwks.json",
					Duration.ofHours(12), Duration.ofSeconds(60)));

	@Test
	@DisplayName("accepts a well-formed access token")
	void acceptsAccessToken() {
		assertThat(validator.validate(jwt(Map.of())).hasErrors()).isFalse();
	}

	@Test
	@DisplayName("rejects an id token - same signing key as access tokens, so only this check catches it")
	void rejectsIdToken() {
		assertThat(validator.validate(jwt(Map.of(JwtClaims.TOKEN_USE, "id"))).hasErrors()).isTrue();
	}

	@Test
	@DisplayName("rejects a token with no token_use at all")
	void rejectsMissingTokenUse() {
		assertThat(validator.validate(jwt(claims -> claims.remove(JwtClaims.TOKEN_USE))).hasErrors()).isTrue();
	}

	@Test
	@DisplayName("rejects a token minted for another app client in the same pool")
	void rejectsOtherClientId() {
		assertThat(validator.validate(jwt(Map.of(JwtClaims.CLIENT_ID, "someone-elses-app"))).hasErrors()).isTrue();
	}

	@Test
	@DisplayName("rejects a token from another user pool")
	void rejectsOtherIssuer() {
		Map<String, Object> other = Map.of("iss", "https://cognito-idp.ap-northeast-1.amazonaws.com/other-pool");
		assertThat(validator.validate(jwt(other)).hasErrors()).isTrue();
	}

	@Test
	@DisplayName("rejects an expired token")
	void rejectsExpired() {
		Instant longAgo = Instant.now().minusSeconds(7200);
		assertThat(validator.validate(signedBetween(longAgo, longAgo.plusSeconds(3600))).hasErrors()).isTrue();
	}

	@Test
	@DisplayName("accepts a token that expired seconds ago - clock skew leeway is 60s")
	void acceptsWithinClockSkew() {
		Instant now = Instant.now();
		assertThat(validator.validate(signedBetween(now.minusSeconds(3630), now.minusSeconds(30))).hasErrors())
				.isFalse();
	}

	private static Map<String, Object> baseClaims() {
		Map<String, Object> claims = new HashMap<>();
		claims.put("iss", ISSUER);
		claims.put(JwtClaims.SUBJECT, "01900000-0000-7000-8000-000000000001");
		claims.put(JwtClaims.TOKEN_USE, JwtClaims.TOKEN_USE_ACCESS);
		claims.put(JwtClaims.CLIENT_ID, CLIENT_ID);
		return claims;
	}

	private static Jwt jwt(Map<String, Object> overrides) {
		return jwt(claims -> claims.putAll(overrides));
	}

	private static Jwt jwt(Consumer<Map<String, Object>> customizer) {
		Map<String, Object> claims = baseClaims();
		customizer.accept(claims);
		Instant now = Instant.now();
		return Jwt.withTokenValue("t").header("alg", "RS256")
				.claims(c -> c.putAll(claims))
				.issuedAt(now)
				.expiresAt(now.plusSeconds(3600))
				.build();
	}

	private static Jwt signedBetween(Instant issuedAt, Instant expiresAt) {
		return Jwt.withTokenValue("t").header("alg", "RS256")
				.claims(c -> c.putAll(baseClaims()))
				.issuedAt(issuedAt)
				.expiresAt(expiresAt)
				.build();
	}
}
