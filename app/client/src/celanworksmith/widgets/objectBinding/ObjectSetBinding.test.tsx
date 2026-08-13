import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { CelanworksmithObjectQueryRequest } from "actions/celanworksmithObjectQueryActions";
import { getObjectQueryKey } from "reducers/celanworksmithObjectQueryReducer";
import React from "react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import ObjectSetBinding from "./ObjectSetBinding";

const metadata = {
  id: "Supplier",
  displayName: "Supplier",
  properties: [
    {
      id: "supplierName",
      displayName: "Supplier name",
      dataType: "STRING",
      required: true,
      readOnly: false,
      derived: false,
    },
  ],
};

const request: CelanworksmithObjectQueryRequest = {
  widgetId: "Select1",
  typeId: "Supplier",
  query: { limit: 100, offset: 0 },
};

const renderBinding = (state: Record<string, unknown>) =>
  render(
    <Provider store={configureStore()({ ...state })}>
      <ObjectSetBinding
        objectTypeId="Supplier"
        widgetId="Select1"
        widgetType="SELECT_WIDGET"
      >
        {(binding) => (
          <div>{`${binding.status}:${binding.result?.items.length || 0}`}</div>
        )}
      </ObjectSetBinding>
    </Provider>,
  );

describe("ObjectSetBinding", () => {
  test("provides the shared ObjectSet result to an Object mode widget", () => {
    renderBinding({
      celanworksmithObjects: {
        status: "ready",
        types: { Supplier: { metadata, status: "ready" } },
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(request)]: {
            request,
            status: "ready",
            result: {
              typeId: "Supplier",
              items: [
                {
                  id: "supplier-acme",
                  typeId: "Supplier",
                  properties: { supplierName: "Acme" },
                },
              ],
              offset: 0,
              limit: 100,
              total: 1,
            },
          },
        },
      },
    });

    expect(screen.getByText("ready:1")).toBeInTheDocument();
  });

  test("reports an incomplete Object binding as a type mismatch", () => {
    render(
      <Provider
        store={configureStore()({ celanworksmithObjects: { types: {} } })}
      >
        <ObjectSetBinding widgetId="Select1" widgetType="SELECT_WIDGET">
          {(binding) => (
            <div>{`${binding.status}:${binding.diagnostic?.message}`}</div>
          )}
        </ObjectSetBinding>
      </Provider>,
    );

    expect(
      screen.getByText("typeMismatch:Select an ontology Object Type."),
    ).toBeInTheDocument();
  });

  test("reports metadata loading and errors before declaring a type mismatch", () => {
    const loading = renderBinding({
      celanworksmithObjects: {
        status: "loading",
        types: { Supplier: { status: "loading" } },
      },
    });

    expect(loading.getByText("loading:0")).toBeInTheDocument();

    const error = renderBinding({
      celanworksmithObjects: {
        status: "error",
        error: { code: "METADATA_ERROR", message: "Metadata unavailable" },
        types: { Supplier: { status: "error" } },
      },
    });

    expect(error.getByText("error:0")).toBeInTheDocument();
  });

  test("reports a repairable diagnostic for a deleted Object Type", () => {
    render(
      <Provider
        store={configureStore()({
          celanworksmithObjects: {
            status: "ready",
            types: {},
          },
        })}
      >
        <ObjectSetBinding
          objectTypeId="DeletedType"
          widgetId="Select1"
          widgetType="SELECT_WIDGET"
        >
          {(binding) => (
            <div>{`${binding.status}:${binding.diagnostic?.message}`}</div>
          )}
        </ObjectSetBinding>
      </Provider>,
    );

    expect(
      screen.getByText(
        'typeMismatch:Object Type "DeletedType" is missing or unavailable. Select another Object Type.',
      ),
    ).toBeInTheDocument();
  });

  test("reports deleted Link, Action, and Variable bindings from runtime metadata", () => {
    render(
      <Provider
        store={configureStore()({
          celanworksmithObjects: {
            status: "ready",
            types: { Supplier: { metadata, status: "ready" } },
          },
          celanworksmithLinks: {
            metadata: {
              "legacy/Supplier": {
                links: [{ id: "supplier_orders" }],
                status: "ready",
              },
            },
            entries: {},
          },
          celanworksmithOntology: {
            status: "ready",
            actions: [{ id: "UpdateSupplier" }],
            functions: [],
          },
          entities: {
            canvasWidgets: {
              root: {
                type: "CANVAS_WIDGET",
                celanworksmithVariables: [
                  {
                    id: "supplierCount",
                    name: "supplierCount",
                  },
                ],
              },
            },
          },
        })}
      >
        <ObjectSetBinding
          actionId="DeletedAction"
          aggregationVariableName="DeletedVariable"
          linkTypeId="DeletedLink"
          objectTypeId="Supplier"
          widgetId="Select1"
          widgetType="SELECT_WIDGET"
        >
          {(binding) => (
            <div>{`${binding.status}:${binding.diagnostic?.message}`}</div>
          )}
        </ObjectSetBinding>
      </Provider>,
    );

    expect(
      screen.getByText(
        'typeMismatch:Link "DeletedLink" is missing. Select another Link.',
      ),
    ).toBeInTheDocument();
  });

  test("reports empty and permission-denied query results", () => {
    const empty = renderBinding({
      celanworksmithObjects: {
        status: "ready",
        types: { Supplier: { metadata, status: "ready" } },
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(request)]: {
            request,
            status: "empty",
            result: {
              typeId: "Supplier",
              items: [],
              offset: 0,
              limit: 100,
              total: 0,
            },
          },
        },
      },
    });

    expect(empty.getByText("empty:0")).toBeInTheDocument();

    const permissionDenied = renderBinding({
      celanworksmithObjects: {
        status: "ready",
        types: { Supplier: { metadata, status: "ready" } },
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(request)]: {
            request,
            status: "error",
            error: { code: "PERMISSION_DENIED", message: "Forbidden" },
          },
        },
      },
    });

    expect(
      permissionDenied.getByText("permissionDenied:0"),
    ).toBeInTheDocument();
  });

  test("rejects an ObjectSet whose type does not match the requested type", () => {
    renderBinding({
      celanworksmithObjects: {
        status: "ready",
        types: { Supplier: { metadata, status: "ready" } },
      },
      celanworksmithObjectQueries: {
        entries: {
          [getObjectQueryKey(request)]: {
            request,
            status: "ready",
            result: {
              typeId: "PurchaseOrder",
              items: [],
              offset: 0,
              limit: 100,
              total: 0,
            },
          },
        },
      },
    });

    expect(screen.getByText("typeMismatch:0")).toBeInTheDocument();
  });
});
