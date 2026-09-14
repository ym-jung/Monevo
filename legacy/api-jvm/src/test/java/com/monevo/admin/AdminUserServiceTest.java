package com.monevo.admin;

import com.monevo.admin.service.AdminUserService;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.ledger.service.LedgerMemberService;
import com.monevo.user.entity.AppUser;
import com.monevo.user.service.AppUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {
	@Mock
	AppUserService appUserService;
	@Mock
	LedgerMemberService ledgerMemberService;
	@InjectMocks
	AdminUserService adminUserService;

	UUID adminId;
	AppUser target;

	@BeforeEach
	void setUp() {
		adminId = UUID.randomUUID();
		target = AppUser.register(UUID.randomUUID(), "someone@test.local", "Someone", "JPY", "en", "UTC");
		lenient().when(appUserService.require(target.getId())).thenReturn(target);
	}

	@Test
	@DisplayName("a rejection keeps the reason it was given")
	void rejectionStoresTheReason() {
		adminUserService.reject(adminId, target.getId(), "not a real person");

		assertThat(target.getStatus()).isEqualTo(AppUser.Status.REJECTED);
		assertThat(target.getRejectReason()).isEqualTo("not a real person");
	}

	@Test
	@DisplayName("reactivating a rejected user drops the reason rather than leaving it behind")
	void reactivatingClearsAStaleReason() {
		adminUserService.reject(adminId, target.getId(), "mistake");

		adminUserService.changeStatus(adminId, target.getId(), AppUser.Status.ACTIVE);

		assertThat(target.getStatus()).isEqualTo(AppUser.Status.ACTIVE);
		assertThat(target.getRejectReason()).isNull();
	}

	@Test
	@DisplayName("deleting takes the user out of every ledger and clears the principal cache")
	void deleteRemovesMembershipsAndEvicts() {
		given(ledgerMemberService.ownedLedgerIds(target.getId())).willReturn(List.of());

		adminUserService.delete(adminId, target.getId());

		verify(ledgerMemberService).removeFromEveryLedger(target.getId(), adminId);
		verify(appUserService).evict(target.getCognitoSub());
		assertThat(target.getStatus()).isEqualTo(AppUser.Status.DELETED);
	}

	@Test
	@DisplayName("an owner cannot be deleted - a ledger has no way to exist without one")
	void deleteRefusesALedgerOwner() {
		given(ledgerMemberService.ownedLedgerIds(target.getId())).willReturn(List.of(UUID.randomUUID()));

		assertThatThrownBy(() -> adminUserService.delete(adminId, target.getId()))
			.isInstanceOf(ConflictException.class)
			.extracting(error -> ((ConflictException) error).code())
			.isEqualTo(ErrorCode.LEDGER_OWNER_CANNOT_LEAVE);

		verify(ledgerMemberService, never()).removeFromEveryLedger(target.getId(), adminId);
		assertThat(target.getStatus()).isNotEqualTo(AppUser.Status.DELETED);
	}

	@Test
	@DisplayName("an admin cannot delete themselves")
	void deleteRefusesSelf() {
		assertThatThrownBy(() -> adminUserService.delete(adminId, adminId))
			.isInstanceOf(ConflictException.class)
			.extracting(error -> ((ConflictException) error).code())
			.isEqualTo(ErrorCode.CANNOT_MODIFY_SELF);
	}
}
