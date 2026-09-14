package com.monevo.common.error.types;

import com.monevo.common.error.BusinessException;
import com.monevo.common.error.ErrorCode;

public class ConflictException extends BusinessException {
	public ConflictException(ErrorCode code, String message) {
		super(code, message);
	}
}
