"use strict";
// Opis izdaje za pogovorno okno posodobitve: brez oznak HTML, brez tehničnih vrstic iz sporočila commita.

const ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

function cleanReleaseNotes(raw, max = 500) {
  if (typeof raw !== "string") return "";
  const text = raw
    .replace(/<[^>]+>/g, "")
    .replace(/&(lt|gt|amp|quot|nbsp|#39);/g, (m) => ENTITIES[m] ?? m);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !/^(Co-Authored-By|Claude-Session|Signed-off-by):/i.test(line));
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

module.exports = { cleanReleaseNotes };
