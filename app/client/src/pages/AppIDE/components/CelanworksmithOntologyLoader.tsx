import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { celanworksmithOntologyLoadRequest } from "actions/celanworksmithOntologyActions";

const CelanworksmithOntologyLoader = () => {
  const dispatch = useDispatch();
  const hasAttempted = useRef(false);

  useEffect(
    function loadCelanworksmithOntologyOnEditorMount() {
      if (hasAttempted.current) return;

      hasAttempted.current = true;

      dispatch(celanworksmithOntologyLoadRequest());
    },
    [dispatch],
  );

  return null;
};

export default CelanworksmithOntologyLoader;
