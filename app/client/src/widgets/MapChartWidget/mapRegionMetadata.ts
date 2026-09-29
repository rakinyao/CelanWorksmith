export interface RegionOption {
  label: string;
  value: string;
}

export interface MapGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry?: unknown;
  }>;
}

export function getRegionOptions(
  geoJson: MapGeoJson,
  regionKey: "adcode" | "id",
): RegionOption[] {
  const options: RegionOption[] = [];
  const ids = new Set<string>();

  for (const feature of geoJson.features) {
    if (feature?.type !== "Feature" || !feature.properties) {
      if (regionKey === "id") throw new Error("Invalid map resource feature");

      continue;
    }

    const { properties } = feature;

    if (
      regionKey === "adcode" &&
      (properties.adcode === "100000_JD" || properties.level === "special")
    )
      continue;

    const value = properties[regionKey];
    const label = properties.name;

    if (
      typeof value !== "string" ||
      !value ||
      typeof label !== "string" ||
      !label.trim()
    ) {
      if (regionKey === "id") throw new Error("Invalid map resource feature");

      continue;
    }

    if (ids.has(value)) throw new Error("Duplicate map region ID");

    ids.add(value);
    options.push({ label, value });
  }

  if (!options.length) throw new Error("Map resource has no regions");

  return options;
}

export function getRegionDetail(options: RegionOption[], regionId: unknown) {
  if (typeof regionId !== "string") return undefined;

  const option = options.find(({ value }) => value === regionId);

  return (
    option && {
      label: option.label,
      shortLabel: option.label,
      originalId: option.value,
      id: option.value.toLowerCase(),
    }
  );
}

export function escapeMapLabel(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] as string,
  );
}
