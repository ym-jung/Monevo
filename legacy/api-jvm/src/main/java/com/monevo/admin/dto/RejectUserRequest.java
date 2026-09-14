package com.monevo.admin.dto;

import jakarta.validation.constraints.Size;

public record RejectUserRequest(@Size(max = 200) String reason) {
}
