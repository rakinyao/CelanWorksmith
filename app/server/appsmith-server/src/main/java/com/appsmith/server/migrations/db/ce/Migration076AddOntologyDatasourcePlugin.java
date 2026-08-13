package com.appsmith.server.migrations.db.ce;

import com.appsmith.external.models.PluginType;
import com.appsmith.server.domains.Plugin;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import static com.appsmith.server.migrations.DatabaseChangelog1.installPluginToAllWorkspaces;
import static org.springframework.data.mongodb.core.query.Criteria.where;

@Slf4j
@ChangeUnit(order = "076", id = "add-ontology-datasource-plugin", author = "")
public class Migration076AddOntologyDatasourcePlugin {
    static final String PLUGIN_NAME = "Ontology Datasource";
    static final String PLUGIN_PACKAGE_NAME = "celanworksmith-ontology-plugin";

    private final MongoTemplate mongoTemplate;

    public Migration076AddOntologyDatasourcePlugin(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @RollbackExecution
    public void rollbackExecution() {}

    @Execution
    public void addPluginToDbAndWorkspace() {
        Plugin plugin = new Plugin();
        plugin.setName(PLUGIN_NAME);
        plugin.setType(PluginType.DB);
        plugin.setPluginName(PLUGIN_NAME);
        plugin.setPackageName(PLUGIN_PACKAGE_NAME);
        plugin.setUiComponent("UQIDbEditorForm");
        plugin.setDatasourceComponent("DbEditorForm");
        plugin.setResponseType(Plugin.ResponseType.JSON);
        plugin.setDefaultInstall(true);

        try {
            mongoTemplate.insert(plugin);
        } catch (DuplicateKeyException exception) {
            log.warn("{} already present in database.", PLUGIN_PACKAGE_NAME);
            plugin = mongoTemplate.findOne(
                    Query.query(where(Plugin.Fields.packageName).is(PLUGIN_PACKAGE_NAME)), Plugin.class);
        }

        if (plugin.getId() == null) {
            log.error("Failed to insert the ontology datasource plugin into the database.");
            return;
        }

        installPluginToAllWorkspaces(mongoTemplate, plugin.getId());
    }
}
