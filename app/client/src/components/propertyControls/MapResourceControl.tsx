import React from "react";
import ApplicationMapsApi, {
  type ApplicationMapSummary,
} from "api/ApplicationMapsApi";
import BaseControl, { type ControlProps } from "./BaseControl";
import {
  CHINA_NATIONWIDE_MAP_ID,
  CHINA_PROVINCE_MAPS,
} from "widgets/MapChartWidget/chinaMapManifest";
import { dataSetForChina } from "widgets/MapChartWidget/constants";
import i18n from "i18n";
import store from "store";
import { getCurrentApplicationId } from "selectors/editorSelectors";

interface State {
  resources: ApplicationMapSummary[];
  loading: boolean;
  error: boolean;
}

export default class MapResourceControl extends BaseControl<
  ControlProps,
  State
> {
  state: State = { resources: [], loading: true, error: false };
  private active = false;

  componentDidMount() {
    this.active = true;
    const applicationId = getCurrentApplicationId(store.getState());

    if (!applicationId) {
      this.setState({ loading: false, error: true });

      return;
    }

    ApplicationMapsApi.list(applicationId)
      .then((resources) => {
        if (this.active) this.setState({ resources, loading: false });
      })
      .catch(() => {
        if (this.active) this.setState({ loading: false, error: true });
      });
  }

  componentWillUnmount() {
    this.active = false;
  }

  private select = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    if (value.startsWith("application:")) {
      this.batchUpdateProperties({
        mapSource: "custom",
        customMapResourceId: value.slice("application:".length),
      });
    } else if (value.startsWith("builtin:")) {
      const mapType = value.slice("builtin:".length);

      const dataIsBound =
        this.props.widgetProperties.dynamicPropertyPathList?.some(
          (path: { key: string }) => path.key === "data",
        );

      this.batchUpdateProperties({
        mapSource: "builtin",
        mapType,
        ...(!dataIsBound && mapType === CHINA_NATIONWIDE_MAP_ID
          ? { data: dataSetForChina }
          : {}),
      });
    }
  };

  render() {
    const { customMapResourceId, mapSource, mapType } =
      this.props.widgetProperties;
    const selected =
      mapSource === "custom"
        ? `application:${customMapResourceId || ""}`
        : `builtin:${mapType || CHINA_NATIONWIDE_MAP_ID}`;
    const missing =
      mapSource === "custom" &&
      !!customMapResourceId &&
      !this.state.loading &&
      !this.state.error &&
      !this.state.resources.some(
        (resource) => resource.id === customMapResourceId,
      );

    return (
      <div>
        <select
          aria-label={i18n.t("mapResources.mapType")}
          className="w-full border px-2 py-1"
          onChange={this.select}
          value={selected}
        >
          <optgroup label={i18n.t("mapResources.builtInMaps")}>
            <option value={`builtin:${CHINA_NATIONWIDE_MAP_ID}`}>
              {i18n.t("mapResources.china")}
            </option>
            {CHINA_PROVINCE_MAPS.filter(
              (resource) => resource.childAvailable,
            ).map((resource) => (
              <option key={resource.mapId} value={`builtin:${resource.mapId}`}>
                {resource.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={i18n.t("mapResources.applicationMaps")}>
            {this.state.resources.map((resource) => (
              <option key={resource.id} value={`application:${resource.id}`}>
                {resource.name}
              </option>
            ))}
            {mapSource === "custom" &&
              customMapResourceId &&
              !this.state.resources.some(
                (resource) => resource.id === customMapResourceId,
              ) && <option value={selected}>{customMapResourceId}</option>}
          </optgroup>
        </select>
        {this.state.loading && <p>{i18n.t("common.loading")}</p>}
        {this.state.error && (
          <p role="alert">{i18n.t("mapResources.loadFailed")}</p>
        )}
        {missing && (
          <p role="alert">{i18n.t("mapResources.missingResource")}</p>
        )}
        <p className="text-xs mt-1">
          {i18n.t("mapResources.uploadInSettings")}
        </p>
      </div>
    );
  }

  static getControlType() {
    return "MAP_RESOURCE";
  }
}
