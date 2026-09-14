package com.monevo.common.error;

import com.monevo.common.error.dto.ErrorDetail;
import org.springframework.http.HttpStatus;

import java.util.List;

public abstract class BusinessException extends RuntimeException {
	private final ErrorCode code;
	private final List<ErrorDetail> details;

	protected BusinessException(ErrorCode code, String message) {
		this(code, message, List.of());
	}

	protected BusinessException(ErrorCode code, String message, List<ErrorDetail> details) {
		super(message);
		this.code = code;
		this.details = details;
	}

	public ErrorCode code() {
		return code;
	}

	public HttpStatus status() {
		return code.status();
	}

	public List<ErrorDetail> details() {
		return details;
	}
}
