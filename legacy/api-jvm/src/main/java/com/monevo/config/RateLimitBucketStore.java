package com.monevo.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.monevo.config.AppProperties.Quota;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class RateLimitBucketStore {

	private final Cache<String, Bucket> cache;

	public RateLimitBucketStore() {
		this.cache = Caffeine.newBuilder()
			.expireAfterAccess(Duration.ofHours(1))
			.maximumSize(100_000L)
			.build();
	}

	public Bucket resolve(String key, Quota quota) {
		return cache.get(key, k -> Bucket.builder()
			.addLimit(limit -> limit.capacity(quota.capacity())
				.refillGreedy(quota.capacity(), quota.window()))
			.build());
	}
}
