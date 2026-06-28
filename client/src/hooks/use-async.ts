import { DependencyList, useEffect } from "react";
import { useAsyncAction } from "./use-async-action";

export function useAsync<T>(
  loader: () => Promise<T>,
  dependencies: DependencyList = []
) {
  const { data, loading, error, trigger } = useAsyncAction<[], T>(loader);
  useEffect(() => {
    trigger();
  }, dependencies);

  return { data, loading, error };
}
