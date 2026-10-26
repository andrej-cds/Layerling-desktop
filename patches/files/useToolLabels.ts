"use client";

import { useSyncExternalStore } from "react";
import { getToolLabels, subscribeToToolLabels, type ToolLabels } from "@/lib/toolLabels";

export function useToolLabels(): ToolLabels {
  return useSyncExternalStore(subscribeToToolLabels, getToolLabels, () => "icons");
}
