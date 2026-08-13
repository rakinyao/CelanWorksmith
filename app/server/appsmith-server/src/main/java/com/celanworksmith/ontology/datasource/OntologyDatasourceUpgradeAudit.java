package com.celanworksmith.ontology.datasource;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Document(collection = "ontology_datasource_upgrade_audits")
public record OntologyDatasourceUpgradeAudit(
        @Id String id,
        String datasourceId,
        String beforeSnapshotId,
        String beforeDigest,
        String afterSnapshotId,
        String afterDigest,
        String actor,
        Instant createdAt,
        OntologyDatasourceCompatibilityService.Report report,
        String rollbackOfAuditId) {}

@Component
class MongoOntologyDatasourceUpgradeAuditStore implements OntologyDatasourceUpgradeService.AuditStore {
    private final ReactiveMongoTemplate template;

    MongoOntologyDatasourceUpgradeAuditStore(ReactiveMongoTemplate template) {
        this.template = template;
    }

    @Override
    public Mono<OntologyDatasourceUpgradeAudit> save(OntologyDatasourceUpgradeAudit audit) {
        return template.insert(audit);
    }

    @Override
    public Mono<OntologyDatasourceUpgradeAudit> findById(String auditId) {
        return template.findById(auditId, OntologyDatasourceUpgradeAudit.class);
    }
}
