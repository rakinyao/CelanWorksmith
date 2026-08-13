import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";
import {
  getCelanworksmithApplicationBindingState,
  getCelanworksmithCurrentApplicationId,
} from "selectors/celanworksmithApplicationBindingSelectors";

const CelanworksmithOntologyLoader = () => {
  const dispatch = useDispatch();
  const attemptedApplicationId = useRef<string | undefined>(undefined);
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const bindingState = useSelector(getCelanworksmithApplicationBindingState);

  useEffect(
    function loadCelanworksmithOntologyOnEditorMount() {
      if (
        attemptedApplicationId.current === applicationId ||
        !applicationId ||
        bindingState.applicationId !== applicationId ||
        bindingState.status !== "ready"
      )
        return;

      attemptedApplicationId.current = applicationId;

      dispatch(celanworksmithOntologyLoadRequest(applicationId));
    },
    [applicationId, bindingState, dispatch],
  );

  return null;
};

export default CelanworksmithOntologyLoader;
