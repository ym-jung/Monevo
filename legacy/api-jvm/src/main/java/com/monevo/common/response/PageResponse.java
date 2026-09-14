package com.monevo.common.response;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

public record PageResponse<T>(
	List<T> items,
	int page,
	int size,
	long totalElements,
	int totalPages,
	boolean hasNext) {
	public <R> PageResponse<R> map(Function<? super T, ? extends R> mapper) {
		return new PageResponse<>(items.stream().<R>map(mapper).toList(),
			page, size, totalElements, totalPages, hasNext);
	}

	public static <T> PageResponse<T> from(Page<T> page) {
		return new PageResponse<>(
			page.getContent(),
			page.getNumber(),
			page.getSize(),
			page.getTotalElements(),
			page.getTotalPages(),
			page.hasNext());
	}

	public static <E, T> PageResponse<T> from(Page<E> page, List<T> mappedItems) {
		return new PageResponse<>(
			mappedItems,
			page.getNumber(),
			page.getSize(),
			page.getTotalElements(),
			page.getTotalPages(),
			page.hasNext());
	}
}
