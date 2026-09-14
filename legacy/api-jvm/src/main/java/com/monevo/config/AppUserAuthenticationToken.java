package com.monevo.config;

import com.monevo.common.security.CurrentUser;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;
import java.util.List;

public class AppUserAuthenticationToken extends AbstractAuthenticationToken {

	private final CurrentUser principal;
	private final transient Jwt credentials;

	public AppUserAuthenticationToken(CurrentUser principal, Jwt credentials,
									Collection<? extends GrantedAuthority> authorities) {
		super(authorities);
		this.principal = principal;
		this.credentials = credentials;
		setAuthenticated(true);
	}

	@Override
	public CurrentUser getPrincipal() {
		return principal;
	}

	@Override
	public Jwt getCredentials() {
		return credentials;
	}

	public static Collection<? extends GrantedAuthority> authoritiesOf(CurrentUser.Role role) {
		if (role == CurrentUser.Role.ADMIN) {
			return List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_USER"));
		}
		return List.of(new SimpleGrantedAuthority("ROLE_USER"));
	}
}
