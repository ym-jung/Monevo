package com.monevo.config;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.security.SecurityErrorResponder;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class AccountStatusFilter extends OncePerRequestFilter {

	private final SecurityErrorResponder errorResponder;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
									FilterChain filterChain) throws ServletException, IOException {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();

		if (!(auth instanceof AppUserAuthenticationToken token) || SecurityPaths.isPublic(request)) {
			filterChain.doFilter(request, response);
			return;
		}

		switch (token.getPrincipal().status()) {
			case ACTIVE -> filterChain.doFilter(request, response);
			case PENDING -> {
				if (SecurityPaths.isPendingAllowed(request)) {
					filterChain.doFilter(request, response);
				} else {
					errorResponder.write(request, response, ErrorCode.USER_PENDING_APPROVAL);
				}
			}
			case SUSPENDED -> errorResponder.write(request, response, ErrorCode.USER_SUSPENDED);
			case REJECTED -> errorResponder.write(request, response, ErrorCode.USER_REJECTED);
			case DELETED -> errorResponder.write(request, response, ErrorCode.AUTH_USER_NOT_PROVISIONED);
		}
	}
}
