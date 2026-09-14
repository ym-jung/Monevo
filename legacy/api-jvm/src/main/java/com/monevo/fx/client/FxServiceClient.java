package com.monevo.fx.client;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ExternalServiceException;
import com.monevo.fx.dto.FxRateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class FxServiceClient {

	private final RestClient fxRestClient;

	public Optional<FxQuote> fetch(String base, String quote, LocalDate date) {
		try {
			return fxRestClient.get()
				.uri(uriBuilder -> {
					uriBuilder.path(date == null ? "/rates" : "/rates/historical")
						.queryParam("base", base)
						.queryParam("quote", quote);

					if (date != null) {
						uriBuilder.queryParam("date", date.toString());
					}
					return uriBuilder.build();
				})
				.exchange((req, res) -> {
					if (res.getStatusCode().is2xxSuccessful()) {
						FxRateResponse body = res.bodyTo(FxRateResponse.class);

						BigDecimal decimalRate = new BigDecimal(body.rate());

						FxQuote fxQuote = new FxQuote(decimalRate, body.asOf(), body.source());

						return Optional.of(fxQuote);
					} else {
						try {
							SidecarError errBody = res.bodyTo(SidecarError.class);

							if (errBody != null && errBody.error() != null && errBody.error().code() != null) {
								log.info("FX Sidecar error: {}", errBody.error().code());
								return Optional.empty();
							}
						} catch (Exception ignored) {
						}
						throw new ExternalServiceException(ErrorCode.FX_SERVICE_UNAVAILABLE, "FX Sidecar error: " + res.getStatusCode());
					}
				});
		} catch (RestClientException ex) {
			log.error("Cannot connect to FX Sidecar");
			throw new ExternalServiceException(ErrorCode.FX_SERVICE_UNAVAILABLE, "Cannot connect to FX sidecar ", ex);
		}

	}

	private record ErrorDetail(String code, String message) {
	}

	private record SidecarError(ErrorDetail error) {
	}
}
