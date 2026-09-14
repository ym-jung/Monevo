package com.monevo.common.error;

import org.springframework.dao.DataIntegrityViolationException;

import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static java.util.Map.entry;

public final class DbConstraintErrorMapper {

	private static final Map<String, ErrorCode> CONSTRAINT_TO_ERROR_CODE = Map.ofEntries(

		entry("ux_user_email", ErrorCode.EMAIL_ALREADY_EXISTS),
		entry("ux_user_cognito", ErrorCode.USER_ALREADY_PROCESSED),
		entry("ck_user_role", ErrorCode.VALIDATION_FAILED),
		entry("ck_user_status", ErrorCode.VALIDATION_FAILED),
		entry("ck_user_locale", ErrorCode.VALIDATION_FAILED),

		entry("ck_currency_exponent", ErrorCode.VALIDATION_FAILED),

		entry("ux_invite_code", ErrorCode.INVITE_CODE_DUPLICATED),
		entry("ck_invite_uses", ErrorCode.INVITE_EXHAUSTED),

		entry("ux_member_ledger_user", ErrorCode.INVITE_ALREADY_MEMBER),
		entry("ux_member_single_owner", ErrorCode.LEDGER_SINGLE_OWNER_VIOLATION),
		entry("ck_member_role", ErrorCode.VALIDATION_FAILED),

		entry("ux_account_owner_name", ErrorCode.ACCOUNT_NAME_DUPLICATED),
		entry("ux_account_category_sibling", ErrorCode.CATEGORY_NAME_DUPLICATED),
		entry("ux_account_system_owner", ErrorCode.OPENING_BALANCE_ALREADY_SET),
		entry("ck_account_type", ErrorCode.VALIDATION_FAILED),
		entry("ck_account_nature", ErrorCode.ACCOUNT_NATURE_INVALID),
		entry("ck_account_subtype", ErrorCode.ACCOUNT_NATURE_INVALID),
		entry("ck_account_nature_subtype", ErrorCode.ACCOUNT_NATURE_INVALID),
		entry("ck_account_shape", ErrorCode.ACCOUNT_NATURE_INVALID),

		entry("ck_entry_kind", ErrorCode.VALIDATION_FAILED),
		entry("ck_entry_scope", ErrorCode.JOURNAL_ENTRY_SHAPE_INVALID),
		entry("ck_line_side", ErrorCode.VALIDATION_FAILED),
		entry("ck_line_amount", ErrorCode.TRANSACTION_AMOUNT_INVALID),
		entry("ck_line_fx_rate", ErrorCode.FX_RATE_INVALID),
		entry("ck_line_fx_source", ErrorCode.VALIDATION_FAILED),
		entry("ux_entry_creator_client_request", ErrorCode.TRANSACTION_IDEMPOTENCY_KEY_REUSED),

		entry("ck_fx_rate_positive", ErrorCode.FX_RATE_INVALID),
		entry("ck_fx_rate_different", ErrorCode.FX_RATE_INVALID)
	);

	private static final Pattern CONSTRAINT_NAME_PATTERN = Pattern.compile("constraint \"([a-zA-Z0-9_]+)\"");

	private DbConstraintErrorMapper() {
	}

	public static Optional<ErrorCode> resolve(DataIntegrityViolationException ex) {
		String message = rootMessage(ex);
		if (message == null) {
			return Optional.empty();
		}
		Matcher matcher = CONSTRAINT_NAME_PATTERN.matcher(message);
		if (!matcher.find()) {
			return Optional.empty();
		}
		return Optional.ofNullable(CONSTRAINT_TO_ERROR_CODE.get(matcher.group(1)));
	}

	private static String rootMessage(Throwable ex) {
		Throwable cause = ex;
		while (cause.getCause() != null) {
			cause = cause.getCause();
		}
		return cause.getMessage();
	}
}
