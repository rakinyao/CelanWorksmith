package com.celanworksmith;

import org.springframework.http.HttpStatus;

public enum CelanWorksmithErrorCode {
    INVALID_ARGUMENT(HttpStatus.BAD_REQUEST),
    OBJECT_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND),
    OBJECT_NOT_FOUND(HttpStatus.NOT_FOUND),
    LINK_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND),
    FUNCTION_NOT_FOUND(HttpStatus.NOT_FOUND),
    ACTION_NOT_FOUND(HttpStatus.NOT_FOUND),
    FILTER_INVALID(HttpStatus.BAD_REQUEST),
    PROVIDER_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

    private final HttpStatus status;

    CelanWorksmithErrorCode(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
