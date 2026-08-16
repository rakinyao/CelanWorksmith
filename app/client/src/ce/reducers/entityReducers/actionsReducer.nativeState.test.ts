import {
  ReduxActionTypes,
  ReduxActionErrorTypes,
} from "ee/constants/ReduxActionConstants";
import type { ActionResponse } from "api/ActionAPI";
import type { ActionData } from "./actionsReducer";
import actionsReducer from "./actionsReducer";

const actionId = "ontology-query-action";
const existingResponse = {
  body: [{ id: "PO001" }],
  responseMeta: { statusCode: "200", isExecutionSuccess: true },
} as unknown as ActionResponse;

const stateWithResponse = (): ActionData[] => [
  {
    config: { id: actionId, baseId: actionId } as ActionData["config"],
    data: existingResponse,
    isLoading: false,
  },
];

test("preserves the last native response while execution is pending", () => {
  const nextState = actionsReducer(stateWithResponse(), {
    type: ReduxActionTypes.EXECUTE_PLUGIN_ACTION_REQUEST,
    payload: { id: actionId },
  });

  expect(nextState[0]).toMatchObject({
    data: existingResponse,
    isLoading: true,
  });
});

test("stores a completed native success response and clears loading", () => {
  const response = {
    body: [],
    responseMeta: { statusCode: "200", isExecutionSuccess: true },
  } as unknown as ActionResponse;
  const nextState = actionsReducer(stateWithResponse(), {
    type: ReduxActionTypes.EXECUTE_PLUGIN_ACTION_SUCCESS,
    payload: {
      id: actionId,
      baseId: actionId,
      response,
      isActionCreatedInApp: true,
    },
  });

  expect(nextState[0]).toMatchObject({ data: response, isLoading: false });
});

test("ends loading and retains a structured native execution failure", () => {
  const failure = {
    body: { message: "Provider unavailable" },
    responseMeta: { statusCode: "503", isExecutionSuccess: false },
  } as unknown as ActionResponse;
  const nextState = actionsReducer(stateWithResponse(), {
    type: ReduxActionErrorTypes.EXECUTE_PLUGIN_ACTION_ERROR,
    payload: { actionId, data: failure },
  });

  expect(nextState[0]).toMatchObject({ data: failure, isLoading: false });
});

test("preserves the last response when a manual native run fails", () => {
  const nextState = actionsReducer(stateWithResponse(), {
    type: ReduxActionTypes.RUN_ACTION_ERROR,
    payload: { id: actionId },
  });

  expect(nextState[0]).toMatchObject({
    data: existingResponse,
    isLoading: false,
  });
});
