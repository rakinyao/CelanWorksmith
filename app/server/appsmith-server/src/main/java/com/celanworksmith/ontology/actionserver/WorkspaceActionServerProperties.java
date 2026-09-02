package com.celanworksmith.ontology.actionserver;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

@Validated
@ConfigurationProperties(prefix = "celanworksmith.action-server")
public class WorkspaceActionServerProperties {
    @Valid private Map<String, Endpoint> workspaces = new LinkedHashMap<>();

    public Map<String, Endpoint> getWorkspaces() {
        return workspaces;
    }

    public void setWorkspaces(Map<String, Endpoint> workspaces) {
        this.workspaces = workspaces == null ? new LinkedHashMap<>() : workspaces;
    }

    public static class Endpoint {
        @NotBlank private String url;

        @Positive private long timeoutMillis;

        public Endpoint() {}

        public Endpoint(String url, long timeoutMillis) {
            this.url = url;
            this.timeoutMillis = timeoutMillis;
        }

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public long getTimeoutMillis() {
            return timeoutMillis;
        }

        public void setTimeoutMillis(long timeoutMillis) {
            this.timeoutMillis = timeoutMillis;
        }

        @AssertTrue(message = "url must be an absolute URI") public boolean isAbsoluteUrl() {
            if (url == null || url.isBlank()) {
                return true;
            }
            try {
                URI endpoint = URI.create(url);
                return endpoint.isAbsolute() && endpoint.getHost() != null;
            } catch (IllegalArgumentException exception) {
                return false;
            }
        }
    }
}
