package com.monevo.common.error.types;

import com.monevo.common.error.BusinessException;
import com.monevo.common.error.ErrorCode;

public class NotFoundException extends BusinessException {
	public NotFoundException(ErrorCode code, String message) {
		super(code, message);
	}
}
