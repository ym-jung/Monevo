package com.monevo.common.error.types;

import com.monevo.common.error.BusinessException;
import com.monevo.common.error.ErrorCode;

public class ExternalServiceException extends BusinessException {
	public ExternalServiceException(ErrorCode code, String message) {
		super(code, message);
	}

	public ExternalServiceException(ErrorCode code, String message, Throwable cause) {
		super(code, message);
		initCause(cause);
	}
}
