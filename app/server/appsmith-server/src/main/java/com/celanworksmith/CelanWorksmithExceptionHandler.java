package com.celanworksmith;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.celanworksmith")
public class CelanWorksmithExceptionHandler {
    @ExceptionHandler(CelanWorksmithException.class)
    public ResponseEntity<CelanWorksmithErrorResponse> handle(CelanWorksmithException exception) {
        return ResponseEntity.status(exception.code().status())
                .body(new CelanWorksmithErrorResponse(exception.code().name(), exception.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<CelanWorksmithErrorResponse> handle(IllegalArgumentException exception) {
        return ResponseEntity.badRequest()
                .body(new CelanWorksmithErrorResponse(CelanWorksmithErrorCode.INVALID_ARGUMENT.name(), exception.getMessage()));
    }
}
