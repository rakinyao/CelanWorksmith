import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { ControlData, ControlProps } from "./BaseControl";
import BaseControl from "./BaseControl";
import { getCelanworksmithObjectMetadataRetryAction } from "./celanworksmithObjectMetadataRetry";
import {
  getCelanworksmithObjectMetadataState,
  getCelanworksmithPropertyOptions,
} from "selectors/celanworksmithObjectMetadataSelectors";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import { filterSemanticMetadata } from "celanworksmith/semanticMetadata";

export interface CelanworksmithObjectPropertyControlProps extends ControlProps {
  propertyValue?: string;
}

interface ObjectPropertySelectorProps {
  label: string;
  objectTypeId?: string;
  propertyValue?: string;
  onSelect: (value: string) => void;
}

const CelanworksmithObjectPropertySelector = ({
  label,
  objectTypeId,
  onSelect,
  propertyValue,
}: ObjectPropertySelectorProps) => {
  const dispatch = useDispatch();
  const metadataState = useSelector(getCelanworksmithObjectMetadataState);
  const objectsState = useSelector(getCelanworksmithObjectsState);
  const options = useSelector((state) =>
    getCelanworksmithPropertyOptions(state, objectTypeId),
  );
  const [search, setSearch] = useState("");
  const isDisabled = metadataState.status !== "ready" || !objectTypeId;
  const isRefreshing =
    metadataState.status === "ready" && objectsState.status === "loading";
  const selectedValue = propertyValue || "";
  const selectedProperty = objectsState.types[
    objectTypeId || ""
  ]?.metadata?.properties.find((property) => property.id === selectedValue);
  const semanticDescription = filterSemanticMetadata(selectedProperty, {
    authorized: true,
  }).description;
  const semanticDescriptionText =
    typeof semanticDescription === "string"
      ? semanticDescription
      : semanticDescription
        ? Object.values(semanticDescription).join(" / ")
        : undefined;
  const hasSelectedOption = options.some(
    (option) => option.value === selectedValue,
  );
  const visibleOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return options.filter(
      (option) =>
        !normalizedSearch ||
        `${option.label} ${option.value}`
          .toLocaleLowerCase()
          .includes(normalizedSearch),
    );
  }, [options, search]);
  const retry = () => {
    if (!metadataState.applicationId) return;

    dispatch(getCelanworksmithObjectMetadataRetryAction(metadataState));
  };

  return (
    <div>
      <input
        aria-label="Search properties / 搜索属性"
        disabled={isDisabled}
        onChange={(event) => setSearch(event.target.value)}
        type="search"
        value={search}
      />
      <select
        aria-label={label}
        disabled={isDisabled}
        onChange={(event) => onSelect(event.target.value)}
        value={selectedValue}
      >
        <option value="">Choose property / 选择属性</option>
        {selectedValue && !hasSelectedOption ? (
          <option value={selectedValue}>
            {selectedValue} (missing / 已删除)
          </option>
        ) : null}
        {visibleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.value})
          </option>
        ))}
      </select>
      {!metadataState.isBound ? (
        <div>Bind an ontology project / 请先绑定本体工程</div>
      ) : null}
      {metadataState.status === "loading" ? (
        <div>Loading object metadata / 正在加载对象元数据</div>
      ) : null}
      {isRefreshing ? (
        <div>Refreshing object metadata / 正在刷新对象元数据</div>
      ) : null}
      {metadataState.error ? (
        <div>
          <div>{metadataState.error?.message || "Metadata unavailable"}</div>
          <button
            disabled={!metadataState.applicationId}
            onClick={retry}
            type="button"
          >
            Retry / 重试
          </button>
        </div>
      ) : null}
      {metadataState.status === "ready" && !objectTypeId ? (
        <div>Select an object type / 请选择对象类型</div>
      ) : null}
      {metadataState.status === "empty" && metadataState.isBound ? (
        <div>No properties / 没有属性</div>
      ) : null}
      {metadataState.status === "ready" && objectTypeId && !options.length ? (
        <div>No properties / 没有属性</div>
      ) : null}
      {semanticDescriptionText ? (
        <div>Semantic description / 语义描述: {semanticDescriptionText}</div>
      ) : null}
    </div>
  );
};

class CelanworksmithObjectPropertyControl extends BaseControl<CelanworksmithObjectPropertyControlProps> {
  handleSelect = (value: string) => {
    this.updateProperty(this.props.propertyName, value);
  };

  render() {
    const objectTypeId = this.props.widgetProperties?.objectTypeId;

    return (
      <CelanworksmithObjectPropertySelector
        label={this.props.label}
        objectTypeId={objectTypeId}
        onSelect={this.handleSelect}
        propertyValue={this.props.propertyValue}
      />
    );
  }

  static getControlType() {
    return "CELANWORKSMITH_OBJECT_PROPERTY";
  }

  static canDisplayValueInUI(_config: ControlData, value: unknown): boolean {
    return typeof value === "string";
  }
}

export default CelanworksmithObjectPropertyControl;
