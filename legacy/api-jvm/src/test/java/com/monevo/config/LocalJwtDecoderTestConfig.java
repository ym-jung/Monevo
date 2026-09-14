package com.monevo.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@TestConfiguration
public class LocalJwtDecoderTestConfig {

	@Bean
	@Primary
	JwtDecoder testJwtDecoder(AppProperties props) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(TestJwtFactory.publicKey()).build();
		decoder.setJwtValidator(SecurityConfig.tokenValidator(props.cognito()));
		return decoder;
	}
}
