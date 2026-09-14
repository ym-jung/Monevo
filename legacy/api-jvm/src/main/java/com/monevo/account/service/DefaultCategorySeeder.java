package com.monevo.account.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.monevo.account.dto.CategoryKind;
import com.monevo.account.entity.Account;
import com.monevo.account.repository.AccountRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class DefaultCategorySeeder {
	private static final String SEED_PATH_KO = "seed/default-categories-ko.json";
	private static final String SEED_PATH_JA = "seed/default-categories-ja.json";
	private static final String SEED_PATH_EN = "seed/default-categories-en.json";

	private static final short SORT_STEP = 10;

	private final AccountRepository accountRepository;
	private final Map<String, List<SeedNode>> template;

	public DefaultCategorySeeder(AccountRepository accountRepository, ObjectMapper objectMapper) {
		this.accountRepository = accountRepository;
		this.template = loadTemplate(objectMapper);
	}

	private static Map<String, List<SeedNode>> loadTemplate(ObjectMapper objectMapper) {
		return Map.of(
			"ko", loadSeed(objectMapper, SEED_PATH_KO),
			"ja", loadSeed(objectMapper, SEED_PATH_JA),
			"en", loadSeed(objectMapper, SEED_PATH_EN)
		);
	}

	private static List<SeedNode> loadSeed(ObjectMapper objectMapper, String path) {
		try (InputStream in = new ClassPathResource(path).getInputStream()) {
			return List.copyOf(objectMapper.readValue(in, SeedFile.class).categories());
		} catch (IOException e) {
			throw new IllegalStateException("cannot read " + path, e);
		}
	}

	public void seed(UUID ledgerId, String locale) {
		List<Account> roots = new ArrayList<>();
		List<Account> children = new ArrayList<>();

		List<SeedNode> seedNodeList = template.getOrDefault(locale, template.get("en"));

		for (int i = 0; i < seedNodeList.size(); i++) {
			SeedNode node = seedNodeList.get(i);
			Account.Nature nature = node.kind().toNature();

			Account root = Account.category(ledgerId, null, node.name(), nature, (short) (i * SORT_STEP), true);
			roots.add(root);

			List<String> names = node.children();
			for (int j = 0; j < names.size(); j++) {
				children.add(Account.category(ledgerId, root.getId(), names.get(j), nature,
					(short) (j * SORT_STEP), true));
			}
		}

		accountRepository.saveAll(roots);
		accountRepository.flush();
		accountRepository.saveAll(children);
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private record SeedFile(List<SeedNode> categories) {
	}

	private record SeedNode(CategoryKind kind, String name, List<String> children) {
	}
}
