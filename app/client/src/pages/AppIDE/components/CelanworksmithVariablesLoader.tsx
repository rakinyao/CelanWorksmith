import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { celanworksmithFunctionRun } from "actions/celanworksmithExecutionActions";
import { celanworksmithObjectQueryRequested } from "actions/celanworksmithObjectQueryActions";
import {
  getCelanworksmithObjectQueriesState,
  getCelanworksmithObjectsState,
} from "selectors/dataTreeSelectors";
import {
  getCelanworksmithExecutionState,
  getCelanworksmithOntologyState,
} from "selectors/celanworksmithSelectors";
import { getCelanworksmithVariableDefinitions } from "selectors/celanworksmithVariableSelectors";
import { getCelanworksmithVariableLoadPlan } from "celanworksmith/variables/variableLoaderUtils";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";

const CelanworksmithVariablesLoader = () => {
  const dispatch = useDispatch();
  const definitions = useSelector(getCelanworksmithVariableDefinitions);
  const objects = useSelector(getCelanworksmithObjectsState);
  const ontology = useSelector(getCelanworksmithOntologyState);
  const execution = useSelector(getCelanworksmithExecutionState);
  const queries = useSelector(getCelanworksmithObjectQueriesState);
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const bindingState = useSelector(getCelanworksmithApplicationBindingState);
  const plan = useMemo(
    () =>
      getCelanworksmithVariableLoadPlan({
        definitions,
        objects,
        ontology,
        execution,
        queries,
        applicationId,
      }),
    [applicationId, definitions, objects, ontology, execution, queries],
  );

  useEffect(() => {
    if (
      !applicationId ||
      bindingState.applicationId !== applicationId ||
      bindingState.status !== "ready"
    ) {
      return;
    }

    plan.objectQueries.forEach((request) => {
      dispatch(celanworksmithObjectQueryRequested(request));
    });

    plan.functionRuns.forEach(({ functionId, parameters }) => {
      dispatch(
        celanworksmithFunctionRun(
          functionId,
          parameters,
          undefined,
          bindingState.status === "ready" ? applicationId : undefined,
        ),
      );
    });
  }, [applicationId, bindingState, dispatch, plan]);

  return null;
};

export default CelanworksmithVariablesLoader;
