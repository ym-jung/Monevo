package com.monevo.config;

import com.monevo.config.AppProperties.Quota;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RateLimitPolicy {
	private static final String DEFAULT_KEY = "default";

	private static final List<Tier> TIERS = List.of(
		new Tier("fx", PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/api/v1/journal-entries")),
		new Tier("fx", PathPatternRequestMatcher.pathPattern(HttpMethod.PATCH, "/api/v1/journal-entries/*")),
		new Tier("report", PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/v1/ledgers/*/summary")),
		new Tier("report", PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/v1/ledgers/*/analysis")));

	private final AppProperties properties;

	public Optional<Limit> userLimit(HttpServletRequest request) {
		var user = properties.security().rateLimit().user();
		for (Tier tier : TIERS) {
			if (tier.matcher().matches(request)) {
				Quota quota = user.get(tier.key());
				if (quota != null) {
					return Optional.of(new Limit(tier.key(), quota));
				}
				break;
			}
		}
		return Optional.ofNullable(user.get(DEFAULT_KEY)).map(quota -> new Limit(DEFAULT_KEY, quota));
	}

	public Optional<Limit> ipLimit() {
		return Optional.ofNullable(properties.security().rateLimit().ip().get(DEFAULT_KEY))
			.map(quota -> new Limit(DEFAULT_KEY, quota));
	}

	public boolean isEnabled() {
		return properties.security().rateLimit().enabled();
	}

	public record Limit(String key, Quota quota) {
	}

	private record Tier(String key, RequestMatcher matcher) {
	}
}
