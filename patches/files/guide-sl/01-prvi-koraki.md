---
title: Prvi koraki
summary: Od praznega lista do prvega dela za 3D-tiskalnik – v petih minutah, brez računa in brez namestitve.
---

layerling je program za konstruiranje za 3D-tisk, ki teče kar v brskalniku. Del zgradiš iz preprostih oblik, vanj izrežeš luknje, zaobliš robove in ga pošlješ v rezalnik. Ničesar ni treba nameščati in se nikjer prijavljati. Kar zgradiš, ostane na tvojem računalniku.

![Začetna stran programa layerling: zgoraj »Ustvari nov 3D-načrt«, pod njim lastni načrti in kratka navodila.](shot:start-page)

## Ustvari načrt

Odpri [layerling.com](https://layerling.com/). Na začetni strani klikni {{ui:dashboard.createDesign}}. Odpre se urejevalnik s prazno delovno ravnino, mrežo, na kateri nastane vse.

Če že imaš datoteko, ki jo želiš urejati naprej, izberi {{ui:dashboard.importGeometry}}. To deluje z načrti programa layerling (`.lyl`) prav tako kot z datotekami STL, OBJ, 3MF, STEP ali SVG.

Vsi tvoji načrti se pozneje pojavijo na začetni strani s sličico predogleda. Shranjeni so v pomnilniku brskalnika in se ob vsaki spremembi samodejno shranijo. Zato gumba za shranjevanje ni. Kako načrte spraviš v datoteko in jih deliš z drugimi, piše v poglavju [Datoteke in shranjevanje](chapter:datoteke-in-shranjevanje).

## Urejevalnik na kratko

![Urejevalnik z dvema oblikama na delovni ravnini. Zgoraj orodna vrstica, levo upravljanje kamere, desno nastavitve izbrane oblike.](shot:editor-overview)

- **Zgoraj** je orodna vrstica. Razvrščena je po opravilih: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.manage}} in {{ui:editor.group.help}}. Ko z miško zapelješ čez ikono, se pokaže njeno ime. Kjer vidiš majhen vprašaj, na primer pri nastavitvah oblike, v knjižnici oblik ali v oknih z orodji, te pelje naravnost v ustrezno poglavje teh navodil.
- **V sredini** je delovna ravnina. Tu postavljaš oblike, jih naravnaš in vidiš rezultat.
- **Desno** se pokažejo nastavitve izbrane oblike: barva, mere, lega in vse drugo, kar oblika še ima. Vpisovanje številk je natančnejše od vlečenja.
- **Levo** je upravljanje kamere z orientacijsko kocko nad njim. S tem se premikaš po prizoru, več o tem v poglavju [Pogled in delovna ravnina](chapter:pogled-in-delovna-ravnina).
- **Čisto zgoraj** preklapljaš med {{ui:editor.modeGeometry}} in {{ui:editor.modeSketch}}, preimenuješ načrt ter nastaviš jezik in barvno shemo.

## Tvoj prvi del

Za primer zgradimo kocko z izvrtino.

1. V orodni vrstici klikni {{ui:editor.addShape}} in izberi {{ui:shape.box}}. Oblika zdaj visi na kazalcu miške. S klikom na delovno ravnino jo odložiš.
2. Desno nastaviš mere, na primer 40 mm dolžine, 40 mm širine in 20 mm višine.
3. Na enak način postavi {{ui:shape.cylinder}} v sredino, s premerom 14 mm in višino 30 mm. Višji mora biti od kocke, da gre čisto skozi.
4. Izberi valj in desno klikni {{ui:inspector.hole}}. Postane prosojen: iz telesa je nastalo orodje, ki odvzema material.
5. Označi obe obliki in klikni {{ui:editor.tool.group}}. Kocka ima zdaj luknjo.

![Valj je luknja in gleda iz kocke navzgor.](shot:hole-before)

![Po združitvi v skupino ima kocka izvrtino.](shot:hole-after)

Natanko tako nastanejo izvrtine, utori in žepi. Poglavje [Telesa in luknje](chapter:telesa-in-luknje) to razloži podrobno.

## Novo od tvojega zadnjega obiska

Ko po posodobitvi spet odpreš layerling, ti kartica na začetni strani pokaže, kaj je prišlo zraven od tvojega zadnjega obiska: vsako različico od takrat, najnovejšo na vrhu. Če te dolgo ni bilo, se v kartici pomakni navzdol. Pod njo {{ui:whatsNew.earlier}} doda tudi različice izpred tvojega zadnjega obiska. Z {{ui:whatsNew.dismiss}} jo zapreš in ostane skrita do naslednje posodobitve. {{ui:whatsNew.footerLink}} v nogi začetne strani vedno znova pokaže zadnje novosti. Brskalnik si zapomni nazadnje videno različico in nič o tebi ne zapusti brskalnika.

Pri kopiji programa layerling na tvojem računalniku ali strežniku ima obvestilo »Na voljo je posodobitev« gumb {{ui:update.previewShow}}, ki našteje, kaj posodobitev prinaša, preden jo namestiš. Seznam se z GitHuba prenese šele, ko pritisneš gumb.

## Od načrta do tiska

Ko je tvoj del končan, klikni {{ui:editor.export}}, izberi STL ali 3MF in prenesi datoteko. Odpreš jo v svojem rezalniku, na primer v Bambu Studiu, PrusaSliceru, OrcaSliceru ali Curi. Kdor v nastavitvah izbere svoj tiskalnik, že med gradnjo vidi, ali del gre na tiskalno ploščo. Več o tem v poglavju [Tiskanje](chapter:tiskanje).

> **Namig:** Če prihajaš iz Tinkercada, se boš hitro znašel: plošča, oblike, telesa in luknje, združevanje v skupine, poravnava in zrcaljenje delujejo skoraj enako. Novo so predvsem posnetje in zaokrožitev, izdolbljenje, navoji in skice.
