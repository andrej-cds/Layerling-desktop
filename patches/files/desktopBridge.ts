"use client";

/*
 * Namizna različica (Electron): most med programom in lupino.
 *
 * Ta datoteka NI del originalnega programa; doda jo `patches/apply.mjs` pri gradnji.
 * V brskalniku `window.layerlingDesktop` ne obstaja in ta kavelj ne naredi nič.
 *
 * Kaj počne:
 *  - na nastavljen interval zapiše spremenjene projekte kot .lyl na disk (samodejno shranjevanje),
 *  - pred zaprtjem okna zapiše vse neshranjeno,
 *  - sprejme datoteke, ki jih lupina odpre (dvojni klik na .lyl, Datoteka → Odpri, obnovitev).
 */

import { useEffect, useRef } from "react";

type DesktopSettings = { autosave: { enabled: boolean; intervalSec: number }; platform: string };
type MirrorEntry = { id: string; name: string; bytes: Uint8Array };
type MirrorResult = { written: number; unchanged: number; failed: Array<{ id?: string; error: string }> };
type OpenedFile = { name: string; bytes: Uint8Array };

type DesktopApi = {
  isDesktop: true;
  platform: string;
  getSettings: () => Promise<DesktopSettings>;
  onSettings: (callback: (settings: DesktopSettings) => void) => () => void;
  mirrorWrite: (entries: MirrorEntry[]) => Promise<MirrorResult>;
  onFlushRequest: (callback: () => void) => () => void;
  flushDone: () => void;
  onOpenFile: (callback: (file: OpenedFile) => void) => () => void;
  ready: () => void;
  reportProjectCount: (count: number) => void;
};

declare global {
  interface Window {
    layerlingDesktop?: DesktopApi;
  }
}

type ProjectLike = { id: string; name: string; updatedAt: number; revision?: number; shapes?: number };

export function projectFingerprint(project: ProjectLike) {
  return [project.updatedAt, project.revision ?? "", project.shapes ?? "", project.name].join("|");
}

export function useDesktopBridge<P extends ProjectLike>(options: {
  projects: P[];
  getBytes: (project: P) => Promise<Uint8Array>;
  openFiles: (files: File[]) => Promise<void> | void;
}) {
  const projectsRef = useRef(options.projects);
  const getBytesRef = useRef(options.getBytes);
  const openFilesRef = useRef(options.openFiles);
  projectsRef.current = options.projects;
  getBytesRef.current = options.getBytes;
  openFilesRef.current = options.openFiles;

  const written = useRef(new Map<string, string>());
  const running = useRef<Promise<void> | null>(null);
  const settings = useRef<DesktopSettings | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const api = typeof window !== "undefined" ? window.layerlingDesktop : undefined;
    if (!api) return;

    const pass = async () => {
      try {
        const changed = projectsRef.current.filter((project) => written.current.get(project.id) !== projectFingerprint(project));
        if (!changed.length) return;
        const entries: MirrorEntry[] = [];
        const prints = new Map<string, string>();
        for (const project of changed) {
          try {
            entries.push({ id: project.id, name: project.name, bytes: await getBytesRef.current(project) });
            prints.set(project.id, projectFingerprint(project));
          } catch {
            // Projekt, ki ga ni mogoče prebrati, se poskusi znova ob naslednjem krogu.
          }
        }
        if (!entries.length) return;
        const result = await api.mirrorWrite(entries);
        const failed = new Set(result.failed.map((item) => item.id));
        prints.forEach((print, id) => {
          if (!failed.has(id)) written.current.set(id, print);
        });
      } catch {
        // Napaka pri zapisu se pokaže uporabniku v lupini; naslednji krog poskusi znova.
      }
    };

    const tick = (): Promise<void> => {
      if (!running.current) {
        running.current = pass().finally(() => {
          running.current = null;
        });
      }
      return running.current;
    };

    const schedule = () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
      const current = settings.current;
      if (!current || !current.autosave.enabled) return;
      timer.current = window.setInterval(() => void tick(), Math.max(5, current.autosave.intervalSec) * 1000);
    };

    const applySettings = (next: DesktopSettings) => {
      settings.current = next;
      schedule();
    };

    api.getSettings().then(applySettings).catch(() => undefined);
    const offSettings = api.onSettings(applySettings);
    const offFlush = api.onFlushRequest(() => {
      // Če je krog že v teku, počakamo nanj in naredimo še enega, da ujamemo zadnje spremembe.
      const wait = running.current ?? Promise.resolve();
      void wait.then(() => tick()).finally(() => api.flushDone());
    });
    const offOpen = api.onOpenFile((file) => {
      void openFilesRef.current([new File([file.bytes as BlobPart], file.name)]);
    });

    api.ready();
    const first = window.setTimeout(() => void tick(), 5000);
    const countReport = window.setTimeout(() => api.reportProjectCount(projectsRef.current.length), 4500);

    return () => {
      offSettings();
      offFlush();
      offOpen();
      window.clearTimeout(first);
      window.clearTimeout(countReport);
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, []);
}
