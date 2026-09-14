package com.monevo.config;

import com.monevo.common.security.JwtClaims;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

public final class TestJwtFactory {

	private static final RSAPublicKey PUBLIC_KEY;
	private static final RSAPrivateKey PRIVATE_KEY;
	private static final RSAPrivateKey FORGED_PRIVATE_KEY;

	static {
		try {
			KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
			gen.initialize(2048);

			KeyPair pair = gen.generateKeyPair();
			PUBLIC_KEY = (RSAPublicKey) pair.getPublic();
			PRIVATE_KEY = (RSAPrivateKey) pair.getPrivate();

			FORGED_PRIVATE_KEY = (RSAPrivateKey) gen.generateKeyPair().getPrivate();
		} catch (Exception e) {
			throw new IllegalStateException("RSA key pair generation failed", e);
		}
	}

	private TestJwtFactory() {
	}

	public static RSAPublicKey publicKey() {
		return PUBLIC_KEY;
	}

	public static String accessToken(UUID sub, String issuer, String clientId) {
		return sign(sub, issuer, clientId, JwtClaims.TOKEN_USE_ACCESS, expiresInAnHour(), PRIVATE_KEY);
	}

	public static String idToken(UUID sub, String issuer, String clientId) {
		return sign(sub, issuer, clientId, "id", expiresInAnHour(), PRIVATE_KEY);
	}

	public static String expiredAccessToken(UUID sub, String issuer, String clientId) {
		return sign(sub, issuer, clientId, JwtClaims.TOKEN_USE_ACCESS,
			Instant.now().minusSeconds(600), PRIVATE_KEY);
	}

	public static String forgedAccessToken(UUID sub, String issuer, String clientId) {
		return sign(sub, issuer, clientId, JwtClaims.TOKEN_USE_ACCESS, expiresInAnHour(), FORGED_PRIVATE_KEY);
	}

	private static Instant expiresInAnHour() {
		return Instant.now().plusSeconds(3600);
	}

	private static String sign(UUID sub, String issuer, String clientId, String tokenUse,
							Instant expiresAt, RSAPrivateKey key) {
		Instant now = Instant.now();
		JWTClaimsSet claims = new JWTClaimsSet.Builder()
			.issuer(issuer)
			.subject(sub.toString())
			.claim(JwtClaims.TOKEN_USE, tokenUse)
			.claim(JwtClaims.CLIENT_ID, clientId)
			.issueTime(Date.from(now.minusSeconds(60)))
			.expirationTime(Date.from(expiresAt))
			.build();
		try {
			SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
			jwt.sign(new RSASSASigner(key));
			return jwt.serialize();
		} catch (Exception e) {
			throw new IllegalStateException("failed to sign test token", e);
		}
	}
}
