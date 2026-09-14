package com.monevo.config;

import com.monevo.common.security.SecurityErrorResponder;
import com.monevo.common.util.RequestUtils;
import com.monevo.config.RateLimitPolicy.Limit;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@RequiredArgsConstructor
public class IpRateLimitFilter extends OncePerRequestFilter {

	private final RateLimitPolicy policy;
	private final RateLimitBucketStore bucketStore;
	private final SecurityErrorResponder errorResponder;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
									FilterChain filterChain) throws ServletException, IOException {
		Optional<Limit> configured = policy.ipLimit();

		if (!policy.isEnabled() || configured.isEmpty()) {
			filterChain.doFilter(request, response);
			return;
		}

		Limit limit = configured.get();
		Bucket bucket = bucketStore.resolve("ip:" + RequestUtils.getClientIp(request), limit.quota());

		ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
		if (probe.isConsumed()) {
			filterChain.doFilter(request, response);
			return;
		}

		long retryAfter = (probe.getNanosToWaitForRefill() + 999_999_999L) / 1_000_000_000L;
		errorResponder.writeRateLimited(request, response, limit.quota().capacity(), 0L, retryAfter);
	}
}
