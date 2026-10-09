import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import type { FontData } from "three/examples/jsm/loaders/FontLoader.js";

type FontsBridge = {
  listFonts?: () => Promise<string[]>;
  readFont?: (fileName: string) => Promise<ArrayBuffer | Uint8Array | null>;
};

/**
 * Lastne pisave namizne različice: datoteke .ttf in .otf iz mape s pisavami.
 * Vsaka se pretvori v obrise črk (isti zapis kot vgrajene pisave); ime pisave je ime datoteke brez končnice.
 * V brskalniku (brez lupine) vrne prazen seznam.
 */
export async function readUserFontData(): Promise<Array<[string, FontData]>> {
  const bridge = (typeof window === "undefined" ? undefined : (window as unknown as { layerlingDesktop?: FontsBridge }).layerlingDesktop);
  if (!bridge?.listFonts || !bridge.readFont) return [];
  let files: string[] = [];
  try {
    files = (await bridge.listFonts()) ?? [];
  } catch {
    return [];
  }
  const loader = new TTFLoader();
  const result: Array<[string, FontData]> = [];
  for (const file of files) {
    try {
      const raw = await bridge.readFont(file);
      if (!raw) continue;
      const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const data = loader.parse(buffer) as unknown as FontData;
      const name = file.replace(/\.(ttf|otf)$/i, "").trim();
      if (name && Object.keys(data.glyphs ?? {}).length > 0) result.push([name, data]);
    } catch (error) {
      console.warn(`Pisave ${file} ni mogoče prebrati:`, error);
    }
  }
  return result;
}
