import { useCallback, useEffect, useRef, useState } from "react";

export function useAsyncAction<Args extends any[], Result>(
  action: (...args: Args) => any
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>();
  const [data, setData] = useState<Result>();

  const encapsulatedAction = useRef(action);
  encapsulatedAction.current = action;

  const requestIdRef = useRef(0);

  const wrappedAction = useCallback(async (...args: Args): Promise<Result> => {
    setLoading(true);
    requestIdRef.current++;
    const currentStateRequestId = requestIdRef.current;

    try {
      const result = await encapsulatedAction.current(...args);
      if (currentStateRequestId === requestIdRef.current) {
        setData(result);
        setError(undefined);
        setLoading(false);
      }

      return result;
    } catch (err) {
      if (currentStateRequestId === requestIdRef.current) {
        setData(undefined);
        setError(err);
        setLoading(false);
      }

      throw err;
    }
  }, []);

  const trigger = useCallback(
    (...args: Args) => {
      wrappedAction(...args).catch(() => {});
    },
    [wrappedAction]
  );
  useEffect(
    () => () => {
      requestIdRef.current++;
    },
    []
  );

  return { loading, error, data, wrappedAction, trigger };
}
