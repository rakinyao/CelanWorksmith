import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ApplicationMapsApi, {
  type ApplicationMapSummary,
} from "api/ApplicationMapsApi";

const MAX_BYTES = 10 * 1024 * 1024;

async function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

interface Props {
  applicationId: string;
}

function validGeoJson(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const collection = value as { type?: string; features?: unknown[] };

  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    collection.features.length === 0 ||
    collection.features.length > 10000
  )
    return false;

  const ids = new Set<string>();

  return collection.features.every((entry) => {
    if (!entry || typeof entry !== "object") return false;

    const feature = entry as {
      type?: string;
      properties?: { id?: unknown; name?: unknown };
      geometry?: { type?: string; coordinates?: unknown };
    };
    const id = feature.properties?.id;
    const name = feature.properties?.name;

    if (
      feature.type !== "Feature" ||
      typeof id !== "string" ||
      !id.trim() ||
      ids.has(id) ||
      typeof name !== "string" ||
      !name.trim() ||
      !["Polygon", "MultiPolygon"].includes(feature.geometry?.type || "") ||
      !Array.isArray(feature.geometry?.coordinates)
    )
      return false;

    ids.add(id);

    return true;
  });
}

export default function ApplicationMapResources({ applicationId }: Props) {
  const { t } = useTranslation();
  const [resources, setResources] = useState<ApplicationMapSummary[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    ApplicationMapsApi.list(applicationId)
      .then((items) => {
        if (active) setResources(items);
      })
      .catch(() => {
        if (active) setError(t("mapResources.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applicationId, t]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !file) {
      setError(t("mapResources.nameAndFileRequired"));

      return;
    }

    if (file.size > MAX_BYTES) {
      setError(t("mapResources.fileTooLarge"));

      return;
    }

    try {
      if (!validGeoJson(JSON.parse(await readFile(file)))) {
        setError(t("mapResources.invalidGeoJson"));

        return;
      }
    } catch {
      setError(t("mapResources.invalidGeoJson"));

      return;
    }

    setUploading(true);
    try {
      const resource = await ApplicationMapsApi.create(
        applicationId,
        name.trim(),
        file,
      );

      setResources((current) => [...current, resource]);
      setName("");
      setFile(null);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : t("mapResources.uploadFailed"),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="px-4 overflow-y-auto h-full">
      <h2 className="py-3 font-semibold">{t("mapResources.title")}</h2>
      <form className="flex flex-col gap-3" onSubmit={upload}>
        <label className="flex flex-col gap-1">
          {t("mapResources.name")}
          <input
            className="border px-2 py-1"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setName(event.target.value)
            }
            value={name}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("mapResources.file")}
          <input
            accept=".geojson,.json,application/geo+json,application/json"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setFile(event.target.files?.[0] || null)
            }
            type="file"
          />
        </label>
        <button
          className="border px-3 py-1 self-start"
          disabled={uploading}
          type="submit"
        >
          {uploading ? t("mapResources.uploading") : t("mapResources.upload")}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-red-600" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="mt-4">{t("common.loading")}</p>
      ) : (
        <ul className="mt-4 divide-y">
          {resources.map((resource) => (
            <li className="py-2" key={resource.id}>
              <div>{resource.name}</div>
              <div className="text-xs text-gray-600">
                {t("mapResources.regionCount", { count: resource.regionCount })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
