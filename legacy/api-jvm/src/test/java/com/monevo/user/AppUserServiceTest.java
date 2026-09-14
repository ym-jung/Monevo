package com.monevo.user;

import com.monevo.common.security.CurrentUser;
import com.monevo.config.AppProperties;
import com.monevo.user.entity.AppUser;
import com.monevo.user.repository.AppUserRepository;
import com.monevo.user.service.AppUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class AppUserServiceTest {
	@Mock
	AppUserRepository appUserRepository;
	@Mock
	AppProperties appProperties;
	@Mock
	AppProperties.Security security;

	AppUserService appUserService;
	AppUser user;

	@BeforeEach
	void setUp() {
		lenient().when(appProperties.security()).thenReturn(security);
		lenient().when(security.appUserCacheTtl()).thenReturn(Duration.ofSeconds(30));
		appUserService = new AppUserService(appUserRepository, appProperties);

		user = AppUser.register(UUID.randomUUID(), "someone@test.local", "Someone", "JPY", "en", "UTC");
		lenient().when(appUserRepository.findByCognitoSub(user.getCognitoSub())).thenReturn(Optional.of(user));
		lenient().when(appUserRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
	}

	@Test
	@DisplayName("changing the locale clears the cached principal, which carries it")
	void localeChangeEvictsThePrincipal() {
		CurrentUser before = appUserService.findOrProvision(user.getCognitoSub(), user.getEmail()).orElseThrow();
		assertThat(before.locale()).isEqualTo("en");

		appUserService.updateProfile(user.getId(), null, null, null, "ko", null);

		CurrentUser after = appUserService.findOrProvision(user.getCognitoSub(), user.getEmail()).orElseThrow();
		assertThat(after.locale()).isEqualTo("ko");
	}

	@Test
	@DisplayName("changing the email clears it too")
	void emailChangeEvictsThePrincipal() {
		appUserService.findOrProvision(user.getCognitoSub(), user.getEmail());

		appUserService.updateProfile(user.getId(), "moved@test.local", null, null, null, null);

		CurrentUser after = appUserService.findOrProvision(user.getCognitoSub(), user.getEmail()).orElseThrow();
		assertThat(after.email()).isEqualTo("moved@test.local");
	}

	@Test
	@DisplayName("a field the principal does not carry leaves the cache alone")
	void timezoneChangeDoesNotEvict() {
		CurrentUser before = appUserService.findOrProvision(user.getCognitoSub(), user.getEmail()).orElseThrow();

		appUserService.updateProfile(user.getId(), null, "New name", null, null, "Asia/Seoul");

		CurrentUser after = appUserService.findOrProvision(user.getCognitoSub(), user.getEmail()).orElseThrow();
		assertThat(after).isSameAs(before);
	}
}
