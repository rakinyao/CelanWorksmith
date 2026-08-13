import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { celanworksmithObjectsLoadRequest } from "actions/celanworksmithObjectActions";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";

const CelanworksmithObjectsLoader = () => {
  const dispatch = useDispatch();
  const attemptedApplicationId = useRef<string | undefined>(undefined);
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const bindingState = useSelector(getCelanworksmithApplicationBindingState);

  useEffect(
    function loadCelanworksmithObjectsOnEditorMount() {
      if (
        attemptedApplicationId.current === applicationId ||
        !applicationId ||
        bindingState.applicationId !== applicationId ||
        bindingState.status !== "ready"
      )
        return;

      attemptedApplicationId.current = applicationId;

      dispatch(celanworksmithObjectsLoadRequest(applicationId));
    },
    [applicationId, bindingState, dispatch],
  );

  return null;
};

export default CelanworksmithObjectsLoader;
