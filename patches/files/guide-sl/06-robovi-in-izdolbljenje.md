---
title: Posnetje robov in izdolbljenje teles
summary: Posnetje in zaokrožitev na izbranih robovih, stene enake debeline za škatle, kozarce in ohišja.
---

## Posnetje in zaokrožitev robov

Ostri robovi na natisnjenem delu redko dobro izgledajo in tudi niso posebno stabilni. S **posnetjem** rob odrežeš poševno, z **zaokrožitvijo** ga zaobliš. Oboje deluje na robovih, ki jih klikneš.

1. Izberi telo (ali skupino).
2. V orodni vrstici klikni {{ui:editor.tool.fillet}} ali {{ui:editor.tool.chamfer}}, pritisni [[B]] za zaokrožitev ali [[Shift]]+[[B]] za posnetje, ali klikni z desnim gumbom na telo in izberi v meniju.
3. Robovi telesa se poudarijo. Klikni tiste, ki naj bodo prizadeti. Še en klik jih spet odvzame. S [[Shift]] dodaš posamezen rob ali ga odvzameš.
4. Nastavi mero in potrdi z {{ui:edge.apply}} ali [[Enter]].

![Orodje »Zaokroži robove«: vsi ostri robovi so izbrani, na sliki je predogled s polmerom 4 mm.](shot:fillet-preview)

Okno je zgoraj desno. Če zakriva robove, ki jih želiš klikniti, ga povlečeš stran za naslovno vrstico; tam se odpre tudi naslednjič, in enako velja za {{ui:editor.tool.hollow}} in {{ui:editor.tool.array}}. Dvoklik na naslovno vrstico ga vrne nazaj.

Če pri odprtem oknu izbereš obliko iz seznama oblik, se okno zapre, ne da bi karkoli uporabilo, kliknjeni robovi pa so pozabljeni. Klik potem odloži novo obliko namesto izbire robov.

V oknu najdeš:

- {{ui:edge.allSharpEdges}} izbere vse robove naenkrat, {{ui:edge.clear}} izprazni izbor.
- **{{ui:edge.radius}}** pri zaokrožitvi. Pri posnetju nastaviš {{ui:edge.distance}} ali {{ui:edge.angle}}.
- {{ui:edge.sharpThreshold}} določa, kateri robovi sploh veljajo za ostre. Vrednost 25° obravnava kot rob samo izrazite pregibe in pusti ploske prehode pri miru.
- {{ui:edge.topEdges}} izbere samo robove čisto na vrhu telesa. To je hitra pot za modelček za piškote: obris v skici zgradiš kot konturo, nato posneš zgornje robove. Kako strmo je posnetje, nastaviš z {{ui:edge.angle}}; daljše kot je stena debela, ne more postati.
- {{ui:edge.onlyVisibleEdges}} skrije robove, ki ležijo za telesom, gledano od tam, kjer gledaš. Privzeto se vsak rob vidi skozi telo, kar je pri zahtevnem delu zmedeno; ko je stikalo vklopljeno, vidiš in lahko klikneš samo robove, obrnjene proti tebi. Za druge zasukaj pogled. Rob, narisan rdeče (glej spodaj), se vedno pokaže.
- {{ui:edge.tangentChains}}: Klik potem izbere tudi robove, ki mehko prehajajo drug v drugega, na primer vse robove okoli ploskve z zaobljenimi vogali. Stikalo določa samo, kaj klik izbere: jedro CAD posnetje ali zaokrožitev vedno nadaljuje na takih gladko povezanih robovih. Tabla ti potem pove, na koliko dodatnih robovih se to zgodi.
- {{ui:edge.keepSize}} ohrani posnetje ali zaokrožitev tako veliko, kot sta, tudi če telo pozneje povečaš.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} ali {{ui:edge.fine}}) določa, kako fino se izračuna predogled. Pri zahtevnih delih je {{ui:edge.draft}} hitrejši.

Medtem ko vrtiš mero, layerling predogled preračuna. To lahko traja trenutek. Lahko nastavljaš naprej, izračuna se vedno nazadnje izbrana vrednost.

Če je mera prevelika za rob, layerling to pove in predlaga manjšo vrednost. Običajno zadostuje vzeti en do dva milimetra manj. Na ostrih kotih potrebuje zaokrožitev več prostora, kot bi domnevali po polmeru. Na majhnem zaslonu se plošča sama pomakne navzdol, da je sporočilo v vidnem polju.

Če izbor, ki je deloval, odpove, ko klikneš še en rob, ta rob postane rdeč in se nariše širše: to je rob, ki ga pri tej meri ni mogoče obdelati skupaj z drugimi. Klikni ga znova, da ga odstraniš, ali pa zmanjšaj mero. Če med prikazanim sporočilom klikneš še več robov, prvi ostane rdeč. Kadar ni prejšnjega izbora, ki bi deloval – pri prvem kliku ali pri meri, ki si jo ravnokar povečal – rdeči postanejo robovi, ki odpovedo že sami, ali vsi, če gre le za njihovo kombinacijo.

Rob pod kazalcem je prav tako narisan širše, da vidiš, kateri se bo izbral s klikom.

### Preklic obdelave robov

Obdelano telo lahko kadarkoli obdelaš še enkrat. Izberi ga znova in odpri orodje - zaokrožitev, posnetje ali izdolbljenje vsi pokažejo seznam: Pod {{ui:edge.featureHistory}} piše, kaj je že na njem. {{ui:edge.revertAction}} prekliče posamezno obdelavo. Pozor: če so nad njo novejše obdelave, gredo z njo, okno pa pove, koliko jih je.

Ob posnetju, zaokrožitvi ali izdolbljenju je poleg tega {{ui:edge.editAction}}. Obdelavo prekliče enako, a orodje takoj spet odpre z istimi robovi in staro vrednostjo. Spremeniš vrednost in jo uporabiš znova: tako iz zaokrožitve 3 mm nastane ta 5 mm, ne da bi ti bilo treba robove znova klikati. Če so nad njo novejše obdelave, gredo tudi tu zraven. To velja za obdelave robov, ki jih narediš od zdaj; pri starejših stoji samo preklic, pri posameznih delih skupine prav tako.

Pri skupini, na primer valju z izvrtino, obdelani rob spada k dokončanemu telesu, ne k posameznemu delu. Zato iz skupine pri tem nastane eno samo telo, {{ui:editor.tool.ungroup}} pa ni več na voljo. Če obdelavo prekličeš, kot je opisano zgoraj, je skupina z vsemi deli spet tu. Najlažje je robove obdelati šele čisto na koncu. To velja tudi za navoje: orodje za robove vzame navoj kot natančno telo, blok z navojno izvrtino torej dobi svoje zaokrožitve skupaj z navojem v njem. Ugotavljanje robov navoja traja dlje kot pri preprosti obliki, nekaj sekund pri M6 in približno pol minute pri cevnem navoju G1/2.

> **Dobro je vedeti:** layerling pri zaokrožitvah in posnetjih računa z resnično geometrijo CAD, ne samo z mrežo trikotnikov. Zato zaokrožen rob ostane zaokrožen tudi v izvozu STEP.

Del, uvožen kot STEP, prav tako obdrži svojo geometrijo CAD: posnetja, zaokrožitve in izdolbljenje delujejo na telesu iz datoteke, ne glede na to, kako fino je del narisan na zaslonu. STL, OBJ in 3MF prinesejo samo trikotnike, fino narisan del pa je lahko za obdelavo robov preveč gost. Če del obstaja tudi kot STEP, raje uvozi tega.

## Izdolbljenje teles

Škatle, kozarci, ohišja in pokrovi imajo skupno eno stvar: znotraj so prazni, s stenami enake debeline. Natanko to naredi {{ui:editor.tool.hollow}}.

1. Izberi telo in klikni {{ui:editor.tool.hollow}}, ali klikni z desnim gumbom na telo in izberi v meniju.
2. Nastavi {{ui:shell.wall}}.
3. Pod {{ui:shell.openings}} vklopi strani, ki ostanejo odprte: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} ali {{ui:shell.side.right}}, poljubno veliko – {{ui:shell.side.front}} sama da jašek za predal, {{ui:shell.side.left}} in {{ui:shell.side.right}} predor. Če ni vklopljena nobena stran, telo ostane povsod zaprto, z votlino v sredini.
4. Odloči, ali naj bodo {{ui:shell.edges}} {{ui:shell.edges.round}} ali {{ui:shell.edges.sharp}}.
5. Klikni {{ui:shell.apply}}.

![Okno Izdolbi z debelino stene, stikalom za vsako stran, ki ostane odprta, in notranjimi robovi.](shot:hollow-panel)

Stene rastejo navznoter. Zunaj ostane vse, kot je.

{{ui:shell.edges}} štejejo samo tam, kjer se notranje stene razmaknejo: pri stopnici v telesu ali okoli odprtine. Vogali votline preproste škatle so z obema nastavitvama vedno ostri. Za zaobljeno notranjost najprej zaobli zunanje robove telesa (glej zgoraj), nato ga izdolbi: notranjost sledi z radijem, zmanjšanim za debelino stene. Če zaobljene notranjosti ni mogoče zgraditi, kar se lahko zgodi pri obrisu iz zelo veliko kratkih ravnih koščkov, na primer pri izrisani sliki, layerling zgradi isto izdolbeno telo z ostrimi notranjimi vogali.

![Rezultat: lupina s steno 3 mm, zgoraj odprta.](shot:hollow-result)

![Isti kvader, odprt samo na sprednji strani: reža za predal.](shot:hollow-sides)

Za vsako odprto stran telo potrebuje čisto na zunaj na tej strani ravno ploskev. Krogel in prostih oblik zato na ta način ni mogoče izdolbiti. Če je stena predebela za telo, layerling to javi in prosi za tanjšo.

Izdolbiš lahko tudi telo z žepom, na primer kvader z luknjo, ki ne gre skozi do konca in je narejen z združitvijo škatle z dvignjeno luknjo, in sicer z odprtim vrhom: izdolbejo se tudi stene okoli žepa, tako da med zunanjo steno in žepom ostane obroč votline, zgoraj odprt, pod dnom žepa pa tanka votlina.

**Telesa, ki se končajo v konici,** na primer stožec ali zasukan trikotnik, zgoraj nimajo ravne ploskve, ki bi ostala odprta. Tudi povsem zaprta votlina tam ne gre, ker se konice ne da odmakniti navznoter: tudi pri 1 mm stene dobiš sporočilo, da stene ne smejo biti tako debele. Steno raje nariši v profil, preden ga zasukaš: podvoji obris, kopijo enakomerno pomanjšaj, postavi jo v sredino velikega obrisa in z njo izreži velikega, nato zasukaj celoto (poglavje Skice, razdelek Vrtenje). Razdalja med obema obrisoma je debelina stene.

Če pozneje spremeniš velikost izdolbenega telesa, ga layerling takoj znova izdolbe v novi velikosti. Stena ostane tako debela, kot si jo izbral, tudi pri okroglih telesih. Valj, ki ga pri tem v eno smer povlečeš bolj kot v drugo, postane elipsa.

> **Namig:** Pri šobi 0,4 mm je dobro izhodišče debelina stene od 1,2 do 2 mm: dovolj tanka, da prihraniš material, dovolj debela za stabilen del.
