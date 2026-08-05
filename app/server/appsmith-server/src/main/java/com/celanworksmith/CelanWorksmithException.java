package com.celanworksmith;

public class CelanWorksmithException extends RuntimeException {
    private final CelanWorksmithErrorCode code;

    public CelanWorksmithException(CelanWorksmithErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public CelanWorksmithErrorCode code() {
        return code;
    }
}
