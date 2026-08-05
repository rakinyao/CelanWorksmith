import CelanworksmithAPI from "api/CelanworksmithAPI";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import { runSaga, stdChannel } from "redux-saga";
import { all, call, put, takeLeading } from "redux-saga/effects";
import {
  celanworksmithOntologyLoadError,
  celanworksmithOntologyLoadSuccess,
} from "actions/celanworksmithOntologyActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import reducer from "reducers/celanworksmithOntologyReducer";
import {
  default as celanworksmithOntologySaga,
  loadCelanworksmithOntology,
} from "../CelanworksmithOntologySaga";

const functions = [
  {
    id: "CalculateDelayDays",
    displayName: "Calculate Delay Days",
    returnType: "INTEGER",
    parameters: [],
    sideEffectFree: true,
  },
];

const actions = [
  {
    id: "UpdateDeliveryDate",
    displayName: "Update Delivery Date",
    objectTypeId: "PurchaseOrder",
    parameters: [],
    requiresConfirmation: true,
  },
];

describe("loadCelanworksmithOntology", () => {
  it("loads unfiltered Function and Action metadata as one snapshot", () => {
    const iterator = loadCelanworksmithOntology();

    expect(iterator.next().value).toEqual(
      all([
        call([CelanworksmithAPI, CelanworksmithAPI.getFunctions]),
        call([CelanworksmithAPI, CelanworksmithAPI.getActions]),
      ]),
    );
    expect(
      iterator.next([
        { responseMeta: { status: 200, success: true }, data: functions },
        { responseMeta: { status: 200, success: true }, data: actions },
      ]).value,
    ).toEqual(put(celanworksmithOntologyLoadSuccess(functions, actions)));
    expect(iterator.next().value).toEqual(
      put({ type: ReduxActionTypes.TRIGGER_EVAL }),
    );
    expect(iterator.next().done).toBe(true);
  });

  it("normalizes failed API responses and re-evaluates metadata consumers", () => {
    const iterator = loadCelanworksmithOntology();

    expect(iterator.next().value).toEqual(
      all([
        call([CelanworksmithAPI, CelanworksmithAPI.getFunctions]),
        call([CelanworksmithAPI, CelanworksmithAPI.getActions]),
      ]),
    );
    expect(
      iterator.next([
        {
          responseMeta: {
            status: 404,
            success: false,
            error: { code: "FUNCTION_NOT_FOUND", message: "Missing function" },
          },
          data: [],
        },
        { responseMeta: { status: 200, success: true }, data: actions },
      ]).value,
    ).toEqual(
      put(
        celanworksmithOntologyLoadError({
          code: "UNKNOWN_FUNCTION",
          message: "Missing function",
        }),
      ),
    );
    expect(iterator.next().value).toEqual(
      put({ type: ReduxActionTypes.TRIGGER_EVAL }),
    );
    expect(iterator.next().done).toBe(true);
  });

  it("loads metadata after the request reducer marks state loading", async () => {
    let state = reducer(undefined, { type: "@@INIT", payload: undefined });
    const dispatched: Array<{ type: string; payload?: unknown }> = [];
    const channel = stdChannel();
    let complete: () => void;
    const completion = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const getFunctions = jest
      .spyOn(CelanworksmithAPI, "getFunctions")
      .mockResolvedValue({
        responseMeta: { status: 200, success: true },
        data: functions,
      });
    const getActions = jest
      .spyOn(CelanworksmithAPI, "getActions")
      .mockResolvedValue({
        responseMeta: { status: 200, success: true },
        data: actions,
      });
    const task = runSaga(
      {
        channel,
        dispatch: (action) => {
          state = reducer(state, action);
          dispatched.push(action);

          if (action.type === ReduxActionTypes.TRIGGER_EVAL) complete();
        },
        getState: () => ({ celanworksmithOntology: state }),
      },
      celanworksmithOntologySaga,
    );

    try {
      const request = celanworksmithOntologyLoadRequest();

      state = reducer(state, request);
      channel.put(request);

      const completed = await Promise.race([
        completion.then(() => true),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 100),
        ),
      ]);

      expect(completed).toBe(true);
      expect(getFunctions).toHaveBeenCalledTimes(1);
      expect(getActions).toHaveBeenCalledTimes(1);
      expect(state).toMatchObject({
        status: "ready",
        functions,
        actions,
      });
      expect(dispatched).toEqual(
        expect.arrayContaining([
          celanworksmithOntologyLoadSuccess(functions, actions),
          { type: ReduxActionTypes.TRIGGER_EVAL },
        ]),
      );
    } finally {
      task.cancel();
      await task.toPromise();
      jest.restoreAllMocks();
    }
  });
});

describe("celanworksmithOntologySaga", () => {
  it("uses takeLeading to discard concurrent load requests", () => {
    const iterator = celanworksmithOntologySaga();

    expect(iterator.next().value).toEqual(
      all([
        takeLeading(
          ReduxActionTypes.CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST,
          loadCelanworksmithOntology,
        ),
      ]),
    );
  });
});
