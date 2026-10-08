"use client";

import { useEffect, useState } from "react";

type SettingsLike = { appVersion?: string };
type BridgeLike = { getSettings?: () => Promise<SettingsLike> };

/** Prikaže različico namizne lupine (npr. »Desktop 1.48.2«); v brskalniku ne naredi nič. */
export function DesktopVersion() {
  const [version, setVersion] = useState("");
  useEffect(() => {
    const bridge = (window as unknown as { layerlingDesktop?: BridgeLike }).layerlingDesktop;
    if (!bridge?.getSettings) return;
    bridge
      .getSettings()
      .then((settings) => setVersion(settings.appVersion ?? ""))
      .catch(() => undefined);
  }, []);
  return version ? <span title="Različica namizne lupine (Layerling Desktop by Cassette Deck Service)">Desktop {version}</span> : null;
}
