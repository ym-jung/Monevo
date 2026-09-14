package com.monevo.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.security.JwtClaims;
import com.monevo.common.security.SecurityErrorResponder;
import com.monevo.user.service.AppUserService;
import com.nimbusds.jwt.JWTParser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(AppProperties.class)
public class SecurityConfig {
	private static final String BEARER_PREFIX = "Bearer ";

	private final AppProperties props;

	public SecurityConfig(AppProperties props) {
		this.props = props;
	}

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http,
									JwtDecoder jwtDecoder,
									AppUserService appUserService,
									RateLimitPolicy rateLimitPolicy,
									RateLimitBucketStore bucketStore,
									SecurityErrorResponder errorResponder) throws Exception {

		AuthenticationEntryPoint entryPoint = authenticationEntryPoint(errorResponder);
		AccessDeniedHandler deniedHandler = accessDeniedHandler(errorResponder);

		http

			.csrf(csrf -> csrf.disable())
			.formLogin(form -> form.disable())
			.httpBasic(basic -> basic.disable())
			.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.cors(props.cors().enabled() ? Customizer.withDefaults() : cors -> cors.disable())
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
				.requestMatchers(SecurityPaths.PUBLIC.toArray(String[]::new)).permitAll()
				.anyRequest().authenticated())
			.oauth2ResourceServer(oauth2 -> oauth2
				.jwt(jwt -> jwt.decoder(jwtDecoder))
				.authenticationEntryPoint(entryPoint)
				.accessDeniedHandler(deniedHandler))
			.exceptionHandling(ex -> ex
				.authenticationEntryPoint(entryPoint)
				.accessDeniedHandler(deniedHandler))
			.addFilterBefore(new IpRateLimitFilter(rateLimitPolicy, bucketStore, errorResponder),
				BearerTokenAuthenticationFilter.class)
			.addFilterAfter(new AppUserFilter(appUserService, errorResponder),
				BearerTokenAuthenticationFilter.class)

			.addFilterAfter(new UserRateLimitFilter(rateLimitPolicy, bucketStore, errorResponder),
				AppUserFilter.class)
			.addFilterAfter(new AccountStatusFilter(errorResponder),
				UserRateLimitFilter.class);

		return http.build();
	}

	@Bean
	JwtDecoder jwtDecoder() {
		AppProperties.Cognito cognito = props.cognito();

		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(cognito.jwkSetUri())
			.cache(new CaffeineCache("jwks",
				Caffeine.newBuilder().expireAfterWrite(cognito.jwksCacheTtl()).build()))
			.build();
		decoder.setJwtValidator(tokenValidator(cognito));
		return decoder;
	}

	static OAuth2TokenValidator<Jwt> tokenValidator(AppProperties.Cognito cognito) {
		return new DelegatingOAuth2TokenValidator<>(
			new JwtTimestampValidator(cognito.clockSkew()),
			new JwtIssuerValidator(cognito.issuer()),
			new JwtClaimValidator<>(JwtClaims.TOKEN_USE, JwtClaims.TOKEN_USE_ACCESS::equals),
			new JwtClaimValidator<>(JwtClaims.CLIENT_ID, cognito.appClientId()::equals));
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOriginPatterns(props.cors().allowedOriginPatterns());
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of(
			"Authorization", "Content-Type", "X-Request-Id", "X-Client-Version", "Accept-Language"));
		config.setExposedHeaders(List.of(
			"X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"));
		config.setAllowCredentials(false);
		config.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	private AuthenticationEntryPoint authenticationEntryPoint(SecurityErrorResponder errorResponder) {
		return (request, response, ex) -> errorResponder.write(request, response, authFailureCode(request));
	}

	private static ErrorCode authFailureCode(HttpServletRequest request) {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header == null || !header.startsWith(BEARER_PREFIX)) {
			return ErrorCode.UNAUTHENTICATED;
		}
		return expired(header.substring(BEARER_PREFIX.length())) ? ErrorCode.TOKEN_EXPIRED : ErrorCode.TOKEN_INVALID;
	}

	private static boolean expired(String token) {
		try {
			Date expiresAt = JWTParser.parse(token).getJWTClaimsSet().getExpirationTime();
			return expiresAt != null && expiresAt.toInstant().isBefore(Instant.now());
		} catch (ParseException e) {
			return false;
		}
	}

	private AccessDeniedHandler accessDeniedHandler(SecurityErrorResponder errorResponder) {
		return (request, response, ex) -> errorResponder.write(request, response, ErrorCode.FORBIDDEN);
	}
}
