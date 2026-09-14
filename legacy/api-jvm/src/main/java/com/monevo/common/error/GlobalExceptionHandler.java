package com.monevo.common.error;

import com.monevo.common.error.dto.ErrorDetail;
import com.monevo.common.response.ApiResponse;
import com.monevo.common.util.RequestContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;
import java.util.Locale;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {
	private static final String ADMIN_PATH_PREFIX = "/api/v1/admin";

	private final MessageSource messageSource;

	@ExceptionHandler(BusinessException.class)
	public ResponseEntity<ApiResponse.Failure> handleBusinessException(BusinessException ex, Locale locale) {
		return build(ex.status(), ex.code(), ex.details(), locale);
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ApiResponse.Failure> handleNoResource(NoResourceFoundException ex, Locale locale) {
		return build(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, List.of(), locale);
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ApiResponse.Failure> handleMethodNotAllowed(
		HttpRequestMethodNotSupportedException ex, Locale locale) {
		return build(HttpStatus.METHOD_NOT_ALLOWED, ErrorCode.METHOD_NOT_ALLOWED, List.of(), locale);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiResponse.Failure> handleUnreadableBody(HttpMessageNotReadableException ex, Locale locale) {
		return build(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED,
			List.of(new ErrorDetail("body", "NOT_READABLE", null)), locale);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiResponse.Failure> handleValidation(MethodArgumentNotValidException ex, Locale locale) {
		List<ErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
			.map(fieldError ->
				new ErrorDetail(fieldError.getField(), fieldError.getCode(),
					fieldError.getRejectedValue() == null ? null : String.valueOf(fieldError.getRejectedValue())))
			.toList();
		return build(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, details, locale);
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiResponse.Failure> handleTypeMismatch(MethodArgumentTypeMismatchException ex, Locale locale) {
		return build(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED,
			List.of(new ErrorDetail(ex.getName(), "TYPE_MISMATCH",
				ex.getValue() == null ? null : String.valueOf(ex.getValue()))), locale);
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<ApiResponse.Failure> handleMissingParam(MissingServletRequestParameterException ex, Locale locale) {
		return build(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED,
			List.of(new ErrorDetail(ex.getParameterName(), "REQUIRED", null)), locale);
	}

	@ExceptionHandler(OptimisticLockingFailureException.class)
	public ResponseEntity<ApiResponse.Failure> handleOptimisticLock(OptimisticLockingFailureException ex, Locale locale) {
		return build(HttpStatus.CONFLICT, ErrorCode.CONCURRENT_MODIFICATION, List.of(), locale);
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiResponse.Failure> handleConstraintViolation(DataIntegrityViolationException ex, Locale locale) {
		ErrorCode code = DbConstraintErrorMapper.resolve(ex).orElse(ErrorCode.INTERNAL_ERROR);
		if (code == ErrorCode.INTERNAL_ERROR) {
			log.error("Unmapped DB constraint violation", ex);
		}
		return build(code.status(), code, List.of(), locale);
	}

	@ExceptionHandler(AuthorizationDeniedException.class)
	public ResponseEntity<ApiResponse.Failure> handleAuthorizationDenied(
		AuthorizationDeniedException ex, HttpServletRequest request, Locale locale) {
		ErrorCode code = request.getRequestURI().startsWith(ADMIN_PATH_PREFIX)
			? ErrorCode.ADMIN_REQUIRED : ErrorCode.FORBIDDEN;
		return build(HttpStatus.FORBIDDEN, code, List.of(), locale);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiResponse.Failure> handleUnexpected(Exception ex, Locale locale) {
		log.error("Unhandled exception", ex);
		return build(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR, List.of(), locale);
	}

	private ResponseEntity<ApiResponse.Failure> build(HttpStatus status, ErrorCode code, List<ErrorDetail> details, Locale locale) {
		String message = resolveMessage(code, locale);
		String traceId = RequestContext.requestId();
		return ResponseEntity.status(status).body(ApiResponse.error(code, message, details, traceId));
	}

	private String resolveMessage(ErrorCode code, Locale locale) {
		try {
			return messageSource.getMessage(code.name(), null, locale);
		} catch (NoSuchMessageException e) {
			return code.name();
		}
	}
}
