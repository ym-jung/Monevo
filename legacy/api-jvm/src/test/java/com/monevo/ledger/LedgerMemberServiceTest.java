package com.monevo.ledger;

import com.monevo.account.service.LedgerAccountLinkService;
import com.monevo.ledger.entity.LedgerMember;
import com.monevo.ledger.repository.LedgerMemberRepository;
import com.monevo.ledger.service.LedgerAccessChecker;
import com.monevo.ledger.service.LedgerMemberService;
import com.monevo.user.entity.AppUser;
import com.monevo.user.service.AppUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LedgerMemberServiceTest {
	@Mock
	LedgerMemberRepository ledgerMemberRepository;
	@Mock
	LedgerAccessChecker ledgerAccessChecker;
	@Mock
	AppUserService appUserService;
	@Mock
	LedgerAccountLinkService ledgerAccountLinkService;
	@InjectMocks
	LedgerMemberService ledgerMemberService;

	@Test
	void listsDisplayNamesWithOneUserLookup() {
		UUID ledgerId = UUID.randomUUID();
		UUID requesterId = UUID.randomUUID();
		AppUser owner = AppUser.register(UUID.randomUUID(), "owner@test.local", "Owner name", "JPY", "en", "UTC");
		AppUser member = AppUser.register(UUID.randomUUID(), "member@test.local", "Member name", "JPY", "en", "UTC");
		List<LedgerMember> memberships = List.of(
			LedgerMember.owner(ledgerId, owner.getId()),
			LedgerMember.joinedByInvite(ledgerId, member.getId(), UUID.randomUUID())
		);

		given(ledgerMemberRepository.findByLedgerIdAndDeletedAtIsNull(ledgerId)).willReturn(memberships);
		given(appUserService.usersByIds(List.of(owner.getId(), member.getId())))
			.willReturn(Map.of(owner.getId(), owner, member.getId(), member));

		var result = ledgerMemberService.getLedgerMembers(ledgerId, requesterId);

		assertThat(result)
			.extracting(detail -> detail.userId(), detail -> detail.displayName())
			.containsExactly(
				tuple(owner.getId(), "Owner name"),
				tuple(member.getId(), "Member name")
			);
		verify(appUserService).usersByIds(List.of(owner.getId(), member.getId()));
	}

	@Test
	void leavingUnlinksAccountsOwnedByTheDepartingMember() {
		UUID ledgerId = UUID.randomUUID();
		UUID memberId = UUID.randomUUID();
		LedgerMember membership = LedgerMember.joinedByInvite(ledgerId, memberId, UUID.randomUUID());

		given(ledgerAccessChecker.requireMember(ledgerId, memberId)).willReturn(membership);

		ledgerMemberService.exitFromLedger(ledgerId, memberId);

		verify(ledgerAccountLinkService)
			.unlinkOwnedAccounts(eq(ledgerId), eq(memberId), eq(memberId), any(Instant.class));
		assertThat(membership.getDeletedAt()).isNotNull();
		assertThat(membership.getDeletedBy()).isEqualTo(memberId);
	}
}
