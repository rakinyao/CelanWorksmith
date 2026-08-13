package com.appsmith.server.migrations.db.ce;

import com.appsmith.external.models.PluginType;
import com.appsmith.server.domains.Plugin;
import com.appsmith.server.domains.Workspace;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class Migration076AddOntologyDatasourcePluginTest {

    @Test
    void registersOntologyDatasourcePluginForExistingWorkspaces() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        doAnswer(invocation -> {
                    Plugin plugin = invocation.getArgument(0);
                    plugin.setId("ontology-plugin-id");
                    return plugin;
                })
                .when(mongoTemplate)
                .insert(any(Plugin.class));

        new Migration076AddOntologyDatasourcePlugin(mongoTemplate).addPluginToDbAndWorkspace();

        ArgumentCaptor<Plugin> pluginCaptor = ArgumentCaptor.forClass(Plugin.class);
        verify(mongoTemplate).insert(pluginCaptor.capture());
        verify(mongoTemplate).updateMulti(any(), any(), eq(Workspace.class));

        Plugin plugin = pluginCaptor.getValue();
        assertThat(plugin.getName()).isEqualTo("Ontology Datasource");
        assertThat(plugin.getPluginName()).isEqualTo("Ontology Datasource");
        assertThat(plugin.getPackageName()).isEqualTo("celanworksmith-ontology-plugin");
        assertThat(plugin.getType()).isEqualTo(PluginType.DB);
        assertThat(plugin.getUiComponent()).isEqualTo("UQIDbEditorForm");
        assertThat(plugin.getDatasourceComponent()).isEqualTo("DbEditorForm");
        assertThat(plugin.getResponseType()).isEqualTo(Plugin.ResponseType.JSON);
        assertThat(plugin.getDefaultInstall()).isTrue();
    }

    @Test
    void installsExistingOntologyPluginWhenMigrationIsRetried() {
        MongoTemplate mongoTemplate = mock(MongoTemplate.class);
        Plugin existingPlugin = new Plugin();
        existingPlugin.setId("existing-ontology-plugin-id");
        doThrow(new DuplicateKeyException("already exists")).when(mongoTemplate).insert(any(Plugin.class));
        when(mongoTemplate.findOne(any(Query.class), eq(Plugin.class))).thenReturn(existingPlugin);

        new Migration076AddOntologyDatasourcePlugin(mongoTemplate).addPluginToDbAndWorkspace();

        verify(mongoTemplate).updateMulti(any(), any(), eq(Workspace.class));
    }
}
