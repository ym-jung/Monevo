package com.monevo.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

import java.util.List;

public final class SecurityPaths {

	public static final List<String> PUBLIC = List.of(
		"/actuator/health", "/actuator/health/**", "/actuator/info",
		"/api/v1/meta/**");

	public static final List<RequestMatcher> PENDING_ALLOWED = List.of(
		PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/api/v1/users/me"),
		PathPatternRequestMatcher.pathPattern(HttpMethod.PATCH, "/api/v1/users/me"));

	private static final List<PathPatternRequestMatcher> PUBLIC_MATCHERS =
		PUBLIC.stream().map(PathPatternRequestMatcher::pathPattern).toList();

	public static boolean isPublic(HttpServletRequest request) {
		return PUBLIC_MATCHERS.stream().anyMatch(matcher -> matcher.matches(request));
	}

	public static boolean isPendingAllowed(HttpServletRequest request) {
		return PENDING_ALLOWED.stream().anyMatch(matcher -> matcher.matches(request));
	}

	private SecurityPaths() {
	}
}
