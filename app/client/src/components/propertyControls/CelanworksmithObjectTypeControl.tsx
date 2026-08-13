import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { ControlData, ControlProps } from "./BaseControl";
import BaseControl from "./BaseControl";
import { getCelanworksmithObjectMetadataRetryAction } from "./celanworksmithObjectMetadataRetry";
import {
  getCelanworksmithObjectMetadataState,
  getCelanworksmithObjectTypeOptions,
} from "selectors/celanworksmithObjectMetadataSelectors";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";

export interface CelanworksmithObjectTypeControlProps extends ControlProps {
  propertyValue?: string;
}

interface ObjectTypeSelectorProps {
  label: string;
  propertyValue?: string;
  onSelect: (value: string) => void;
}

const CelanworksmithObjectTypeSelector = ({
  label,
  onSelect,
  propertyValue,
}: ObjectTypeSelectorProps) => {
  const dispatch = useDispatch();
  const metadataState = useSelector(getCelanworksmithObjectMetadataState);
  const objectsState = useSelector(getCelanworksmithObjectsState);
  const options = useSelector(getCelanworksmithObjectTypeOptions);
  const [search, setSearch] = useState("");
  const isDisabled = metadataState.status !== "ready";
  const isRefreshing =
    metadataState.status === "ready" && objectsState.status === "loading";
  const selectedValue = propertyValue || "";
  const hasSelectedOption = options.some(
    (option) => option.value === selectedValue,
  );
  const visibleOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return options.filter(
      (option) =>
        !normalizedSearch ||
        option.searchText.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [options, search]);
  const retry = () => {
    if (!metadataState.applicationId) return;

    dispatch(getCelanworksmithObjectMetadataRetryAction(metadataState));
  };

  return (
    <div>
      <input
        aria-label="Search object types / 搜索对象类型"
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
        <option value="">Choose object type / 选择对象类型</option>
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
      {metadataState.status === "empty" && metadataState.isBound ? (
        <div>No object types / 没有对象类型</div>
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
    </div>
  );
};

class CelanworksmithObjectTypeControl extends BaseControl<CelanworksmithObjectTypeControlProps> {
  handleSelect = (value: string) => {
    this.updateProperty(this.props.propertyName, value);
  };

  render() {
    return (
      <CelanworksmithObjectTypeSelector
        label={this.props.label}
        onSelect={this.handleSelect}
        propertyValue={this.props.propertyValue}
      />
    );
  }

  static getControlType() {
    return "CELANWORKSMITH_OBJECT_TYPE";
  }

  static canDisplayValueInUI(_config: ControlData, value: unknown): boolean {
    return typeof value === "string";
  }
}

export default CelanworksmithObjectTypeControl;
