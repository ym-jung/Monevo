package com.monevo.account.service;

import com.monevo.account.dto.CategoryCreateRequest;
import com.monevo.account.dto.CategoryKind;
import com.monevo.account.dto.CategoryNode;
import com.monevo.account.dto.CategoryUpdateRequest;
import com.monevo.account.entity.Account;
import com.monevo.account.repository.AccountRepository;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.common.error.types.ValidationException;
import com.monevo.journal.service.JournalLineQueryService;
import com.monevo.ledger.service.LedgerAccessChecker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class CategoryService {
	private static final short SORT_STEP = 10;

	private final AccountRepository accountRepository;
	private final JournalLineQueryService journalLineQueryService;
	private final LedgerAccessChecker ledgerAccessChecker;

	@Transactional(readOnly = true)
	public void requireLeafInLedger(UUID categoryId, UUID ledgerId) {
		Account category = requireCategory(categoryId);

		if (!category.getLedgerId().equals(ledgerId)) {
			throw new ValidationException(ErrorCode.CATEGORY_LEDGER_MISMATCH, "Category belongs to another ledger.");
		}

		if (accountRepository.existsByParentIdAndDeletedAtIsNull(categoryId)) {
			throw new ValidationException(ErrorCode.CATEGORY_NOT_LEAF, "Only leaf categories can hold journal lines.");
		}
	}

	@Transactional(readOnly = true)
	public Set<UUID> selfAndChildIds(Collection<UUID> categoryIds, UUID ledgerId) {
		if (categoryIds == null || categoryIds.isEmpty()) {
			return Set.of();
		}

		Set<UUID> selected = new LinkedHashSet<>(categoryIds);
		List<Account> categories = accountRepository.findAllById(selected).stream()
			.filter(account -> !account.isDeleted())
			.filter(Account::isCategory)
			.toList();
		if (categories.size() != selected.size()) {
			throw new NotFoundException(ErrorCode.CATEGORY_NOT_FOUND, "Cannot find category.");
		}
		if (categories.stream().anyMatch(category -> !category.getLedgerId().equals(ledgerId))) {
			throw new ValidationException(ErrorCode.CATEGORY_LEDGER_MISMATCH,
				"Category belongs to another ledger.");
		}

		Set<UUID> expanded = new LinkedHashSet<>(selected);
		accountRepository.findByParentIdInAndDeletedAtIsNull(selected).stream()
			.map(Account::getId)
			.forEach(expanded::add);
		return Set.copyOf(expanded);
	}

	@Transactional(readOnly = true)
	public List<CategoryNode> getCategoryTree(UUID ledgerId, CategoryKind kind, UUID requesterId) {
		ledgerAccessChecker.requireMember(ledgerId, requesterId);

		List<Account> categories = accountRepository
			.findByLedgerIdAndSubtypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(ledgerId, Account.Subtype.CATEGORY);

		List<Account> roots = categories.stream()
			.filter(Account::isRoot)
			.filter(c -> kind == null || c.getNature() == kind.toNature())
			.toList();
		Map<UUID, List<Account>> children = categories.stream()
			.filter(c -> !c.isRoot())
			.collect(Collectors.groupingBy(Account::getParentId));

		return roots.stream().map(root -> {
			List<CategoryNode> childNodes = children.getOrDefault(root.getId(), List.of())
				.stream().map(child -> CategoryNode.from(child, List.of()))
				.toList();

			return CategoryNode.from(root, childNodes);
		}).toList();
	}

	@Transactional
	public CategoryNode createCategory(UUID ledgerId, CategoryCreateRequest request, UUID requesterId) {
		ledgerAccessChecker.requireMember(ledgerId, requesterId);

		if (request.parentId() == null) {
			long sortOrder = accountRepository
				.countByLedgerIdAndSubtypeAndParentIdIsNullAndDeletedAtIsNull(ledgerId, Account.Subtype.CATEGORY)
				* SORT_STEP;

			Account saved = accountRepository.save(Account.category(ledgerId, null, request.name(),
				request.kind().toNature(), (short) sortOrder, false));

			return CategoryNode.from(saved, List.of());
		}

		Account parent = requireCategory(request.parentId());

		if (!parent.getLedgerId().equals(ledgerId)) {
			log.info("Category {}'s ledger {} differs from requested ledger {}, requested by {}",
				parent.getId(), parent.getLedgerId(), ledgerId, requesterId);
			throw new ValidationException(ErrorCode.CATEGORY_LEDGER_MISMATCH,
				"Parent ledger ID is different from requested ledger ID");
		}

		if (!parent.isRoot()) {
			log.info("Category {} already has a parent, requested by {}", parent.getId(), requesterId);
			throw new ValidationException(ErrorCode.CATEGORY_DEPTH_EXCEEDED, "Category depth cannot exceed 2 levels.");
		}

		if (journalLineQueryService.hasAnyLine(parent.getId())) {
			log.info("Category {} already has journal lines, requested by {}", parent.getId(), requesterId);
			throw new ConflictException(ErrorCode.CATEGORY_HAS_TRANSACTIONS,
				"This category already has transactions and cannot take children.");
		}

		if (parent.getNature() != request.kind().toNature()) {
			log.info("Category {}'s nature {} differs from requested kind {}, requested by {}",
				parent.getId(), parent.getNature(), request.kind(), requesterId);
			throw new ValidationException(ErrorCode.CATEGORY_KIND_MISMATCH, "Parent kind is different from requested kind");
		}

		long sortOrder = accountRepository.countByParentIdAndDeletedAtIsNull(parent.getId()) * SORT_STEP;

		Account saved = accountRepository.save(Account.category(ledgerId, parent.getId(), request.name(),
			request.kind().toNature(), (short) sortOrder, false));

		return CategoryNode.from(saved, List.of());
	}

	@Transactional
	public CategoryNode updateCategory(UUID categoryId, CategoryUpdateRequest request, UUID requesterId) {
		Account target = requireCategory(categoryId);

		ledgerAccessChecker.requireMember(target.getLedgerId(), requesterId);

		if (request.name() != null) {
			target.rename(request.name());
		}

		if (request.sortOrder() != null) {
			target.reorder(request.sortOrder());
		}

		List<CategoryNode> childNodes = accountRepository
			.findByParentIdAndDeletedAtIsNullOrderBySortOrderAscNameAsc(target.getId()).stream()
			.map(child -> CategoryNode.from(child, List.of())).toList();

		return CategoryNode.from(accountRepository.saveAndFlush(target), childNodes);
	}

	@Transactional
	public void deleteCategory(UUID categoryId, UUID requesterId) {
		Account target = requireCategory(categoryId);

		ledgerAccessChecker.requireMember(target.getLedgerId(), requesterId);

		if (accountRepository.existsByParentIdAndDeletedAtIsNull(categoryId)) {
			log.info("Category {} has children, requested by {}", categoryId, requesterId);
			throw new ConflictException(ErrorCode.CATEGORY_HAS_CHILDREN, "This category has children category.");
		}

		if (journalLineQueryService.hasAnyLine(categoryId)) {
			log.info("Category {} has journal lines, requested by {}", categoryId, requesterId);
			throw new ConflictException(ErrorCode.CATEGORY_HAS_TRANSACTIONS, "This category has transactions.");
		}

		target.softDelete(requesterId, Instant.now());
	}

	@Transactional(readOnly = true)
	public Map<UUID, Account> categoriesByIds(Collection<UUID> categoryIds) {
		if (categoryIds == null || categoryIds.isEmpty()) {
			return Map.of();
		}

		Map<UUID, Account> found = accountRepository.findAllById(categoryIds).stream()
			.filter(account -> !account.isDeleted())
			.filter(Account::isCategory)
			.collect(Collectors.toMap(Account::getId, account -> account));

		List<UUID> parentIds = found.values().stream()
			.map(Account::getParentId)
			.filter(Objects::nonNull)
			.filter(id -> !found.containsKey(id))
			.distinct()
			.toList();

		if (parentIds.isEmpty()) {
			return found;
		}

		Map<UUID, Account> merged = new HashMap<>(found);
		accountRepository.findAllById(parentIds).stream()
			.filter(account -> !account.isDeleted())
			.forEach(account -> merged.put(account.getId(), account));
		return merged;
	}

	private Account requireCategory(UUID categoryId) {
		return accountRepository
			.findByIdAndSubtypeAndDeletedAtIsNull(categoryId, Account.Subtype.CATEGORY)
			.orElseThrow(() -> new NotFoundException(ErrorCode.CATEGORY_NOT_FOUND, "Cannot find category."));
	}
}
