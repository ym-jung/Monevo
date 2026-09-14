package com.monevo.common.security;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.response.ApiResponse;
import com.monevo.common.util.RequestContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SecurityErrorResponder {
	private final ObjectMapper objectMapper;
	private final MessageSource messageSource;

	public void write(HttpServletRequest request, HttpServletResponse response, ErrorCode code) throws IOException {

		if (response.isCommitted()) {
			return;
		}

		response.setStatus(code.status().value());
		response.setContentType("application/json; charset=UTF-8");

		String message;
		try {
			message = messageSource.getMessage(code.name(), null, request.getLocale());

		} catch (NoSuchMessageException e) {
			message = code.name();
		}

		String traceId = RequestContext.requestId();

		ApiResponse.Failure body = ApiResponse.error(code, message, List.of(), traceId);
		objectMapper.writeValue(response.getOutputStream(), body);
	}

	public void writeRateLimited(HttpServletRequest request, HttpServletResponse response,
								long limit, long remaining, long retryAfterSeconds) throws IOException {
		response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
		response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
		response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

		write(request, response, ErrorCode.RATE_LIMITED);
	}
}
