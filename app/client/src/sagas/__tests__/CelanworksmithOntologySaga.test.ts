import CelanworksmithAPI from "api/CelanworksmithAPI";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import { runSaga, stdChannel } from "redux-saga";
import { all, call, put, select, takeLeading } from "redux-saga/effects";
import {
  celanworksmithOntologyLoadError,
  celanworksmithOntologyLoadSuccess,
} from "actions/celanworksmithOntologyActions";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";
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

const advanceToBoundOntologyLoad = (
  iterator: ReturnType<typeof loadCelanworksmithOntology>,
) => {
  expect(iterator.next().value).toEqual(
    select(getCelanworksmithCurrentApplicationId),
  );
  expect(iterator.next("app-1").value).toEqual(
    select(getCelanworksmithApplicationBindingState),
  );

  return iterator.next({
    status: "ready",
    applicationId: "app-1",
    binding: { applicationId: "app-1" },
  }).value;
};

describe("loadCelanworksmithOntology", () => {
  it("does not call the legacy provider while an application binding is pending", () => {
    const iterator = loadCelanworksmithOntology(
      celanworksmithOntologyLoadRequest(),
    );

    expect(iterator.next().value).toEqual(
      select(getCelanworksmithCurrentApplicationId),
    );
    expect(iterator.next("app-1").value).toEqual(
      select(getCelanworksmithApplicationBindingState),
    );
    expect(
      iterator.next({
        status: "loading",
        applicationId: "app-1",
        binding: null,
      }).value,
    ).toEqual(put({ type: ReduxActionTypes.TRIGGER_EVAL }));
  });

 it("loads Function and Action metadata for the bound application", () => {
    const iterator = loadCelanworksmithOntology(
      celanworksmithOntologyLoadRequest("app-1"),
    );

    expect(advanceToBoundOntologyLoad(iterator)).toEqual(
      all([
        call([CelanworksmithAPI, CelanworksmithAPI.getFunctions], "app-1"),
        call([CelanworksmithAPI, CelanworksmithAPI.getActions], undefined, "app-1"),
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
    const iterator = loadCelanworksmithOntology(
      celanworksmithOntologyLoadRequest("app-1"),
    );

    expect(advanceToBoundOntologyLoad(iterator)).toEqual(
      all([
        call([CelanworksmithAPI, CelanworksmithAPI.getFunctions], "app-1"),
        call([CelanworksmithAPI, CelanworksmithAPI.getActions], undefined, "app-1"),
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
        getState: () => ({
          celanworksmithOntology: state,
          entities: { pageList: { applicationId: "app-1" } },
          celanworksmithApplicationBinding: {
            status: "ready",
            applicationId: "app-1",
            binding: { applicationId: "app-1" },
          },
        }),
      },
      celanworksmithOntologySaga,
    );

    try {
      const request = celanworksmithOntologyLoadRequest("app-1");

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
