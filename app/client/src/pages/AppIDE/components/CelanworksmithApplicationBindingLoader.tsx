import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { celanworksmithApplicationBindingLoadRequest } from "actions/celanworksmithApplicationBindingActions";
import { getCelanworksmithCurrentApplicationId } from "selectors/celanworksmithApplicationBindingSelectors";

const CelanworksmithApplicationBindingLoader = () => {
  const dispatch = useDispatch();
  const applicationId = useSelector(getCelanworksmithCurrentApplicationId);
  const loadedApplicationId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!applicationId || loadedApplicationId.current === applicationId) return;

    loadedApplicationId.current = applicationId;
    dispatch(celanworksmithApplicationBindingLoadRequest(applicationId));
  }, [applicationId, dispatch]);

  return null;
};

export default CelanworksmithApplicationBindingLoader;
