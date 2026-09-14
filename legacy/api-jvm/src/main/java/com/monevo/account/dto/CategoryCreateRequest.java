package com.monevo.account.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CategoryCreateRequest(
	@NotBlank @Size(max = 40) String name,
	@NotNull CategoryKind kind,
	UUID parentId
) {
}
