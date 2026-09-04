package com.celanworksmith.ontology.datasource;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;

import java.io.IOException;

/** Reads the source discriminator before considering source-specific fields. */
public final class OntologyProjectImportRequestDeserializer extends StdDeserializer<OntologyProjectImportRequest> {
    public OntologyProjectImportRequestDeserializer() {
        super(OntologyProjectImportRequest.class);
    }

    @Override
    public OntologyProjectImportRequest deserialize(JsonParser parser, DeserializationContext context)
            throws IOException {
        JsonNode node = parser.getCodec().readTree(parser);
        String sourceKindText = text(node, "sourceKind");
        OntologyProjectImportSource.Kind sourceKind =
                sourceKindText == null ? null : OntologyProjectImportSource.Kind.valueOf(sourceKindText);
        byte[] metadata =
                node.path("metadata").isNull() || node.path("metadata").isMissingNode()
                        ? null
                        : parser.getCodec().treeToValue(node.path("metadata"), byte[].class);
        String sourceReleaseId = text(node, "sourceReleaseId");
        String runtimeProviderId = sourceKind == OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON
                ? null
                : text(node, "runtimeProviderId");
        return new OntologyProjectImportRequest(sourceKind, metadata, sourceReleaseId, runtimeProviderId, null);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }
}
