package com.monevo.common.error.types;

import com.monevo.common.error.BusinessException;
import com.monevo.common.error.ErrorCode;

public class ForbiddenException extends BusinessException {
	public ForbiddenException(ErrorCode code, String message) {
		super(code, message);
	}
}
