package com.celanworksmith.release;

import com.appsmith.external.models.Datasource;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.domains.NewPage;

import java.util.List;

public record ApplicationReleaseCandidate(
        Application application,
        List<NewAction> unpublishedActions,
        List<NewPage> unpublishedPages,
        List<Datasource> usedDatasources,
        String baseRevisionId) {

    public ApplicationReleaseCandidate(
            Application application,
            List<NewAction> unpublishedActions,
            List<Datasource> usedDatasources,
            String baseRevisionId) {
        this(application, unpublishedActions, List.of(), usedDatasources, baseRevisionId);
    }

    public ApplicationReleaseCandidate {
        if (application == null) {
            throw new NullPointerException("application");
        }
        unpublishedActions = List.copyOf(unpublishedActions);
        unpublishedPages = List.copyOf(unpublishedPages);
        usedDatasources = List.copyOf(usedDatasources);
        if (baseRevisionId == null || baseRevisionId.isBlank()) {
            throw new IllegalArgumentException("baseRevisionId must not be blank");
        }
    }
}
