import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { DefaultRootState } from "react-redux";
import { Button, Flex, Input, Option, Select, Text } from "@appsmith/ads";
import { getCelanworksmithObjectsState } from "selectors/dataTreeSelectors";
import {
  getCelanworksmithObjectTypeOptions,
  getCelanworksmithPropertyOptions,
} from "selectors/celanworksmithObjectMetadataSelectors";
import {
  buildFilter,
  FILTER_OPERATORS,
  isOperatorAllowed,
  type FilterCondition,
  type FilterOperator,
} from "../widget/filterUtils";

export interface FilterListComponentProps {
  initialConditions?: FilterCondition[];
  initialObjectTypeId?: string;
  updateWidgetMetaProperty: (propertyName: string, value: unknown) => void;
}

const EMPTY_CONDITIONS: FilterCondition[] = [];

const createCondition = (): FilterCondition => ({
  propertyId: "",
  operator: "equals",
  value: "",
});

const getValue = (dataType: string | undefined, value: string) => {
  if (dataType === "INTEGER") return value === "" ? "" : Number(value);

  if (dataType === "DECIMAL") return value === "" ? "" : Number(value);

  return value;
};

export default function FilterListComponent({
  initialConditions = EMPTY_CONDITIONS,
  initialObjectTypeId,
  updateWidgetMetaProperty,
}: FilterListComponentProps) {
  const objectsState = useSelector((state: DefaultRootState) =>
    getCelanworksmithObjectsState(state),
  );
  const [objectTypeId, setObjectTypeId] = useState(initialObjectTypeId || "");
  const [conditions, setConditions] =
    useState<FilterCondition[]>(initialConditions);
  const conditionsRef = useRef(conditions);

  conditionsRef.current = conditions;
  const metadata = objectsState.types[objectTypeId]?.metadata;
  const objectTypes = useSelector(getCelanworksmithObjectTypeOptions);
  const propertyOptions = useSelector((state: DefaultRootState) =>
    getCelanworksmithPropertyOptions(state, objectTypeId),
  );
  const result = useMemo(
    () => buildFilter(metadata, conditions),
    [conditions, metadata],
  );

  useEffect(() => {
    const nextObjectTypeId = initialObjectTypeId || "";

    if (nextObjectTypeId !== objectTypeId) setObjectTypeId(nextObjectTypeId);
  }, [initialObjectTypeId, objectTypeId]);

  useEffect(() => {
    const nextConditions = initialConditions || [];

    if (
      JSON.stringify(nextConditions) !== JSON.stringify(conditionsRef.current)
    ) {
      setConditions(nextConditions);
    }
  }, [initialConditions]);

  useEffect(() => {
    updateWidgetMetaProperty("objectTypeId", objectTypeId || undefined);
    updateWidgetMetaProperty("filter", result.filter);
    updateWidgetMetaProperty("isValid", result.isValid);
  }, [objectTypeId, result, updateWidgetMetaProperty]);

  const publish = (
    nextObjectTypeId: string,
    nextConditions: FilterCondition[],
  ) => {
    const nextMetadata = objectsState.types[nextObjectTypeId]?.metadata;
    const nextResult = buildFilter(nextMetadata, nextConditions);

    updateWidgetMetaProperty("objectTypeId", nextObjectTypeId || undefined);
    updateWidgetMetaProperty("filter", nextResult.filter);
    updateWidgetMetaProperty("isValid", nextResult.isValid);
  };

  const updateConditions = (nextConditions: FilterCondition[]) => {
    setConditions(nextConditions);
    publish(objectTypeId, nextConditions);
  };

  if (objectsState.status === "loading" && !objectTypes.length) {
    return <div>Loading object metadata...</div>;
  }

  if (objectsState.status === "error" && !objectTypes.length) {
    const metadataError =
      objectsState.error?.message ||
      Object.values(objectsState.types).find((type) => type.error)?.error
        ?.message;

    return <div>{metadataError || "Unable to load object metadata."}</div>;
  }

  const reset = () => updateConditions([]);

  return (
    <Flex
      className="t--filter-list-widget"
      flexDirection="column"
      gap="spaces-3"
    >
      <Flex alignItems="center" gap="spaces-2">
        <Text>Object type / 本体类型</Text>
        <Select
          aria-label="Object type"
          onSelect={(value) => {
            const nextObjectTypeId = String(value || "");

            setObjectTypeId(nextObjectTypeId);
            updateConditionsForType(nextObjectTypeId);
          }}
          placeholder="Select an object type / 选择对象类型"
          value={objectTypeId}
        >
          {objectTypes.map((type) => (
            <Option key={type.value} value={type.value}>
              {type.label}
            </Option>
          ))}
        </Select>
      </Flex>
      {!objectTypeId && (
        <Text>
          Select an object type to add filters. / 选择对象类型以添加过滤条件。
        </Text>
      )}
      {objectTypeId && (
        <Flex flexDirection="column" gap="spaces-3">
          {conditions.map((condition, index) => {
            const property = metadata?.properties.find(
              (candidate) => candidate.id === condition.propertyId,
            );
            const allowedOperators = FILTER_OPERATORS.filter((operator) =>
              isOperatorAllowed(
                property?.dataType,
                operator,
                property?.referenceTypeId,
              ),
            );
            const operatorNeedsValue = condition.operator !== "isEmpty";
            const referenceObjects = property?.referenceTypeId
              ? objectsState.types[property.referenceTypeId]?.items || []
              : [];
            const referenceStatus = property?.referenceTypeId
              ? objectsState.types[property.referenceTypeId]?.status
              : undefined;

            return (
              <Flex
                alignItems="center"
                flexWrap="wrap"
                gap="spaces-2"
                key={index}
              >
                <Text>Property / 属性</Text>
                <Select
                  aria-label="Property"
                  onSelect={(value) => {
                    const next = [...conditions];

                    next[index] = {
                      ...condition,
                      propertyId: String(value || ""),
                      value: "",
                    };
                    updateConditions(next);
                  }}
                  placeholder="Select a property / 选择属性"
                  value={condition.propertyId}
                >
                  {propertyOptions.map((propertyOption) => (
                    <Option
                      key={propertyOption.value}
                      value={propertyOption.value}
                    >
                      {propertyOption.label}
                    </Option>
                  ))}
                </Select>
                <Text>Operator / 操作符</Text>
                <Select
                  aria-label="Operator"
                  onSelect={(value) => {
                    const operator = String(value || "") as FilterOperator;
                    const next = [...conditions];

                    next[index] = {
                      ...condition,
                      operator,
                      value:
                        operator === "isEmpty"
                          ? undefined
                          : condition.value || "",
                    };
                    updateConditions(next);
                  }}
                  value={condition.operator}
                >
                  {allowedOperators.map((operator) => (
                    <Option key={operator} value={operator}>
                      {operator}
                    </Option>
                  ))}
                </Select>
                {operatorNeedsValue && (
                  <>
                    <Text>Value / 值</Text>
                    {property?.dataType === "BOOLEAN" ? (
                      <Select
                        aria-label="Value"
                        onSelect={(value) => {
                          const next = [...conditions];

                          next[index] = {
                            ...condition,
                            value: value === "true",
                          };
                          updateConditions(next);
                        }}
                        placeholder="Select a value / 选择值"
                        value={String(condition.value ?? "")}
                      >
                        <Option value="true">True</Option>
                        <Option value="false">False</Option>
                      </Select>
                    ) : property?.dataType === "ENUM" ? (
                      <Select
                        aria-label="Value"
                        isDisabled={!property.enumValues?.length}
                        onSelect={(value) => {
                          const next = [...conditions];

                          next[index] = {
                            ...condition,
                            value: String(value || ""),
                          };
                          updateConditions(next);
                        }}
                        placeholder={
                          property.enumValues?.length
                            ? "Select a value / 选择值"
                            : "No enum values / 无枚举值"
                        }
                        value={String(condition.value ?? "")}
                      >
                        {(property.enumValues || []).map((enumValue) => (
                          <Option key={enumValue} value={enumValue}>
                            {enumValue}
                          </Option>
                        ))}
                      </Select>
                    ) : property?.referenceTypeId ? (
                      <Select
                        aria-label="Value"
                        isDisabled={
                          referenceStatus === "loading" ||
                          !referenceObjects.length
                        }
                        isLoading={referenceStatus === "loading"}
                        onSelect={(value) => {
                          const next = [...conditions];

                          next[index] = {
                            ...condition,
                            value: String(value || ""),
                          };
                          updateConditions(next);
                        }}
                        placeholder={
                          referenceStatus === "loading"
                            ? "Loading related objects / 正在加载关联对象"
                            : referenceObjects.length
                              ? "Select a related object / 选择关联对象"
                              : "No related objects / 无关联对象"
                        }
                        value={String(condition.value ?? "")}
                      >
                        {referenceObjects.map((referenceObject) => (
                          <Option
                            key={referenceObject.id}
                            value={referenceObject.id}
                          >
                            {referenceObject.id}
                          </Option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        aria-label="Value"
                        onChange={(value) => {
                          const next = [...conditions];

                          next[index] = {
                            ...condition,
                            value: getValue(property?.dataType, String(value)),
                          };
                          updateConditions(next);
                        }}
                        value={String(condition.value ?? "")}
                      />
                    )}
                  </>
                )}
                <Button
                  aria-label={`Remove condition ${index + 1}`}
                  onClick={() =>
                    updateConditions(
                      conditions.filter((_, item) => item !== index),
                    )
                  }
                  size="sm"
                >
                  Remove / 移除
                </Button>
              </Flex>
            );
          })}
          <Flex gap="spaces-2">
            <Button
              onClick={() =>
                updateConditions([...conditions, createCondition()])
              }
              size="sm"
            >
              Add condition / 添加条件
            </Button>
            <Button onClick={reset} size="sm">
              Reset / 重置
            </Button>
          </Flex>
          {!result.isValid && conditions.length > 0 && (
            <Text color="red">
              Choose a valid property, operator, and value. /
              请选择有效的属性、操作符和值。
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );

  function updateConditionsForType(nextObjectTypeId: string) {
    setConditions([]);
    publish(nextObjectTypeId, []);
  }
}
