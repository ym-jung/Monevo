package com.monevo.config;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.security.CurrentUser;
import com.monevo.common.security.JwtClaims;
import com.monevo.common.security.SecurityErrorResponder;
import com.monevo.user.service.AppUserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@RequiredArgsConstructor
public class AppUserFilter extends OncePerRequestFilter {

	public static final String MDC_USER_ID = "userId";

	private final AppUserService appUserService;
	private final SecurityErrorResponder errorResponder;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
									FilterChain filterChain) throws ServletException, IOException {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();

		if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
			filterChain.doFilter(request, response);
			return;
		}

		Jwt jwt = jwtAuth.getToken();

		UUID sub;
		try {
			sub = UUID.fromString(jwt.getClaimAsString(JwtClaims.SUBJECT));
		} catch (IllegalArgumentException | NullPointerException e) {

			errorResponder.write(request, response, ErrorCode.TOKEN_INVALID);
			return;
		}

		Optional<CurrentUser> resolved = appUserService.findOrProvision(sub, email(jwt));
		if (resolved.isEmpty()) {

			errorResponder.write(request, response, ErrorCode.AUTH_USER_NOT_PROVISIONED);
			return;
		}

		CurrentUser principal = resolved.get();
		SecurityContextHolder.getContext().setAuthentication(new AppUserAuthenticationToken(
			principal, jwt, AppUserAuthenticationToken.authoritiesOf(principal.role())));

		try {
			MDC.put(MDC_USER_ID, principal.id().toString());
			filterChain.doFilter(request, response);
		} finally {
			MDC.remove(MDC_USER_ID);
		}
	}

	private static String email(Jwt jwt) {
		return jwt.getClaimAsString(JwtClaims.EMAIL);
	}
}
