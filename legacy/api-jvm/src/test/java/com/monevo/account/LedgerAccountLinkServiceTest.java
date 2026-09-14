package com.monevo.account;

import com.monevo.account.entity.Account;
import com.monevo.account.entity.LedgerAccount;
import com.monevo.account.repository.AccountRepository;
import com.monevo.account.repository.LedgerAccountRepository;
import com.monevo.account.service.LedgerAccountLinkService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class LedgerAccountLinkServiceTest {
	@Mock
	AccountRepository accountRepository;
	@Mock
	LedgerAccountRepository ledgerAccountRepository;
	@InjectMocks
	LedgerAccountLinkService ledgerAccountLinkService;

	@Test
	void unlinksOnlyTheAccountsTheDepartingMemberOwns() {
		UUID ledgerId = UUID.randomUUID();
		UUID leavingId = UUID.randomUUID();
		UUID actorId = UUID.randomUUID();
		Account theirs = Account.real(leavingId, "salary", Account.Type.BANK, "JPY", null, (short) 0);
		LedgerAccount theirLink = LedgerAccount.create(ledgerId, theirs.getId());
		LedgerAccount someoneElsesLink = LedgerAccount.create(ledgerId, UUID.randomUUID());

		given(accountRepository.findByOwnerUserIdAndSubtypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(
			leavingId, Account.Subtype.REAL)).willReturn(List.of(theirs));
		given(ledgerAccountRepository.findByLedgerIdAndDeletedAtIsNull(ledgerId))
			.willReturn(List.of(theirLink, someoneElsesLink));

		ledgerAccountLinkService.unlinkOwnedAccounts(ledgerId, leavingId, actorId, Instant.now());

		assertThat(theirLink.getDeletedAt()).isNotNull();
		assertThat(theirLink.getDeletedBy()).isEqualTo(actorId);
		assertThat(someoneElsesLink.getDeletedAt()).isNull();
	}

	@Test
	void ownsNothingSoTheLedgerLinksAreNotEvenRead() {
		UUID leavingId = UUID.randomUUID();
		given(accountRepository.findByOwnerUserIdAndSubtypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(
			leavingId, Account.Subtype.REAL)).willReturn(List.of());

		ledgerAccountLinkService.unlinkOwnedAccounts(UUID.randomUUID(), leavingId, UUID.randomUUID(), Instant.now());

		verifyNoInteractions(ledgerAccountRepository);
	}

	@Test
	void deletingALedgerUnlinksEveryAccountRegardlessOfOwner() {
		UUID ledgerId = UUID.randomUUID();
		UUID actorId = UUID.randomUUID();
		LedgerAccount one = LedgerAccount.create(ledgerId, UUID.randomUUID());
		LedgerAccount two = LedgerAccount.create(ledgerId, UUID.randomUUID());
		given(ledgerAccountRepository.findByLedgerIdAndDeletedAtIsNull(ledgerId)).willReturn(List.of(one, two));

		ledgerAccountLinkService.unlinkAllInLedger(ledgerId, actorId, Instant.now());

		assertThat(one.getDeletedAt()).isNotNull();
		assertThat(two.getDeletedAt()).isNotNull();
	}
}
