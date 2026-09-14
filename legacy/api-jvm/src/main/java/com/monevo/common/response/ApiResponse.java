package com.monevo.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.dto.ErrorDetail;

import java.time.Instant;
import java.util.List;

public sealed interface ApiResponse permits ApiResponse.Success, ApiResponse.Failure {

	@JsonInclude(JsonInclude.Include.NON_NULL)
	record Success<T>(T data, Object meta) implements ApiResponse {
	}

	record Failure(ErrorBody error) implements ApiResponse {
	}

	record ErrorBody(String code, String message, List<ErrorDetail> details, String traceId, Instant timestamp) {
	}

	static <T> Success<T> ok(T data) {
		return new Success<>(data, null);
	}

	static <T> Success<T> ok(T data, Object meta) {
		return new Success<>(data, meta);
	}

	static Success<Void> ok() {
		return new Success<>(null, null);
	}

	static Failure error(ErrorCode code, String message, List<ErrorDetail> details, String traceId) {
		return new Failure(new ErrorBody(code.name(), message, details, traceId, Instant.now()));
	}
}
