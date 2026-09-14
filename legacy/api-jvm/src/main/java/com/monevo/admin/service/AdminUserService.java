package com.monevo.admin.service;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.ledger.service.LedgerMemberService;
import com.monevo.user.entity.AppUser;
import com.monevo.user.service.AppUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminUserService {

	private final AppUserService appUserService;
	private final LedgerMemberService ledgerMemberService;

	@Transactional(readOnly = true)
	public Page<AppUser> list(AppUser.Status status, Pageable pageable) {
		return status == null
			? appUserService.findAllIncludingDeleted(pageable)
			: appUserService.findLiveByStatus(status, pageable);
	}

	@Transactional
	public AppUser approve(UUID adminId, UUID targetId) {
		AppUser target = requirePendingOther(adminId, targetId);
		target.approve(adminId);
		appUserService.evict(target.getCognitoSub());
		log.info("Admin {} approved user {}", adminId, targetId);
		return target;
	}

	@Transactional
	public AppUser reject(UUID adminId, UUID targetId, String reason) {
		AppUser target = requirePendingOther(adminId, targetId);
		target.reject(adminId, reason);
		appUserService.evict(target.getCognitoSub());
		log.info("Admin {} rejected user {}", adminId, targetId);
		return target;
	}

	@Transactional
	public AppUser changeStatus(UUID adminId, UUID targetId, AppUser.Status next) {
		AppUser target = requireOther(adminId, targetId);
		switch (next) {
			case SUSPENDED -> target.suspend(adminId);
			case ACTIVE -> target.reactivate(adminId);
			default -> throw new ConflictException(ErrorCode.VALIDATION_FAILED,
				"Unsupported status transition: " + next);
		}
		appUserService.evict(target.getCognitoSub());
		log.info("Admin {} changed status of user {} to {}", adminId, targetId, next);
		return target;
	}

	@Transactional
	public void delete(UUID adminId, UUID targetId) {
		AppUser target = requireOther(adminId, targetId);

		List<UUID> owned = ledgerMemberService.ownedLedgerIds(targetId);
		if (!owned.isEmpty()) {
			throw new ConflictException(ErrorCode.LEDGER_OWNER_CANNOT_LEAVE,
				"User " + targetId + " still owns " + owned.size() + " ledger(s)");
		}

		ledgerMemberService.removeFromEveryLedger(targetId, adminId);
		target.softDelete();
		appUserService.evict(target.getCognitoSub());
		log.info("Admin {} deleted user {}", adminId, targetId);
	}

	private AppUser requirePendingOther(UUID adminId, UUID targetId) {
		AppUser target = requireOther(adminId, targetId);
		if (target.getStatus() != AppUser.Status.PENDING) {
			throw new ConflictException(ErrorCode.USER_ALREADY_PROCESSED,
				"User " + targetId + " is already " + target.getStatus());
		}
		return target;
	}

	private AppUser requireOther(UUID adminId, UUID targetId) {
		if (adminId.equals(targetId)) {
			throw new ConflictException(ErrorCode.CANNOT_MODIFY_SELF, "Cannot modify your own account.");
		}
		return appUserService.require(targetId);
	}
}
