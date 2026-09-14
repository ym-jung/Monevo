package com.monevo.account.controller;

import com.monevo.account.dto.CategoryCreateRequest;
import com.monevo.account.dto.CategoryKind;
import com.monevo.account.dto.CategoryNode;
import com.monevo.account.dto.CategoryUpdateRequest;
import com.monevo.account.service.CategoryService;
import com.monevo.common.response.ApiResponse;
import com.monevo.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class CategoryController {
	private final CategoryService categoryService;

	@GetMapping("/api/v1/ledgers/{ledgerId}/categories")
	public ApiResponse.Success<List<CategoryNode>> getCategoryTree(@PathVariable UUID ledgerId,
																@RequestParam(required = false) CategoryKind kind,
																@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(categoryService.getCategoryTree(ledgerId, kind, me.id()));
	}

	@PostMapping("/api/v1/ledgers/{ledgerId}/categories")
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse.Success<CategoryNode> createCategory(@PathVariable UUID ledgerId,
															@Valid @RequestBody CategoryCreateRequest request,
															@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(categoryService.createCategory(ledgerId, request, me.id()));
	}

	@PatchMapping("/api/v1/categories/{id}")
	public ApiResponse.Success<CategoryNode> updateCategory(@PathVariable("id") UUID categoryId,
															@Valid @RequestBody CategoryUpdateRequest request,
															@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(categoryService.updateCategory(categoryId, request, me.id()));
	}

	@DeleteMapping("/api/v1/categories/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteCategory(@PathVariable("id") UUID categoryId,
							@AuthenticationPrincipal CurrentUser me) {
		categoryService.deleteCategory(categoryId, me.id());
	}
}
