package com.monevo.common.error;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorMessageBundleTest {

	private static final Set<String> CODES = Arrays.stream(ErrorCode.values())
		.map(Enum::name)
		.collect(Collectors.toSet());

	@ParameterizedTest(name = "{0}")
	@ValueSource(strings = {"messages.properties", "messages_en.properties",
		"messages_ko.properties", "messages_ja.properties"})
	@DisplayName("bundle keys match ErrorCode exactly")
	void bundleCoversEveryCode(String bundle) throws Exception {
		Properties props = load(bundle);
		Set<String> keys = props.stringPropertyNames();

		assertThat(keys).as("codes with no message in %s", bundle).containsAll(CODES);
		assertThat(CODES).as("leftover keys in %s", bundle).containsAll(keys);
		assertThat(keys).allSatisfy(key ->
			assertThat(props.getProperty(key)).as("%s in %s", key, bundle).isNotBlank());
	}

	@ParameterizedTest(name = "{0}")
	@ValueSource(strings = {"messages_ko.properties", "messages_ja.properties"})
	@DisplayName("the translated bundles are actually translated")
	void translationsDifferFromTheDefault(String bundle) throws Exception {
		Properties fallback = load("messages.properties");
		Properties translated = load(bundle);

		assertThat(translated.stringPropertyNames())
			.as("%s still carries the English line", bundle)
			.allSatisfy(key -> assertThat(translated.getProperty(key))
				.isNotEqualTo(fallback.getProperty(key)));
	}

	private static Properties load(String bundle) throws Exception {
		Properties props = new Properties();
		try (InputStream in = ErrorMessageBundleTest.class.getClassLoader().getResourceAsStream(bundle)) {
			assertThat(in).as("%s is missing from the classpath", bundle).isNotNull();

			props.load(new InputStreamReader(in, StandardCharsets.UTF_8));
		}
		return props;
	}
}
