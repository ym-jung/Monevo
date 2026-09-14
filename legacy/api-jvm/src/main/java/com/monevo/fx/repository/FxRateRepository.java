package com.monevo.fx.repository;

import com.monevo.fx.entity.FxRate;
import com.monevo.fx.entity.FxRateId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface FxRateRepository extends JpaRepository<FxRate, FxRateId> {

	Optional<FxRate> findByBaseAndQuoteAndRateDate(String base, String quote, LocalDate rateDate);

	Optional<FxRate> findFirstByBaseAndQuoteAndRateDateLessThanEqualOrderByRateDateDesc(
		String base, String quote, LocalDate rateDate);
}
