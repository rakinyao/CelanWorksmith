package com.celanworksmith.demoactionserver.config;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Development-only compatibility gate for the demo action server.
 *
 * <p>Workspace, datasource, and metadata identifiers are request/audit identity and must not be
 * used as a server-wide admission allow-list. The demo server currently exposes only the
 * ApplyContractChange capability for Release 1.2.0.
 */
@ConfigurationProperties(prefix = "celanworksmith.demo-action-server.request")
public class DemoActionServerRequestProperties {
    public static final String DEMO_RELEASE_VERSION = "1.2.0";

    public boolean supports(ExecuteRequest request) {
        return request != null
                && "ApplyContractChange".equals(request.actionId())
                && DEMO_RELEASE_VERSION.equals(request.projectVersion());
    }
}
