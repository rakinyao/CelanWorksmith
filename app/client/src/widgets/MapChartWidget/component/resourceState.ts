export interface MapResourceUnavailableError extends Error {
  mapType: string;
  recoverable: true;
}

export function isBusinessRegionFeature(feature: unknown): boolean {
  if (!feature || typeof feature !== "object") {
    return false;
  }

  const properties = (feature as { properties?: Record<string, unknown> })
    .properties;
  const adcode = properties?.adcode;

  return (
    typeof adcode === "string" &&
    adcode !== "100000_JD" &&
    properties?.level !== "special"
  );
}

export function getUnavailableMapResourceError(
  mapType: string,
): MapResourceUnavailableError {
  const error = new Error(
    `Map resource ${mapType} is unavailable. Select a China map from the available local resources.`,
  ) as MapResourceUnavailableError;

  error.name = "MapResourceUnavailableError";

  error.mapType = mapType;

  error.recoverable = true;

  return error;
}
