package com.celanworksmith.demoactionserver.api;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebInputException;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/actions")
public class ActionExecutionController {
    private static final String SAFE_SERVER_MESSAGE = "Action execution failed.";

    private final ActionExecutionService actionExecutionService;

    public ActionExecutionController(ActionExecutionService actionExecutionService) {
        this.actionExecutionService = actionExecutionService;
    }

    @PostMapping("/execute")
    public Mono<ResponseEntity<?>> execute(@RequestBody ExecuteRequest request) {
        return actionExecutionService.execute(request)
                .map(this::toResponse)
                .onErrorResume(Throwable.class, exception -> Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new DomainFailure(
                                OntologyActionServerProtocol.V1,
                                null,
                                "ACTION_EXECUTION_FAILED",
                                SAFE_SERVER_MESSAGE))));
    }

    @ExceptionHandler({IllegalArgumentException.class, ServerWebInputException.class})
    public ResponseEntity<DomainFailure> invalidRequest(Exception exception) {
        return ResponseEntity.unprocessableEntity()
                .body(new DomainFailure(
                        OntologyActionServerProtocol.V1, null, "INVALID_REQUEST", "Invalid action execution request."));
    }

    private ResponseEntity<?> toResponse(ActionExecutionService.ExecutionResult result) {
        if (result instanceof ActionExecutionService.ExecutionResult.Success success) {
            return ResponseEntity.ok(success.response());
        }
        DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
        HttpStatus status = "ACTION_IN_PROGRESS".equals(failure.code())
                ? HttpStatus.CONFLICT
                : HttpStatus.UNPROCESSABLE_ENTITY;
        return ResponseEntity.status(status).body(failure);
    }
}
