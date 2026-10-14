// Sestavi opis izdaje (angleško, nato slovensko) iz novosti originalnega programa in slovenskega prevoda.
// Uporaba: node scripts/release-notes.mjs v1.72.3  → napiše release-notes/v1.72.3.md
// Opis uporabi postopek "Gradnja in izdaja" ob ustvarjanju izdaje; brez datoteke se uporabi samodejni opis GitHuba.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.argv[2];
if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) {
  console.error("Uporaba: node scripts/release-notes.mjs vX.Y.Z");
  process.exit(1);
}
const version = tag.slice(1);

const enFile = join(root, "upstream/apps/web/src/lib/whatsNew.json");
const slFile = join(root, "patches/files/whatsNew.sl.json");
const en = existsSync(enFile) ? JSON.parse(readFileSync(enFile, "utf8")).find((entry) => entry.version === version) : null;
const sl = JSON.parse(readFileSync(slFile, "utf8"))[version];

if (!en) {
  console.error(`Za ${version} v originalnem programu ni zapisa novosti; opis se ne ustvari (uporabi se samodejni).`);
  process.exit(2);
}

const enItems = en.items.map((item) => `- **${item.title.en}**\n  ${item.body.en}`);
const slItems = Array.isArray(sl) && sl.length === en.items.length
  ? sl.map(([title, body]) => `- **${title}**\n  ${body}`)
  : null;

const parts = [`## What's new in ${version}`, "", ...enItems];
if (slItems) parts.push("", "---", "", `## Kaj je novega v ${version}`, "", ...slItems);
parts.push(
  "",
  "---",
  "",
  `Layerling Desktop is a desktop version of the open-source [layerling](https://github.com/henmedia/layerling) (version ${version}) with a Slovenian interface. / Layerling Desktop je namizna različica odprtokodnega programa [layerling](https://github.com/henmedia/layerling) (različica ${version}) s slovenskim vmesnikom.`,
  "",
);

mkdirSync(join(root, "release-notes"), { recursive: true });
writeFileSync(join(root, "release-notes", `${tag}.md`), parts.join("\n"));
console.log(`release-notes/${tag}.md${slItems ? "" : " (brez slovenskega dela: število novosti se ne ujema)"}`);
