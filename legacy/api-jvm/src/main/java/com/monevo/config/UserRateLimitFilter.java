package com.monevo.config;

import com.monevo.common.security.SecurityErrorResponder;
import com.monevo.config.RateLimitPolicy.Limit;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@RequiredArgsConstructor
public class UserRateLimitFilter extends OncePerRequestFilter {

	private final RateLimitPolicy policy;
	private final RateLimitBucketStore bucketStore;
	private final SecurityErrorResponder errorResponder;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
									FilterChain filterChain) throws ServletException, IOException {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		Optional<Limit> configured = policy.userLimit(request);

		if (!policy.isEnabled() || !(auth instanceof AppUserAuthenticationToken token) || configured.isEmpty()) {
			filterChain.doFilter(request, response);
			return;
		}

		Limit limit = configured.get();
		Bucket bucket = bucketStore.resolve("user:" + token.getPrincipal().id() + ":" + limit.key(), limit.quota());

		ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
		if (probe.isConsumed()) {
			response.setHeader("X-RateLimit-Limit", String.valueOf(limit.quota().capacity()));
			response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
			filterChain.doFilter(request, response);
			return;
		}

		long retryAfter = (probe.getNanosToWaitForRefill() + 999_999_999L) / 1_000_000_000L;
		errorResponder.writeRateLimited(request, response, limit.quota().capacity(), 0L, retryAfter);
	}
}
