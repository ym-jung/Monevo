package com.monevo.common.util;

import jakarta.servlet.http.HttpServletRequest;

public final class RequestUtils {

	public static String getClientIp(HttpServletRequest request) {
		String ip = request.getHeader("CF-Connecting-IP");
		if (ip == null || ip.isBlank()) {
			ip = request.getHeader("X-Forwarded-For");
			if (ip != null && !ip.isBlank()) {

				ip = ip.split(",")[0].trim();
			}
		}
		if (ip == null || ip.isBlank()) {
			ip = request.getRemoteAddr();
		}
		return ip;
	}

	private RequestUtils() {
	}
}
