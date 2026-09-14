package com.monevo.common.error.types;

import com.monevo.common.error.BusinessException;
import com.monevo.common.error.ErrorCode;

public class GoneException extends BusinessException {
	public GoneException(ErrorCode code, String message) {
		super(code, message);
	}
}
