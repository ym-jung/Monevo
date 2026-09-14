package com.monevo.meta.controller;

import com.monevo.account.dto.CategoryKind;
import com.monevo.account.entity.Account;
import com.monevo.common.response.ApiResponse;
import com.monevo.journal.entity.FxRateSource;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import com.monevo.ledger.entity.LedgerMember;
import com.monevo.meta.dto.CurrencyMeta;
import com.monevo.meta.service.CurrencyService;
import com.monevo.user.entity.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/meta")
@RequiredArgsConstructor
public class MetaController {
	private final CurrencyService currencyService;

	@GetMapping("/currencies")
	public ApiResponse.Success<List<CurrencyMeta>> currencies() {
		return ApiResponse.ok(currencyService.listActive());
	}

	@GetMapping("/enums")
	public ApiResponse.Success<Map<String, List<String>>> enums() {
		return ApiResponse.ok(Map.ofEntries(
			Map.entry("userRole", names(AppUser.Role.values())),
			Map.entry("userStatus", names(AppUser.Status.values())),
			Map.entry("ledgerMemberRole", names(LedgerMember.Role.values())),
			Map.entry("accountType", names(Account.Type.values())),
			Map.entry("accountNature", names(Account.Nature.values())),
			Map.entry("accountSubtype", names(Account.Subtype.values())),
			Map.entry("categoryKind", names(CategoryKind.values())),
			Map.entry("journalEntryKind", names(JournalEntry.Kind.values())),
			Map.entry("journalLineSide", names(JournalLine.Side.values())),
			Map.entry("fxRateSource", names(FxRateSource.values()))));
	}

	private static List<String> names(Enum<?>[] values) {
		return Arrays.stream(values).map(Enum::name).toList();
	}
}
