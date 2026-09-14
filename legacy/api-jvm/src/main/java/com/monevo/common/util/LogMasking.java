package com.monevo.common.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class LogMasking {
	private static final Pattern EMAIL = Pattern.compile("([a-zA-Z0-9])[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");

	private LogMasking() {
	}

	public static String maskDestination(String email) {
		if (email == null) {
			return null;
		}
		int at = email.indexOf('@');
		int lastDot = email.lastIndexOf('.');
		if (at <= 0 || lastDot <= at + 1) {
			return null;
		}
		return email.charAt(0) + "***@" + email.charAt(at + 1) + "***" + email.substring(lastDot);
	}

	public static String maskEmails(String input) {
		if (input == null) {
			return null;
		}
		Matcher matcher = EMAIL.matcher(input);
		return matcher.replaceAll("$1***$2");
	}
}
