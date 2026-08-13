import type {
  CelanworksmithActionResult,
  CelanworksmithChangedLink,
  CelanworksmithObjectInstance,
} from "api/CelanworksmithAPI";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import type { CelanworksmithLinkRequest } from "actions/celanworksmithLinkActions";
import type { CelanworksmithLinksState } from "reducers/celanworksmithLinksReducer";
import type { CelanworksmithObjectQueryState } from "reducers/celanworksmithObjectQueryReducer";

export interface CelanworksmithActionRefreshState {
  objectQueries: CelanworksmithObjectQueryState;
  links: CelanworksmithLinksState;
}

export interface CelanworksmithActionRefreshPlan {
  objectTypeIds: string[];
  objectQueries: CelanworksmithObjectQueryRequest[];
  links: CelanworksmithLinkRequest[];
  variableIds: string[];
  widgetIds: string[];
}

const getObjectKey = (typeId: string, objectId: string) =>
  `${typeId}/${objectId}`;

const getChangedObjectKeys = (result: CelanworksmithActionResult) =>
  new Set([
    ...result.changedObjects.map((object) =>
      getObjectKey(object.typeId, object.id),
    ),
    ...(result.changedProperties || []).map((property) =>
      getObjectKey(property.typeId, property.objectId),
    ),
  ]);

const getChangedTypeIds = (result: CelanworksmithActionResult) =>
  Array.from(
    new Set([
      ...result.changedObjects.map((object) => object.typeId),
      ...(result.changedProperties || []).map((property) => property.typeId),
    ]).values(),
  ).filter((typeId): typeId is string => !!typeId);

const isChangedLink = (
  request: CelanworksmithLinkRequest,
  changedLinks: CelanworksmithChangedLink[],
) =>
  changedLinks.some(
    (link) =>
      link.typeId === request.typeId &&
      link.objectId === request.objectId &&
      (!link.linkTypeId || link.linkTypeId === request.linkTypeId),
  );

const includesChangedTarget = (
  result: CelanworksmithObjectInstance[] | undefined,
  changedObjectKeys: Set<string>,
) =>
  result?.some((object) =>
    changedObjectKeys.has(getObjectKey(object.typeId, object.id)),
  ) || false;

export const getCelanworksmithActionRefreshPlan = (
  result: CelanworksmithActionResult,
  { links, objectQueries }: CelanworksmithActionRefreshState,
): CelanworksmithActionRefreshPlan => {
  const objectTypeIds = getChangedTypeIds(result);
  const affectedTypes = new Set(objectTypeIds);
  const changedObjectKeys = getChangedObjectKeys(result);
  const objectQueriesToRefresh = Object.values(objectQueries.entries)
    .map((entry) => entry.request)
    .filter((request) => affectedTypes.has(request.typeId));
  const variableIds = objectQueriesToRefresh.flatMap((request) => {
    const variablePrefix = "$variable/";

    return request.widgetId.startsWith(variablePrefix)
      ? [request.widgetId.slice(variablePrefix.length)]
      : [];
  });
  const widgetIds = objectQueriesToRefresh
    .map((request) => request.widgetId)
    .filter((widgetId) => !widgetId.startsWith("$variable/"));
  const linkRequests = Object.values(links.entries)
    .filter(
      (entry): entry is typeof entry & { request: CelanworksmithLinkRequest } =>
        !!entry.request,
    )
    .filter(
      (entry) =>
        changedObjectKeys.has(
          getObjectKey(entry.request.typeId, entry.request.objectId),
        ) ||
        isChangedLink(entry.request, result.links || []) ||
        includesChangedTarget(entry.result?.items, changedObjectKeys),
    )
    .map((entry) => entry.request);

  return {
    objectTypeIds,
    objectQueries: objectQueriesToRefresh,
    links: linkRequests,
    variableIds: Array.from(new Set(variableIds)),
    widgetIds: Array.from(new Set(widgetIds)),
  };
};
