package com.monevo.common.util;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(-101)
public class RequestIdFilter extends OncePerRequestFilter {

	public static final String REQUEST_ID_HEADER = "X-Request-Id";
	public static final String CLIENT_VERSION_HEADER = "X-Client-Version";

	public static final String MDC_REQUEST_ID = RequestContext.MDC_REQUEST_ID;
	public static final String MDC_CLIENT_VERSION = "clientVersion";

	public static final String MDC_CLIENT_IP = "clientIp";

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
									FilterChain filterChain) throws ServletException, IOException {
		String requestId = request.getHeader(REQUEST_ID_HEADER);
		if (requestId == null || requestId.isBlank()) {
			requestId = UuidV7.generate().toString();
		}
		String clientVersion = request.getHeader(CLIENT_VERSION_HEADER);

		try {
			MDC.put(MDC_REQUEST_ID, requestId);
			MDC.put(MDC_CLIENT_IP, RequestUtils.getClientIp(request));
			if (clientVersion != null && !clientVersion.isBlank()) {
				MDC.put(MDC_CLIENT_VERSION, clientVersion);
			}

			response.setHeader(REQUEST_ID_HEADER, requestId);
			filterChain.doFilter(request, response);
		} finally {
			MDC.remove(MDC_REQUEST_ID);
			MDC.remove(MDC_CLIENT_VERSION);
			MDC.remove(MDC_CLIENT_IP);
		}
	}
}
