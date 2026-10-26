/**
 * Kako so v orodni vrstici prikazani gumbi: samo ikone (privzeto), ikone z imenom pod njimi ali samo imena.
 * Izbira je podatkovni atribut na <html>; globals.css iz njega z aria-label gumba izpiše ime. Privzeto stanje
 * (samo ikone) atributa nima, zato brskalnik, ki ni nikoli izbiral, sledi privzetemu.
 */
export const TOOL_LABELS_STORAGE_KEY = "layerling.toolLabels";

export const TOOL_LABELS_OPTIONS = ["icons", "both", "text"] as const;

export type ToolLabels = (typeof TOOL_LABELS_OPTIONS)[number];

export function normalizeToolLabels(value: unknown): ToolLabels {
  return value === "both" || value === "text" ? value : "icons";
}

export function applyToolLabels(mode: ToolLabels) {
  if (typeof document === "undefined") return;
  if (mode === "icons") delete document.documentElement.dataset.toolLabels;
  else document.documentElement.dataset.toolLabels = mode;
}

/** Teče v <head> pred prvim izrisom, da vrstica ne skoči iz ikon v imena. */
export const TOOL_LABELS_BOOT_SCRIPT = `try{var l=localStorage.getItem(${JSON.stringify(TOOL_LABELS_STORAGE_KEY)});if(l==="both"||l==="text")document.documentElement.dataset.toolLabels=l}catch(e){}`;

function readStoredToolLabels(): ToolLabels {
  try {
    return normalizeToolLabels(window.localStorage.getItem(TOOL_LABELS_STORAGE_KEY));
  } catch {
    return "icons";
  }
}

const listeners = new Set<() => void>();
let currentToolLabels: ToolLabels = typeof window !== "undefined" ? readStoredToolLabels() : "icons";

export function setToolLabels(mode: ToolLabels) {
  currentToolLabels = mode;
  try {
    if (mode === "icons") window.localStorage.removeItem(TOOL_LABELS_STORAGE_KEY);
    else window.localStorage.setItem(TOOL_LABELS_STORAGE_KEY, mode);
  } catch {
    // Izbira velja za to sejo tudi, če shramba ni na voljo.
  }
  applyToolLabels(mode);
  listeners.forEach((listener) => listener());
}

export function getToolLabels(): ToolLabels {
  return currentToolLabels;
}

export function subscribeToToolLabels(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
