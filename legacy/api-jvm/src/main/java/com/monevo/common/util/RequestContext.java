package com.monevo.common.util;

import org.slf4j.MDC;

public final class RequestContext {

	public static final String MDC_REQUEST_ID = "requestId";

	public static String requestId() {
		return MDC.get(MDC_REQUEST_ID);
	}

	private RequestContext() {
	}
}
