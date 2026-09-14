package com.monevo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
	Cognito cognito,
	Fx fx,
	Cors cors,
	Security security) {

	public AppProperties {
		fx = fx == null ? new Fx(null, null) : fx;
		cors = cors == null ? new Cors(List.of()) : cors;
		security = security == null ? Security.defaults() : security;
	}

	public record Cognito(
		String region,
		String userPoolId,
		String appClientId,
		String issuer,
		String jwkSetUri,
		Duration jwksCacheTtl,
		Duration clockSkew) {

		public Cognito {
			jwksCacheTtl = jwksCacheTtl == null ? Duration.ofHours(12) : jwksCacheTtl;
			clockSkew = clockSkew == null ? Duration.ofSeconds(60) : clockSkew;

			requireText("region", region);
			requireText("user-pool-id", userPoolId);
			requireText("app-client-id", appClientId);
			requireResolvedUri("issuer", issuer);
			requireResolvedUri("jwk-set-uri", jwkSetUri);
		}

		private static void requireText(String name, String value) {
			if (value == null || value.isBlank()) {
				throw new IllegalArgumentException("app.cognito." + name + " is blank");
			}
		}

		private static void requireResolvedUri(String name, String value) {
			requireText(name, value);
			if (value.contains("${")) {
				throw new IllegalArgumentException("app.cognito." + name
					+ " still contains an unresolved placeholder: " + value);
			}
			try {
				URI.create(value);
			} catch (IllegalArgumentException e) {
				throw new IllegalArgumentException("app.cognito." + name + " is not a valid URI: " + value, e);
			}
		}
	}

	public record Fx(String baseUrl, Duration timeout) {
		public Fx {
			timeout = timeout == null ? Duration.ofSeconds(3) : timeout;
		}
	}

	public record Cors(List<String> allowedOriginPatterns) {
		public Cors {
			allowedOriginPatterns = allowedOriginPatterns == null ? List.of() : List.copyOf(allowedOriginPatterns);
		}

		public boolean enabled() {
			return !allowedOriginPatterns.isEmpty();
		}
	}

	public record Security(Duration appUserCacheTtl, RateLimit rateLimit) {

		public Security {
			appUserCacheTtl = appUserCacheTtl == null ? Duration.ofSeconds(30) : appUserCacheTtl;
			rateLimit = rateLimit == null ? RateLimit.disabled() : rateLimit;
		}

		public static Security defaults() {
			return new Security(null, null);
		}
	}

	public record RateLimit(boolean enabled, Map<String, Quota> user, Map<String, Quota> ip) {

		public RateLimit {
			user = user == null ? Map.of() : Map.copyOf(user);
			ip = ip == null ? Map.of() : Map.copyOf(ip);
		}

		public static RateLimit disabled() {
			return new RateLimit(false, null, null);
		}
	}

	public record Quota(long capacity, Duration window) {
	}
}
