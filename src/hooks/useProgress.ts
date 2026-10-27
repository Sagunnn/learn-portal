import { useSyncExternalStore } from "react";
import { progress, type ProgressState } from "../lib/progress";

export function useProgress(): ProgressState {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}
