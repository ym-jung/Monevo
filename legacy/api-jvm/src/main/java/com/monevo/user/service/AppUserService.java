package com.monevo.user.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.common.security.CurrentUser;
import com.monevo.config.AppProperties;
import com.monevo.user.entity.AppUser;
import com.monevo.user.repository.AppUserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AppUserService {

	private static final String DEFAULT_CURRENCY = "USD";
	private static final String DEFAULT_LOCALE = "en";
	private static final String DEFAULT_TIMEZONE = "UTC";
	private static final int DISPLAY_NAME_MAX = 60;

	private final AppUserRepository appUserRepository;
	private final Cache<UUID, CurrentUser> cache;

	public AppUserService(AppUserRepository appUserRepository, AppProperties properties) {
		this.appUserRepository = appUserRepository;
		this.cache = Caffeine.newBuilder()
			.expireAfterWrite(properties.security().appUserCacheTtl())
			.maximumSize(10_000L)
			.build();
	}

	private static String placeholderEmail(UUID cognitoSub) {
		return cognitoSub + "@unknown.local";
	}

	private static String displayNameFrom(String email) {
		int at = email == null ? -1 : email.indexOf('@');
		String base = at > 0 ? email.substring(0, at) : "user";
		return base.length() > DISPLAY_NAME_MAX ? base.substring(0, DISPLAY_NAME_MAX) : base;
	}

	private static CurrentUser toPrincipal(AppUser user) {
		return new CurrentUser(
			user.getId(),
			user.getCognitoSub(),
			user.getEmail(),
			CurrentUser.Role.valueOf(user.getRole().name()),
			CurrentUser.Status.valueOf(user.getStatus().name()),
			user.getLocale());
	}

	static String normalizeEmail(String email) {
		return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
	}

	@Transactional
	public Optional<CurrentUser> findOrProvision(UUID cognitoSub, String email) {
		CurrentUser cached = cache.getIfPresent(cognitoSub);
		if (cached != null) {
			return Optional.of(cached);
		}

		Optional<AppUser> existing = appUserRepository.findByCognitoSub(cognitoSub);
		if (existing.isPresent()) {
			AppUser user = existing.get();
			if (user.isDeleted()) {
				return Optional.empty();
			}
			return Optional.of(cachePrincipal(user));
		}

		AppUser created = appUserRepository.save(AppUser.register(
			cognitoSub,
			email == null ? placeholderEmail(cognitoSub) : email,
			displayNameFrom(email),
			DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_TIMEZONE));
		return Optional.of(cachePrincipal(created));
	}

	public void evict(UUID cognitoSub) {
		if (cognitoSub != null) {
			cache.invalidate(cognitoSub);
		}
	}

	public void evictAll() {
		cache.invalidateAll();
	}

	@Transactional(readOnly = true)
	public String displayNameOf(UUID userId) {
		return appUserRepository.findByIdAndDeletedAtIsNull(userId)
			.map(AppUser::getDisplayName)
			.orElse(null);
	}

	@Transactional(readOnly = true)
	public Map<UUID, String> displayNamesByIds(Collection<UUID> userIds) {
		return usersByIds(userIds).values().stream()
			.collect(Collectors.toMap(AppUser::getId, AppUser::getDisplayName));
	}

	@Transactional(readOnly = true)
	public boolean isActive(UUID userId) {
		return userId != null && appUserRepository.findByIdAndDeletedAtIsNull(userId)
			.map(AppUser::isActive)
			.orElse(false);
	}

	@Transactional(readOnly = true)
	public AppUser require(UUID id) {
		return appUserRepository.findByIdAndDeletedAtIsNull(id)
			.orElseThrow(() -> new NotFoundException(ErrorCode.USER_NOT_FOUND, "app_user not found: " + id));
	}

	@Transactional(readOnly = true)
	public Page<AppUser> findAllIncludingDeleted(Pageable pageable) {
		return appUserRepository.findAll(pageable);
	}

	@Transactional(readOnly = true)
	public Page<AppUser> findLiveByStatus(AppUser.Status status, Pageable pageable) {
		return appUserRepository.findByStatusAndDeletedAtIsNull(status, pageable);
	}

	@Transactional(readOnly = true)
	public Map<UUID, AppUser> usersByIds(Collection<UUID> userIds) {
		if (userIds == null || userIds.isEmpty()) {
			return Map.of();
		}
		return appUserRepository.findByIdInAndDeletedAtIsNull(userIds).stream()
			.collect(Collectors.toMap(AppUser::getId, user -> user));
	}

	@Transactional
	public AppUser updateProfile(UUID userId, String email, String displayName, String displayCurrency,
								String locale, String timezone) {
		AppUser user = require(userId);
		boolean principalChanged = replaces(email, user.getEmail()) || replaces(locale, user.getLocale());

		user.updateProfile(email, displayName, displayCurrency, locale, timezone);

		if (principalChanged) {
			evict(user.getCognitoSub());
		}
		return user;
	}

	private static boolean replaces(String incoming, String current) {
		return incoming != null && !incoming.equals(current);
	}

	private CurrentUser cachePrincipal(AppUser user) {
		CurrentUser principal = toPrincipal(user);
		cache.put(user.getCognitoSub(), principal);
		return principal;
	}
}
