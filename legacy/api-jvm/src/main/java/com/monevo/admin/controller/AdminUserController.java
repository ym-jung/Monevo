package com.monevo.admin.controller;

import com.monevo.admin.dto.AdminUserSummary;
import com.monevo.admin.dto.RejectUserRequest;
import com.monevo.admin.dto.UpdateUserStatusRequest;
import com.monevo.admin.service.AdminUserService;
import com.monevo.common.response.ApiResponse;
import com.monevo.common.response.PageResponse;
import com.monevo.common.security.CurrentUser;
import com.monevo.user.entity.AppUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {

	private static final int MAX_PAGE_SIZE = 100;
	static final Sort LIST_SORT = Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));

	private final AdminUserService adminUserService;

	@GetMapping
	public ApiResponse.Success<PageResponse<AdminUserSummary>> list(
		@RequestParam(required = false) AppUser.Status status,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "50") int size) {
		Page<AppUser> found = adminUserService.list(status,
			PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), LIST_SORT));
		return ApiResponse.ok(PageResponse.from(found,
			found.getContent().stream().map(AdminUserSummary::from).toList()));
	}

	@PostMapping("/{id}/approve")
	public ApiResponse.Success<AdminUserSummary> approve(@AuthenticationPrincipal CurrentUser me,
												@PathVariable UUID id) {
		return ApiResponse.ok(AdminUserSummary.from(adminUserService.approve(me.id(), id)));
	}

	@PostMapping("/{id}/reject")
	public ApiResponse.Success<AdminUserSummary> reject(@AuthenticationPrincipal CurrentUser me,
												@PathVariable UUID id,
												@Valid @RequestBody(required = false) RejectUserRequest request) {
		return ApiResponse.ok(AdminUserSummary.from(
			adminUserService.reject(me.id(), id, request == null ? null : request.reason())));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID id) {
		adminUserService.delete(me.id(), id);
	}

	@PatchMapping("/{id}/status")
	public ApiResponse.Success<AdminUserSummary> changeStatus(@AuthenticationPrincipal CurrentUser me,
													@PathVariable UUID id,
													@Valid @RequestBody UpdateUserStatusRequest request) {
		AppUser.Status next = AppUser.Status.valueOf(request.status());
		return ApiResponse.ok(AdminUserSummary.from(adminUserService.changeStatus(me.id(), id, next)));
	}
}
