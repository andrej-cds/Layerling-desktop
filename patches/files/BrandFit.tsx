"use client";

import { useEffect } from "react";

/**
 * LayerLing by CDS: napis ob logotipu je v eni vrstici in ravno tako širok kot podnapis pod njim
 * (nadzorna plošča in urejevalnik). Velikost črk se izmeri, zato velja za vsako pisavo in vsak jezik.
 */
const LOCKUPS: Array<[string, string]> = [
  [".dashboard-brand-name", ".dashboard-tagline"],
  [".toolbar-brand-name", ".toolbar-brand-tagline"],
];

function textWidth(element: Element): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect().width;
}

function fit() {
  for (const [nameSelector, taglineSelector] of LOCKUPS) {
    document.querySelectorAll<HTMLElement>(nameSelector).forEach((name) => {
      const tagline = name.parentElement?.querySelector<HTMLElement>(taglineSelector);
      name.style.fontSize = "";
      name.style.overflow = "visible";
      name.style.textOverflow = "clip";
      if (!tagline || tagline.offsetParent === null) return; // podnapis skrit (ozko okno): napis ostane običajen
      const target = textWidth(tagline);
      const own = textWidth(name);
      const size = parseFloat(getComputedStyle(name).fontSize);
      if (target > 0 && own > 0 && size > 0) name.style.fontSize = `${Math.max(8, (size * target) / own).toFixed(2)}px`;
    });
  }
}

export function BrandFit() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    schedule();
    window.addEventListener("resize", schedule);
    void document.fonts?.ready.then(schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
  return null;
}
