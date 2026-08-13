package com.celanworksmith.ontology.project;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class OntologyProjectYamlImporter {
    private static final String MANIFEST_PATH = "ontology.yaml";
    private static final int MAX_ZIP_ENTRIES = 1_000;
    private static final int MAX_ENTRY_UNCOMPRESSED_BYTES = 1_048_576;
    private static final long MAX_TOTAL_UNCOMPRESSED_BYTES = 10_485_760L;
    private static final TypeReference<Map<String, Object>> YAML_OBJECT = new TypeReference<>() {};

    private final YAMLMapper yamlMapper;
    private final OntologyProjectValidator validator;

    public OntologyProjectYamlImporter() {
        this(new YAMLMapper(), new OntologyProjectValidator());
    }

    OntologyProjectYamlImporter(YAMLMapper yamlMapper, OntologyProjectValidator validator) {
        this.yamlMapper = yamlMapper;
        this.validator = validator;
    }

    public OntologyProjectDefinition importZip(InputStream zip) {
        Map<String, byte[]> files = readZip(zip);
        OntologyProjectManifest manifest = parseManifest(requiredFile(files, MANIFEST_PATH));
        retainIndexedFiles(files, manifest);
        if (manifest.schemaVersion() != 1) {
            throw projectError("PROJECT_SCHEMA_VERSION_UNSUPPORTED", "schemaVersion must be 1");
        }

        OntologyProjectDefinition definition = new OntologyProjectDefinition(
                manifest.projectId(),
                manifest.version(),
                manifest.schemaVersion(),
                parseObjects(files, manifest.objects()),
                parseLinks(files, manifest.links()),
                parseFunctions(files, manifest.functions()),
                parseActions(files, manifest.actions()));
        List<String> errors = validator.validate(definition);
        if (!errors.isEmpty()) {
            throw projectError("PROJECT_VALIDATION_FAILED", String.join("; ", errors));
        }
        return definition;
    }

    private Map<String, byte[]> readZip(InputStream input) {
        Map<String, byte[]> files = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(input)) {
            int entryCount = 0;
            long totalUncompressedBytes = 0;
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (++entryCount > MAX_ZIP_ENTRIES) {
                    throw projectError("PROJECT_ZIP_INVALID", "ZIP contains too many entries");
                }
                String path = normalizePath(entry.getName());
                if (entry.isDirectory()) continue;
                byte[] content = readEntry(zip, path);
                totalUncompressedBytes += content.length;
                if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
                    throw projectError("PROJECT_ZIP_INVALID", "ZIP uncompressed content exceeds the total size limit");
                }
                if (files.putIfAbsent(path, content) != null) {
                    throw projectError("PROJECT_PATH_INVALID", "Duplicate ZIP entry: " + path);
                }
            }
        } catch (IOException exception) {
            throw projectError("PROJECT_ZIP_INVALID", exception.getMessage());
        }
        return files;
    }

    private static void retainIndexedFiles(Map<String, byte[]> files, OntologyProjectManifest manifest) {
        Set<String> indexedPaths = new HashSet<>();
        indexedPaths.add(MANIFEST_PATH);
        indexedPaths.addAll(manifest.objects());
        indexedPaths.addAll(manifest.links());
        indexedPaths.addAll(manifest.functions());
        indexedPaths.addAll(manifest.actions());
        files.keySet().retainAll(indexedPaths);
    }

    private OntologyProjectManifest parseManifest(byte[] content) {
        Map<String, Object> yaml = parseYaml(content);
        return new OntologyProjectManifest(
                requiredNonBlankString(yaml, "projectId"),
                requiredNonBlankString(yaml, "version"),
                integer(yaml, "schemaVersion"),
                paths(yaml, "objects"),
                paths(yaml, "links"),
                paths(yaml, "functions"),
                paths(yaml, "actions"));
    }

    private List<ObjectTypeDTO> parseObjects(Map<String, byte[]> files, List<String> paths) {
        List<ObjectTypeDTO> objects = new ArrayList<>();
        for (String path : paths) {
            Map<String, Object> yaml = parseYaml(requiredFile(files, path));
            objects.add(new ObjectTypeDTO(
                    string(yaml, "id"),
                    string(yaml, "displayName"),
                    string(yaml, "runtimeTable"),
                    string(yaml, "primaryKey"),
                    properties(yaml, "properties")));
        }
        return objects;
    }

    private List<LinkTypeDTO> parseLinks(Map<String, byte[]> files, List<String> paths) {
        List<LinkTypeDTO> links = new ArrayList<>();
        for (String path : paths) {
            Map<String, Object> yaml = parseYaml(requiredFile(files, path));
            links.add(new LinkTypeDTO(
                    string(yaml, "id"),
                    string(yaml, "displayName"),
                    string(yaml, "sourceTypeId"),
                    string(yaml, "targetTypeId"),
                    string(yaml, "cardinality")));
        }
        return links;
    }

    private List<FunctionDTO> parseFunctions(Map<String, byte[]> files, List<String> paths) {
        List<FunctionDTO> functions = new ArrayList<>();
        for (String path : paths) {
            Map<String, Object> yaml = parseYaml(requiredFile(files, path));
            functions.add(new FunctionDTO(
                    string(yaml, "id"),
                    string(yaml, "displayName"),
                    string(yaml, "returnType"),
                    properties(yaml, "parameters"),
                    bool(yaml, "sideEffectFree")));
        }
        return functions;
    }

    private List<ActionTypeDTO> parseActions(Map<String, byte[]> files, List<String> paths) {
        List<ActionTypeDTO> actions = new ArrayList<>();
        for (String path : paths) {
            Map<String, Object> yaml = parseYaml(requiredFile(files, path));
            actions.add(new ActionTypeDTO(
                    string(yaml, "id"),
                    string(yaml, "displayName"),
                    string(yaml, "objectTypeId"),
                    properties(yaml, "parameters"),
                    bool(yaml, "requiresConfirmation")));
        }
        return actions;
    }

    private Map<String, Object> parseYaml(byte[] content) {
        try {
            Map<String, Object> yaml = yamlMapper.readValue(content, YAML_OBJECT);
            if (yaml == null || yaml.isEmpty())
                throw projectError("PROJECT_YAML_INVALID", "YAML document must be a non-empty object");
            return yaml;
        } catch (IOException exception) {
            throw projectError("PROJECT_YAML_INVALID", exception.getMessage());
        }
    }

    private List<PropertyDTO> properties(Map<String, Object> yaml, String key) {
        Object value = yaml.get(key);
        if (value == null) return List.of();
        if (!(value instanceof List<?> values)) throw projectError("PROJECT_YAML_INVALID", key + " must be a list");
        List<PropertyDTO> properties = new ArrayList<>();
        for (Object item : values) {
            if (!(item instanceof Map<?, ?> raw))
                throw projectError("PROJECT_YAML_INVALID", key + " must contain objects");
            Map<String, Object> property = stringMap(raw);
            properties.add(new PropertyDTO(
                    string(property, "id"),
                    string(property, "displayName"),
                    string(property, "dataType"),
                    bool(property, "required"),
                    bool(property, "readOnly"),
                    bool(property, "derived"),
                    string(property, "group"),
                    optionalInteger(property, "order"),
                    bool(property, "hidden"),
                    stringList(property, "enumValues"),
                    string(property, "referenceTypeId")));
        }
        return properties;
    }

    private List<String> paths(Map<String, Object> yaml, String key) {
        Object value = yaml.get(key);
        if (value == null) return List.of();
        if (!(value instanceof List<?> values)) throw projectError("PROJECT_YAML_INVALID", key + " must be a list");
        List<String> paths = new ArrayList<>();
        for (Object item : values) {
            if (!(item instanceof String path)) throw projectError("PROJECT_YAML_INVALID", key + " must contain paths");
            paths.add(normalizePath(path));
        }
        return paths;
    }

    private byte[] requiredFile(Map<String, byte[]> files, String path) {
        String normalizedPath = normalizePath(path);
        byte[] content = files.get(normalizedPath);
        if (content == null)
            throw projectError("PROJECT_INDEXED_FILE_MISSING", "Missing indexed file: " + normalizedPath);
        return content;
    }

    private static String normalizePath(String value) {
        if (value == null || value.isBlank()) {
            throw projectError("PROJECT_PATH_INVALID", "Invalid project path: " + value);
        }
        String normalized = value.replace('\\', '/');
        if (normalized.startsWith("/") || isWindowsAbsolutePath(normalized)) {
            throw projectError("PROJECT_PATH_INVALID", "Invalid project path: " + value);
        }
        for (String segment : normalized.split("/", -1)) {
            if (segment.isEmpty() || segment.equals(".") || segment.equals("..")) {
                throw projectError("PROJECT_PATH_INVALID", "Invalid project path: " + value);
            }
        }
        return normalized;
    }

    private static boolean isWindowsAbsolutePath(String path) {
        return path.length() >= 3
                && Character.isLetter(path.charAt(0))
                && path.charAt(1) == ':'
                && path.charAt(2) == '/';
    }

    private static byte[] readEntry(ZipInputStream zip, String path) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int entryBytes = 0;
        int bytesRead;
        while ((bytesRead = zip.read(buffer)) != -1) {
            entryBytes += bytesRead;
            if (entryBytes > MAX_ENTRY_UNCOMPRESSED_BYTES) {
                throw projectError("PROJECT_ZIP_INVALID", "ZIP entry exceeds the size limit: " + path);
            }
            bytes.write(buffer, 0, bytesRead);
        }
        return bytes.toByteArray();
    }

    private static Map<String, Object> stringMap(Map<?, ?> raw) {
        Map<String, Object> result = new LinkedHashMap<>();
        raw.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    private static String string(Map<String, Object> yaml, String key) {
        Object value = yaml.get(key);
        if (value == null) return null;
        if (!(value instanceof String stringValue))
            throw projectError("PROJECT_YAML_INVALID", key + " must be a string");
        return stringValue;
    }

    private static String requiredNonBlankString(Map<String, Object> yaml, String key) {
        String value = string(yaml, key);
        if (value == null || value.isBlank()) throw projectError("PROJECT_YAML_INVALID", key + " is required");
        return value;
    }

    private static int integer(Map<String, Object> yaml, String key) {
        Object value = yaml.get(key);
        if (!(value instanceof Integer integerValue))
            throw projectError("PROJECT_YAML_INVALID", key + " must be an integer");
        return integerValue;
    }

    private static Integer optionalInteger(Map<String, Object> yaml, String key) {
        Object value = yaml.get(key);
        if (value == null) return null;
        if (!(value instanceof Integer integerValue))
            throw projectError("PROJECT_YAML_INVALID", key + " must be an integer");
        return integerValue;
    }

    private static List<String> stringList(Map<String, Object> yaml, String key) {
        Object value = yaml.get(key);
        if (value == null) return null;
        if (!(value instanceof List<?> values)) throw projectError("PROJECT_YAML_INVALID", key + " must be a list");
        List<String> strings = new ArrayList<>();
        for (Object item : values) {
            if (!(item instanceof String stringValue))
                throw projectError("PROJECT_YAML_INVALID", key + " must contain strings");
            strings.add(stringValue);
        }
        return List.copyOf(strings);
    }

    private static boolean bool(Map<String, Object> yaml, String key) {
        Object value = yaml.get(key);
        if (value == null) return false;
        if (!(value instanceof Boolean booleanValue))
            throw projectError("PROJECT_YAML_INVALID", key + " must be a boolean");
        return booleanValue;
    }

    private static CelanWorksmithException projectError(String code, String detail) {
        return new CelanWorksmithException(CelanWorksmithErrorCode.INVALID_ARGUMENT, code + ": " + detail);
    }
}
