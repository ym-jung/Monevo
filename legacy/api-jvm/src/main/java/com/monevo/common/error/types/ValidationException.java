package com.monevo.common.error.types;

import com.monevo.common.error.BusinessException;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.dto.ErrorDetail;

import java.util.List;

public class ValidationException extends BusinessException {
	public ValidationException(ErrorCode code, String message) {
		super(code, message);
	}

	public ValidationException(ErrorCode code, String message, List<ErrorDetail> details) {
		super(code, message, details);
	}
}
