package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;

public final class OntologyRuntimeSnapshotProjection {
    private OntologyRuntimeSnapshotProjection() {}

    public static OntologyRuntimeGateway.Snapshot project(OntologyMetadataSnapshot snapshot) {
        return new OntologyRuntimeGateway.Snapshot(
                snapshot.id(),
                snapshot.metadataDigest(),
                snapshot.definition().objectTypes().stream()
                        .map(OntologyRuntimeSnapshotProjection::objectTypeMetadata)
                        .toList(),
                snapshot.definition().functions().stream()
                        .map(function -> new OntologyRuntimeGateway.FunctionMetadata(
                                function.id(),
                                function.displayName(),
                                function.returnType(),
                                function.ownerObjectTypeIds(),
                                function.parameters().stream()
                                        .map(OntologyRuntimeSnapshotProjection::propertyMetadata)
                                        .toList(),
                                function.maxItems()))
                        .toList(),
                snapshot.definition().linkTypes().stream()
                        .map(link -> new OntologyRuntimeGateway.LinkMetadata(
                                link.id(),
                                link.displayName(),
                                link.sourceTypeId(),
                                link.targetTypeId(),
                                link.cardinality()))
                        .toList(),
                snapshot.definition().actions().stream()
                        .map(action -> new OntologyRuntimeGateway.ActionMetadata(
                                action.id(),
                                action.displayName(),
                                action.ownerObjectTypeIds(),
                                action.maxItems(),
                                action.atomic(),
                                action.parameters().stream()
                                        .map(OntologyRuntimeSnapshotProjection::propertyMetadata)
                                        .toList(),
                                action.requiresConfirmation(),
                                action.adapterId(),
                                action.adapterVersion()))
                        .toList());
    }

    private static OntologyRuntimeGateway.ObjectTypeMetadata objectTypeMetadata(ObjectTypeDTO objectType) {
        // Runtime asset and column mappings remain on the immutable snapshot definition;
        // the existing gateway contract needs only logical object/property metadata here.
        return new OntologyRuntimeGateway.ObjectTypeMetadata(
                objectType.id(),
                objectType.displayName(),
                objectType.primaryKey(),
                objectType.properties().stream()
                        .map(OntologyRuntimeSnapshotProjection::propertyMetadata)
                        .toList());
    }

    private static OntologyRuntimeGateway.PropertyMetadata propertyMetadata(PropertyDTO property) {
        return new OntologyRuntimeGateway.PropertyMetadata(
                property.id(),
                property.displayName(),
                property.dataType().toLowerCase(java.util.Locale.ROOT),
                property.hidden(),
                property.required(),
                property.readOnly(),
                property.derived(),
                property.enumValues(),
                property.referenceTypeId());
    }
}
