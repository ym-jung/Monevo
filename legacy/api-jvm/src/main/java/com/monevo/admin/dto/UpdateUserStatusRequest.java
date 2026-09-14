package com.monevo.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateUserStatusRequest(
	@NotBlank @Pattern(regexp = "SUSPENDED|ACTIVE") String status) {
}
