import React from "react";
import type * as ReactTypes from "react";
import { ThemeProvider } from "styled-components";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { theme } from "constants/DefaultTheme";
import ChartDataControl from "./ChartDataControl";

jest.mock("components/editorComponents/LazyCodeEditor", () => {
  const React = jest.requireActual<ReactTypes>("react");

  return {
    __esModule: true,
    default: (props: { expected: unknown }) =>
      React.createElement(
        "div",
        { "data-testid": "editor-expected" },
        JSON.stringify(props.expected),
      ),
  };
});

const makeProps = (chartType: string, propertyValue = {}) =>
  ({
    evaluatedValue: undefined,
    widgetProperties: { chartType },
    parentPropertyName: "",
    parentPropertyValue: undefined,
    additionalDynamicData: {},
    label: "Data",
    propertyName: "chartData",
    propertyValue,
    controlType: "CHART_DATA",
    isBindProperty: false,
    isTriggerProperty: false,
    openNextPanel: jest.fn(),
    deleteProperties: jest.fn(),
    onPropertyChange: jest.fn(),
    theme: "LIGHT",
  }) as never;

const testTheme = {
  ...theme,
  colors: { ...theme.colors, propertyPane: { label: "#fff" } },
};

const dataExpected = () =>
  screen
    .getAllByTestId("editor-expected")
    .map((node) => JSON.parse(node.textContent || "{}"))
    .find((expected) => expected.example?.[0]?.x !== undefined);

const renderControl = (props: never) =>
  render(
    <ThemeProvider theme={testTheme}>
      <ChartDataControl {...props} />
    </ThemeProvider>,
  );

describe("ChartDataControl", () => {
  it("shows numeric coordinate examples only for scatter charts", () => {
    const sampleData = {
      series: { seriesName: "Series", data: '[{"x":"1","y":2}]' },
    };
    const { rerender } = renderControl(makeProps("SCATTER_CHART", sampleData));

    expect(dataExpected().example).toEqual([{ x: 0, y: 50 }]);

    rerender(
      <ThemeProvider theme={testTheme}>
        <ChartDataControl {...makeProps("COLUMN_CHART", sampleData)} />
      </ThemeProvider>,
    );
    expect(dataExpected().example).toEqual([{ x: "Mon", y: 10000 }]);
  });

  it("uses numeric X for newly added scatter series and preserves column defaults", () => {
    const onPropertyChange = jest.fn();
    const scatterProps = {
      ...makeProps("SCATTER_CHART"),
      onPropertyChange,
    };
    const { rerender } = renderControl(scatterProps as never);

    fireEvent.click(screen.getByRole("button", { name: "Add series" }));
    expect(onPropertyChange.mock.calls[0][1]).toEqual({
      seriesName: "",
      data: '[{"x":0,"y":50}]',
    });

    onPropertyChange.mockClear();
    rerender(
      <ThemeProvider theme={testTheme}>
        <ChartDataControl
          {...{ ...makeProps("COLUMN_CHART"), onPropertyChange }}
        />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add series" }));
    expect(onPropertyChange.mock.calls[0][1]).toEqual({
      seriesName: "",
      data: '[{"x":"label","y":50}]',
    });
  });

  it("does not rewrite existing series when chart type changes", () => {
    const onPropertyChange = jest.fn();
    const existing = {
      series: { seriesName: "Existing", data: '[{"x":"Mon","y":4}]' },
    };
    const { rerender } = renderControl({
      ...makeProps("COLUMN_CHART", existing),
      onPropertyChange,
    } as never);

    rerender(
      <ThemeProvider theme={testTheme}>
        <ChartDataControl
          {...{ ...makeProps("SCATTER_CHART", existing), onPropertyChange }}
        />
      </ThemeProvider>,
    );
    expect(onPropertyChange).not.toHaveBeenCalled();
  });
});
