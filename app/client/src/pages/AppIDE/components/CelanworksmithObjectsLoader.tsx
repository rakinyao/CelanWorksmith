import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { celanworksmithObjectsLoadRequest } from "actions/celanworksmithObjectActions";

const CelanworksmithObjectsLoader = () => {
  const dispatch = useDispatch();
  const hasAttempted = useRef(false);

  useEffect(
    function loadCelanworksmithObjectsOnEditorMount() {
      if (hasAttempted.current) return;

      hasAttempted.current = true;

      dispatch(celanworksmithObjectsLoadRequest());
    },
    [dispatch],
  );

  return null;
};

export default CelanworksmithObjectsLoader;
