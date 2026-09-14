package com.monevo.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
	@Email @Size(max = 255) String email,
	@Size(max = 60) String displayName,
	@Size(min = 3, max = 3) String displayCurrency,
	@Size(max = 10) String locale,
	@Size(max = 64) String timezone) {
}
