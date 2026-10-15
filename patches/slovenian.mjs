// Slovenščina kot samostojen jezik "sl" (kot ruščina in francoščina v originalu); nemščina ostane izvirna.
// Isti paket pripravi tudi predlog za avtorja originala: `node scripts/make-sl-pr.mjs <čista kopija originala>`.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function edit(file, label, change, { log, problems }) {
  if (!existsSync(file)) {
    problems.push(`${file}: datoteke ni več (${label})`);
    return;
  }
  const before = readFileSync(file, "utf8");
  const after = change(before);
  if (after === null) {
    problems.push(`${label}: sidro ni najdeno (originalna koda se je spremenila)`);
    return;
  }
  if (after !== before) writeFileSync(file, after);
  log(`  uporabljeno: ${label}`);
}

export function applySlovenian({ root, projectRoot, log = console.log, problems = [] }) {
  const ctx = { log, problems };
  const src = join(projectRoot, "patches/sl");
  const lib = join(root, "apps/web/src/lib");
  // Stavki vmesnika.
  copyFileSync(join(src, "messages.sl.ts"), join(lib, "messages.sl.ts"));
  log("  dodano: apps/web/src/lib/messages.sl.ts");
  // Vnos v tabeli jezikov.
  edit(join(lib, "languages.ts"), "Slovenščina: tabela jezikov", (text) => {
    if (text.includes('htmlLang: "sl"')) return text;
    const list = text.replace(/export const LANGUAGES = \[([^\]]*)\] as const;/, (whole, items) => (items.includes('"sl"') ? whole : `export const LANGUAGES = [${items}, "sl"] as const;`));
    if (list === text) return null;
    const block = readFileSync(join(src, "languages.sl.txt"), "utf8");
    const marker = "};\n\nexport function isLanguage";
    return list.includes(marker) ? list.replace(marker, () => block.replace(/\n?$/, "\n") + marker) : null;
  }, ctx);
  // Nalagalnik kataloga.
  edit(join(lib, "i18n.ts"), "Slovenščina: nalagalnik kataloga", (text) => {
    if (text.includes("messages.sl")) return text;
    const marker = "  ru: () => import(\"@/lib/messages.ru\").then((module) => module.MESSAGES_RU),\n";
    return text.includes(marker) ? text.replace(marker, () => marker + '  sl: () => import("@/lib/messages.sl").then((module) => module.MESSAGES_SL),\n') : null;
  }, ctx);
  // Poti poglavij in razdelkov navodil.
  edit(join(lib, "guideLinks.ts"), "Slovenščina: poti poglavij in razdelkov", (text) => {
    if (/\bsl: "/.test(text)) return text;
    const ids = JSON.parse(readFileSync(join(src, "guide-ids.json"), "utf8"));
    let missing = 0;
    const out = text.replace(/^(\s*)(\w+): \{(.*) \},$/gm, (whole, space, key, rest) => {
      if (rest.includes('chapter: "')) {
        const id = ids.sections[key];
        if (!id) { missing += 1; return whole; }
        return `${space}${key}: {${rest}, sl: "${id}" },`;
      }
      if (/^\s*\w+: "[^"]*"(, \w+: "[^"]*")*$/.test(rest) && rest.includes('en: "') && ids.chapters[key]) return `${space}${key}: {${rest}, sl: "${ids.chapters[key]}" },`;
      return whole;
    });
    if (missing) problems.push(`guideLinks.ts: ${missing} razdelkov nima slovenskega sidra (patches/sl/guide-ids.json)`);
    return out;
  }, ctx);
  // Črke č, š, ž v sidrih navodil.
  edit(join(root, "scripts/build-guide.mjs"), "Navodila: slovenske črke v sidrih", (text) => {
    if (text.includes('.replace(/č/g, "c")')) return text;
    const find = '.replace(/ß/g, "ss")';
    return text.split(find).length === 2 ? text.replace(find, () => '.replace(/ß/g, "ss").replace(/č/g, "c").replace(/š/g, "s").replace(/ž/g, "z").replace(/đ/g, "d")') : null;
  }, ctx);
  // Zgrajena navodila se ne shranjujejo v git.
  edit(join(root, ".gitignore"), "Slovenščina: .gitignore", (text) => (text.includes("apps/web/public/navodila/") ? text : text.replace("apps/web/public/ru/\n", () => "apps/web/public/ru/\napps/web/public/navodila/\n")), ctx);
  // Navodila.
  const guide = join(root, "docs/guide");
  if (existsSync(guide)) {
    const dir = join(guide, "sl");
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(dir)) if (f.endsWith(".md")) rmSync(join(dir, f));
    for (const f of readdirSync(join(src, "guide"))) copyFileSync(join(src, "guide", f), join(dir, f));
    log("  navodila: slovenska poglavja");
  } else problems.push("docs/guide: mape ni več");
  return problems;
}
