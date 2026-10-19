# Oryginalne wydarzenia Birthright — inwentarz i audyt mechanik

## Zakres, źródła i poziom pewności

To jest inwentarz zachowania **dostępnego checkoutu C++ `fire-lizard/birthrt`**, a nie certyfikacja zachowania każdego wydania sklepowego. Główną ścieżką jest [`GAMEMAP.CPP::DoRandomEvent` i `RandomEvents`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L3776) (linie 3776–4252), wejściem fazy raportu jest [`GAMEMAP.CPP::UpdateDataArea`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4316), a AI obsługuje [`MAPAI.CPP::DoNPCAdmin`](../reference/research-cache/fire-lizard-birthrt/MAPAI.CPP#L236). Ścieżki transferu i zapisu Gorgon Plot są rozwinięte w [grafie transferu](SOURCE_REALM_TRANSFER_CALL_GRAPH.md). Dostępne binarne kompilacje CD/patchy potwierdzają część reguł wykluczania kandydata; zob. [porównanie wersji Gorgon Plot](GORGON_PLOT_VERSION_COMPARISON.md).

Wyróżnienia:

- **Potwierdzone w kodzie** — jawny warunek, wartość lub przypisanie w badanym pliku C++.
- **Intencja / prawdopodobieństwo nominalne** — makro [`random(num)`](../reference/research-cache/fire-lizard-birthrt/SYSTEM.H#L214) skaluje `rand()` do zakresu `0..num-1`; poniższe `1/n`, `20%` itp. opisują zamierzone rozkłady. Częstość dokładna zależy od implementacji i rozkładu platformowego `rand()`.
- **Wymaga porównania wersji** — nie ustalono pełnej zgodności checkoutu z wydaniami 1.02, 1.03 lub 1.04. Wykluczenia Anuire/Chimaeron są potwierdzone w dostępnych binariach CD, 1.02, 1.03 DOS i 1.04; Windows 1.03 pozostaje niezweryfikowany. Nie przesądza to o innych różnicach między wersjami; szczegóły i granice dowodów podano w [porównaniu wersji Gorgon Plot](GORGON_PLOT_VERSION_COMPARISON.md).

W `DoRandomEvent` **nie znaleziono enumu ani nazwanych stałych identyfikatorów**: identyfikatorami dispatchu są literały `select == 0..17`. Nazwy niżej są opisowymi nazwami wyprowadzonymi z komentarzy/komunikatów `printf`, nie oficjalnymi nazwami zaszytymi w enumie.

## 1. Standardowe Random Events (indeksy 0–17)

### Wspólna reguła losowania

Każda osiągnięta próba wybiera jeden indeks równomiernie nominalnie: `random(rm)`, gdzie `rm` wynosi 9 albo 18. Wczesna pula `0..8` zawiera wyłącznie pomoc ekonomiczną i magię; późna pula `0..17` dodaje osiem wyników wojskowych i bunt (17). Reguły dokładne, liczba prób i wybór prowincji są w [grafie przetwarzania](ORIGINAL_EVENT_PROCESSING_FLOW.md#losowanie-standardowych-wydarzen).

Liczba prób wynosi nominalnie 3–7 na wywołanie `RandomEvents` (przed pominięciem nieosiągalnego celu gracza). Powtórzenia indeksu są dozwolone. Nie ma zapamiętywania, że typ już wystąpił, ani ogólnego ponawiania pustego wyniku. Dla jednej osiągniętej próby prawdopodobieństwo nominalne to `1/9` dla indeksu 0–8 w wczesnej puli i `1/18` dla każdego indeksu w późnej puli. Dla typów 9–17 wczesne prawdopodobieństwo wynosi 0. Liczba prób na turę i różnice dla trybu multiplayer wpływają na prawdopodobieństwo wystąpienia co najmniej raz.

Kwoty opisane jako „native” są surowymi wartościami domenowego skarbca. W badanym kodzie skarbiec jest liczony w dziesiątych GB; przeliczenie na GB to `/10`. Tę jednostkę potwierdza również dokumentacja inicjalizacji HD; nie wolno przenosić tych wartości surowych do istniejącego zapisu po raz drugi.

| ID (literał) | Nazwa opisowa w kodzie | Trigger / prawdopodobieństwo | Cel, warunki i wykluczenia | Efekty stanu | Raport / trwałość |
|---:|---|---|---|---|---|
| 0 | **Lots of gold given to Gorgon** | Jedna osiągnięta próba; `1/rm`. | Cel prowincji nie wpływa na odbiorców. Jedyny warunek: Gorgon's Crown nie jest player-controlled. Kod nie sprawdza oddzielnie istnienia ani kontroli Markazoru i Mur-Kilad. | Gorgon's Crown `+(200*date+1000)`, Markazor `+(150*date+500)`, Mur-Kilad `+(70*date+300)` native; dodatkowo surplus income odpowiednio `+1000`, `+500`, `+300`. | Brak `AddReport`; aktualizacje `SetGameData`. Skarbiec i nadwyżka trwają w stanie kampanii/zapisie. |
| 1 | **Gold given to Gorgon** | Jedna próba; `1/rm`. | Jak ID 0: zdarzenie uzależnione wyłącznie od tego, że Gorgon's Crown nie jest player-controlled. | Gorgon `+1000`, Markazor `+500`, Mur-Kilad `+300` native. Bez dodatkowej nadwyżki dochodu. | Brak raportu narracyjnego; modyfikacje skarbca są trwałe. |
| 2 | **Gold given to Rhuobhe** | Jedna próba; `1/rm`. | Niezależny od celu prowincji; tylko `!RHUOBHE.mfIsPlayerCtrl()`. Brak jawnego sprawdzenia `mfExists()`. | Rhuobhe `+2000` native. | Brak `AddReport`; skarbiec zachowuje się w zapisie. |
| 3 | **Gold given to the Spider** | Jedna próba; `1/rm`. | Niezależny od celu prowincji; tylko `!SPIDERFELL.mfIsPlayerCtrl()`. Brak jawnego sprawdzenia `mfExists()`. | Spiderfell `+2000` native. | Brak `AddReport`; skarbiec zachowuje się w zapisie. |
| 4 | **Magical Event: Blessed** | Jedna próba; `1/rm`. | Losowa prowincja albo prowincja gracza wybrana ostatnią próbą. Nie ma filtra lojalności, właściciela, regenta ani wcześniejszego efektu. | `province[prov].Blessed = 3`. Nie czyści `Blighted`. | `IMMEDIATE_BLESS_LAND` do suwerena prowincji przez `AddReportTo`; natychmiastowy raport tylko gdy odbiorca jest bieżącym `HomeRealm`. Trwa do odliczenia. |
| 5 | **Magical Event: Blighted** | Jedna próba; `1/rm`. | Jak ID 4. | `Blighted = 3`; nie czyści `Blessed`. | `IMMEDIATE_BLIGHT`; ten sam warunek odbiorcy. Trwa do odliczenia. |
| 6 | **Magical Event: Warded** | Jedna próba; `1/rm`. | Jak ID 4. | `Warded = 3`, `DispelLvl = REALM::MONSTERS`, `Dispel = 0`. | `IMMEDIATE_WARDING`; raport dla suwerena-payera. Ochrona trwa do odliczenia. |
| 7 | **Magical Event: Honest** | Jedna próba; `1/rm`. | Jak ID 4. | `Honest = 3`. | `IMMEDIATE_HONEST`; raport dla suwerena-payera. Trwa do odliczenia. |
| 8 | **Magical Event: Dispel** | Jedna próba; `1/rm`; dodatkowy rzut `random(20)` dla poziomu. | Jak ID 4; brak warunku „musi istnieć wcześniejsza magia”. | `Dispel = 3`, `DispelLvl = random(20)` (nominalnie 0–19), `Warded = 0`. W kodzie koszt castu w prowincji z `Dispel` wzrasta o `DispelLvl+1` RP (`ACTNMENU.CPP`, linia 6096). | `IMMEDIATE_DISPEL_REALM_MAGIC`; raport dla suwerena. Wartości i czas trwania są zapisywalne. |
| 9 | **Goblin Inf** | Jedna próba; `1/rm`, więc dostępne dopiero w puli 18. | Cel prowincji jest miejscem spawnu. Właściciel armii: domyślnie `REALM::MONSTERS`; Five Peaks dla zakresu `GORGE..TORAIN`, Gorgon's Crown dla `ABATTOIR..ZAPTIG`, Spiderfell/Rhuobhe dla ich prowincji — każdorazowo tylko gdy specjalny realm istnieje. | Przy `cntUnits_() < maxNPCUnits()` wywołuje `CreateUnit(prov, G_INF_UNIT_ICON, 0, m_rlm, FALSE)`. | Jeśli suwerenem prowincji jest `HomeRealm`, dodaje `IMMEDIATE_NPC_MOVE_TROOP`. Po utworzeniu ustawia `NotSpotted = FALSE`. Limit uniemożliwia spawn, bez ponownego losowania. |
| 10 | **Goblin Cav** | `1/rm`, późna pula. | Target/routing/limit jak ID 9. | `CreateUnit` z `G_CAV_UNIT_ICON`. | Jak ID 9. |
| 11 | **Gnoll Irr** | `1/rm`, późna pula. | Jak ID 9. | `CreateUnit` z `N_IRR_UNIT_ICON`. | Jak ID 9. |
| 12 | **Skeletons** | `1/rm`, późna pula. | Jak ID 9. Ten indeks jest też używany przez osobny generator wojsk Gorgona. | `CreateUnit` z `C_SKL_UNIT_ICON`. | Jak ID 9. |
| 13 | **Spiders** | `1/rm`, późna pula. | Jak ID 9. | `CreateUnit` z `C_SPD_UNIT_ICON`. | Jak ID 9. |
| 14 | **Merc Irr** | `1/rm`, późna pula. | Jak ID 9. | `CreateUnit` z `M_IRR_UNIT_ICON`. | Jak ID 9. |
| 15 | **Merc Inf** | `1/rm`, późna pula. | Jak ID 9. | `CreateUnit` z `M_INF_UNIT_ICON`. | Jak ID 9. |
| 16 | **Merc Cav** | `1/rm`, późna pula. | Jak ID 9. | `CreateUnit` z `M_CAV_UNIT_ICON`. | Jak ID 9. |
| 17 | **Rebellion** | Jedna próba; `1/rm`, wyłącznie pula 18. | Najpierw bierze suwerena i lojalność losowo wskazanej prowincji. Następnie skanuje indeksy prowincji rosnąco i zastępuje cel wyłącznie prowincją tego suwerena z `Loyalty > 0` i lojalnością **ściśle mniejszą** od dotychczasowego minimum. | Ustawia lojalność wybranej prowincji na 0. **Ten blok nie ustawia `Contested`**. Nie ma warunku, że lojalność musi być dodatnia; przy lojalności 0 zostaje pierwotna prowincja. | `IMMEDIATE_REBELLION` do suwerena przez `AddReportTo`; raport widoczny dla gracza tylko gdy suweren to `HomeRealm`. Lojalność trwa; dalszy stan contested zależy od kolejnego przebiegu sezonu. |

**Wspólne szczegóły ID 9–16.** Licznik `cntUnits_()` liczy użyte rekordy jednostek (`UNITS.HXX`: `NPC_MAX_UNITS == 1000`); nie liczy żołnierzy w HD-armiach. W Windows multiplayer limit zastępuje wartość `MAX_UNITS - PER_PLAYER_RESERVED_UNITS * HowManyPlayers()`. Jeśli limit jest osiągnięty albo `CreateUnit` zwróci `fERROR`, nie następuje nowy rzut. Trasy regionów zależą od indeksu prowincji i istnienia realm, nie od aktualnego suwerena. Wewnątrz `DoRandomEvent` dla domyślnego właściciela jest używany `MONSTERS`.

## 2. Pozostałe automatyczne wydarzenia ekonomiczne

Nie są indeksami `DoRandomEvent`, choć wpływają na skarbiec/raporty i mają własne losowania.

| Mechanizm | Warunek i dokładna reguła | Skutek / prezentacja |
|---|---|---|
| Pomoc startowa NPC | W [`DoNPCAdmin`](../reference/research-cache/fire-lizard-birthrt/MAPAI.CPP#L236), dla każdego istniejącego realm-u bez kontroli gracza: `mfAddTreasury((5|10|15)*date)` zależnie od easy/medium/hard oraz niezależny rzut `random(5)==0` (nominalnie 20%) dający `+500` native (komentarz: 50 GB). W tym samym adminie, jeśli po rozliczeniu `new_treasury < 5`, ustawia `5+random(5)`; jeśli <15, najpierw zamienia część RP na GB i rozwiązuje utrzymanie/rozformowanie. | Zmiana stanu przed AI orders; to utrzymanie/AI, nie wydarzenie fabularne. Przejście warunkuje `mfExists()`; późniejsza kolejność akcji NPC jest losowana osobno. |
| Mnożnik dochodu z przedmiotu | W `RandomEvents`, jeśli statystyka aktywnego regenta ma `MONEYMULT_MOD`, osobno dla `new_treasury` i skarbca wykonuje `((105*x)/100) + ((random(20)+1)*10)`. Nominalny rzut każdorazowo 1–20; wywołania nie są jednym wspólnym bonusem. | Automatyczny dochód, bez `AddReport`; przed wczesnym wyjściem dla daty/tutorialu. |
| Tutorial | Przy `fTutorialSelected`: każde wywołanie dodaje Dhoesone `+210` native i poprawia reakcję Eyeless One→Dhoesone do co najmniej 95. Przy `date == 5` (komentarz źródła: „turn 6”) ustawia Blighted=2 w Nolien i Loyalty=3 w Riverford. Potem tutorial kończy `RandomEvents` przed standardową pulą i Gorgon Plot. | Skrypt dydaktyczny, zmiany bez raportu w tym bloku. |
| Tryb kontroli Basic | Poza tutorialem, gdy `fControlMode < 2`, tryb Basic (`==0`) dodaje bieżącemu `HomeRealm` `+110` native na wywołanie. | Nie modyfikuje indeksu 9/18; osobna pomoc trybu gry. |
| Ochrona przed przepełnieniem skarbca | W ścieżce rozliczenia `SwitchToActionMode` [`GAMEMAP.CPP`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L2890) pętla działa, dopóki `new_treasury >= 50000`. Losuje `x=random(100)`. Jeśli `date%4==3`, bez względu na `x` wybiera PARTY, kwotę `random(4)+1` (1–4 „kgb”) i losowo ustawia `SetHelped` dla pozostałych realm-ów z wyłączeniami. W pozostałych datach `x<60` daje THEFT, kwotę 1; inaczej EMBEZZLE, kwotę 2. Każdy przypadek odejmuje `amount*10000` i dodaje raport. | To nie losowa katastrofa bezwarunkowa: musi zostać przekroczony próg skarbca; pętla może powtórzyć się, aż saldo spadnie poniżej progu. Raporty `IMMEDIATE_PARTY/THEFT/EMBEZZLE`; każdy skutek jest trwały. |

## 3. Prowincje, lojalność i automatyczne konsekwencje sezonu

### Rozstrzygnięcie lojalności/okupacji

W [`UpdateDataArea`, `ACTN_MODE && fRoundOver`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4316) źródło najpierw zmniejsza liczniki `Blessed`, `Blighted`, `Warded`, `Honest`, `Dispel`, resetuje `Contested` i `OccupRealm`, a następnie przelicza okupację z aktywnych jednostek. Zamek wroga lub niealiancka druga armia oznacza contested, nie okupację; niealiancka armia może dać okupację. Potem wyliczana jest lojalność z `LoyaltyAdj[tax]`, okupacji i dostępnego prawa/jednostek, z ograniczeniem do 0–3. Przy przejściu dodatniej lojalności do 0, źródło zgłasza `SUBJ_REBEL_SEVERE` dla `TaxLevel >= 2`, w pozostałych przypadkach `SUBJ_REBELLION`, i ustawia contested; wzrost z 0 zgłasza `SUBJ_REBELLION_ENDS`. Basic control pomija dostosowanie lojalności. Multiplayer oblicza je dla wszystkich domen; single-player obsługuje `HomeRealm` w tej gałęzi.

To zdarzenie automatyczne, deterministyczne z wyjątkiem wyników wcześniejszych działań, nie jest indeksem 17. Raporty i przypisania są w liniach 4492–4606. Efekty magii wygasają przez zmniejszanie liczników. Zamek może ulec degradacji w `DegradeCastles` pod warunkami wsparcia/oblężenia; fort ukończony i holdingi zniszczone mają własne raporty.

### Odmiany i raporty buntu

Są więc dwie odmienne ścieżki o słowie „rebellion”:

1. indeks losowy 17 ustawia loyalty=0 i raportuje, ale w samym bloku nie ustawia contested;
2. sezonowy spadek loyalty z wartości dodatniej do zera ustawia contested i emituje raport severe/ordinary.  

Nie należy scalać ich z HD `synchronizeRebellions` bez porównania warunków.

## 4. Wydarzenia wojskowe i specjalne wsparcie domen

### Oddziały z indeksów 9–16

Szczegóły każdego indeksu są w tabeli powyżej. To spawnowanie jednostki w prowincji, nie jawne wypowiedzenie wojny, marsz ani losowa bitwa. W raportach `IMMEDIATE_NPC_MOVE_TROOP` jest podawana nazwa realm-u `m_rlm` i prowincja, lecz tylko jeśli suwerenem jest `HomeRealm`.

### Generatory przypisane do specjalnych domen

Po standardowych losowaniach oraz Gorgon Plot w tym samym `RandomEvents` działają dodatkowe pule. Każdy poniższy generator jest odrębnym harmonogramem, nie wynikiem losowego ID 0–17; wywołuje `DoRandomEvent(9..16)` wielokrotnie.

| Realm / trigger | Dokładna reguła kodu | Wynik i uwagi |
|---|---|---|
| Gorgon's Crown | `date > 3 && !GORGONSCROWN.mfIsPlayerCtrl()`. Wybiera `random(17)+ABATTOIR`. `rm=5/10/15` easy/medium/hard. Rzut `random(3)` daje skeleton-only przy wartościach niezerowych (2/3 nominalnie), w innym razie 9–16 losowo. Pętla `for (i=random(rm)+5; i>=0; --i)` tworzy **6–10 / 6–15 / 6–20** jednostek, nie opisane komentarzem 5–10/5–15/5–20. | Jeśli jednostka regenta Gorgona ma indeks `0 < unit < MAX_UNITS`, tworzy dodatkowo **6–10 / 6–15 / 6–20 skeletonów** w jej prowincji. Nie ma sprawdzenia `mfExists()` w warunku spawnów; ogranicza je `DoRandomEvent` i limit jednostek. |
| Five Peaks | `date > 4 && !FIVEPEAKS.mfIsPlayerCtrl()`. `rm=3/4/5`; `j=random(rm); j>=0` daje **1–3 / 1–4 / 1–5 stosów**. Każdy stos ma losową prowincję `GORGE..GORGE+6`, liczbę `random(3)+4` z pętlą inclusive (5–7) i każdy oddział losuje indeks 9–16. | Komentarz mówi 0–4 stosów i 4–6 jednostek; pętla stosów daje 1..rm, a pętla jednostek 5–7. Bez testu `mfExists()` w warunku puli. |
| Spiderfell | `date > 4 && !SPIDERFELL.mfIsPlayerCtrl()`; pętla `random(3)+4` inclusive → 5–7 jednostek. Dla każdej: `random(3)!=0` (2/3 nominalnie) to indeks 13 Spider; inaczej indeksy 9–12 równomiernie nominalnie. | Brak osobnego `mfExists()` w warunku. |
| Rhuobhe | `date > 4 && !RHUOBHE.mfIsPlayerCtrl()`; 5–7 jednostek, każda z indeksów 9–12. | Brak osobnego `mfExists()` w warunku. |

### Gorgon jako cel militarny

`BATTLEUI.CPP::CheckDefeatOfGorgon` jest wywoływany po zwycięstwie w bitwie; jeśli pokonanym był `GORGON_UNIT_ICON`, dodaje regentowi gracza `ITEM_GORGONS_BANNER`. Komentarz źródła deklaruje specjalny bonus 100 punktów; ta funkcja sama przyznaje przedmiot, nie wylicza punktów. To osobna ścieżka od trzech cinematiców fabuły. `RegentDeathTest` z kolei wykrywa brak jednostki aktywnego regenta gracza i pokazuje ekran porażki; śmierć regenta w `DeleteUnit` ustawia mu unit=-1, zeruje regency domeny, promuje pierwszego żyjącego regenta tej samej domeny albo ustawia jej regent=0. Nie jest to losowy „event śmierci”; śmierć wynika z bitew/zdarzeń postaci. Odnośniki: [`UNITS.CPP::DeleteUnit/RegentDeathTest`](../reference/research-cache/fire-lizard-birthrt/UNITS.CPP#L2377), [`BATTLEUI.CPP::BattleWin/CheckDefeatOfGorgon`](../reference/research-cache/fire-lizard-birthrt/BATTLEUI.CPP#L4495).

## 5. Wydarzenia polityczne i dyplomatyczne

### Gorgon Plot — osobny trzyetapowy skrypt kampanii

To nie jest ID z puli 0–17. W [`RandomEvents`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4096):

| Etap | Dokładny trigger | Skutek, stan i prezentacja |
|---:|---|---|
| 1 | `date >= 3 && iGorgonPlot == 0 && !GORGONSCROWN.mfIsPlayerCtrl()`; brak rzutu. | `PlayGorgon(1,0)`; `iGorgonAlly=0`; `iGorgonPlot++`. |
| 2 | `iGorgonPlot==1 && date>=8 && random(4)==0 && !GORGONSCROWN.mfIsPlayerCtrl()`; nominalnie 1/4 na każde kwalifikujące się wywołanie. | `PlayGorgon(2,0)`, reset ally, wybór `iGorgonAlly`; `iGorgonPlot++`. |
| 3 | `iGorgonPlot==2 && date>=16 && random(4)==0 && !GORGONSCROWN.mfIsPlayerCtrl()`; nominalnie 1/4 na każde kwalifikujące się wywołanie. | `PlayGorgon(3,0)`, Gorgon +400, Markazor +200, Mur-Kilad +100 native; skan prowincji, jednostek i holdingów realm ally oraz przepisanie ich właściciela na Gorgon's Crown; `iGorgonPlot++`. Nie przenosi w tych pętlach statusów dyplomatycznych ani osobno rekordu regenta. |

**Kandydat etapu 2.** Skanuje `i=1..LAND_REALM_COUNT-1`. Wymaga `mfExists()` i braku player-control; checkout jawnie wyklucza Anuire, Chimaeron, Gorgon's Crown, Markazor, Monsters, Mur-Kilad, Rhuobhe i Spiderfell. Statyczna analiza potwierdza wykluczenia Anuire/Chimaeron w CD retail Windows/DOS, patchach 1.02 Windows/DOS, 1.03 DOS oraz 1.04 Windows/DOS; Windows 1.03 pozostaje niezweryfikowany. Pełna tabela buildów i hashy jest w [porównaniu wersji Gorgon Plot](GORGON_PLOT_VERSION_COMPARISON.md). Nie uogólniać jej na nieweryfikowane binaria ani modyfikacje kampanii.

- W single-player/nie-multiplayer `TestScore = sScores[i] + (sScores[i]*TestAdjacent(HomeRealm,i)*15)/10 + (sScores[i]*AREALLIED(HomeRealm,i)*15)/10`, porównane z `maxScore`.
- W multiplayer używa `((sScores[i]*8)+random(sScores[i]*4))/10 > maxScore` (komentarz: losowanie około ±20%).
- Po wyborze ustawia `maxScore = sScores[i]` — **wartość surową**, nie porównany score. `sScores` pochodzi z `CalculatePoints`.
- Jeśli nikt nie przejdzie warunku, ally pozostaje 0. Etap 3 nie sprawdza `iGorgonAlly != 0`; pętle transferowe porównają wówczas właścicieli do `NO_COUNTRY` (0).

**Premia oczekiwania.** Po wejściu w etap 2, przy każdym kolejnym wywołaniu z `iGorgonPlot==2 && iGorgonAlly`, ally otrzymuje `+100` native skarbca i `+50` RP. W wywołaniu, które przejdzie etap 3, najpierw plot zwiększa się do 3, więc premii nie ma. Jeżeli stage 3 nie może już zajść, ten warunek nie ma własnego timeoutu.

**Zapis i presentation.** Globalne `iGorgonPlot`/`iGorgonAlly` są serializowane przez `SaveGameFiles` i przywracane przez `LoadGameFiles` (`LOADSAVE.CPP` linie 287–288 i 541–542). `MAIN.CPP::PlayGorgon` mapuje etapy do `intro\gorgon2.flc`, `gorgon3.flc`, `gorgon4.flc`, plansz `gorgon1.txt`–`gorgon3.txt`, palet oraz frame-synchronized `SND_*` cues. Powrót z filmu prowadzi do skutków kodu niezależnie od tego, czy `PlayFlic` zakończył pełne odtwarzanie. Gorgon Plot i pełny takeover są rozpisane również w [grafie transferu](SOURCE_REALM_TRANSFER_CALL_GRAPH.md). Wariantów plików i algorytmu w retail 1.02–1.04 nie porównano.

### Losowa zmiana reakcji/rozpad sojuszy

Przy końcu sezonu, po przeliczeniu terytorium i przed dodaniem nowych adventure sites, [`UpdateDataArea`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4650) zmienia macierz `RealmReaction` dla każdej pary:

- jeśli bit `RealmStatus & 0x80` jest ustawiony, reakcja spada o `random(5)+1` (nominalnie 1–5);
- w przeciwnym razie, dla par nieobejmujących wymienionych domen specjalnych, `random(50)==0` (nominalnie 1/50) podnosi reakcję o `random(5)+1`;
- permissive alliance poniżej 35 degraduje do neutral; full alliance poniżej 45 do permissive;
- vassalage poniżej 40 kończy się wraz z wyczyszczeniem tribute w obu kierunkach. Jeśli tribute jest obecne, przy reakcji 40–64 reakcja jest najpierw podnoszona do `65 + 3*tribute`.

Gdy druga strona jest `HomeRealm`, dodaje raport `IMMEDIATE_ALLIANCE_DEG` lub `IMMEDIATE_VASSAL_LEAVE`. To losowa automatyczna zmiana relacji, nie ogólny Random Event. Badana HD `seasonalDiplomacy` tylko degraduje na podstawie już zapisanej reakcji; nie powtarza tych rzutów/zmian reakcji.

### Wojny AI, akcje i raporty

`MAPAI.CPP::DoNPCAction` wybiera i wykonuje zwykłe akcje strategiczne AI. Losowania sukcesu, decyzji o wojnie, magii, agitacji, inwestyturze, dyplomacji i ruchach są elementami decyzji/rozstrzygnięcia akcji AI, a nie oddzielnym globalnym schedulerem eventów. Wyniki są raportowane m.in. jako `IMMEDIATE_NPC_DECLARE_WAR`, `IMMEDIATE_NPC_MOVE_TROOP`, `IMMEDIATE_NPC_BLIGHT`, `IMMEDIATE_NPC_WARDING`, `IMMEDIATE_NPC_DEATH_PLAGUE`, `IMMEDIATE_NPC_DEMAGOGUE`, `IMMEDIATE_NPC_SUMMONING` i inne `SUBJ_*`; definicje są w [`REPORT.HXX`](../reference/research-cache/fire-lizard-birthrt/REPORT.HXX#L135) i mapowanie tekstów w [`REPORT.CPP::Subject`](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L225). Nie są to eventy z indeksami 0–17.

`AddReport`, `AddReportTo` i `CheckForImmediateReports` w [`REPORT.CPP`](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L682) tworzą/wyświetlają raporty i nie uruchamiają mechaniki eventu. `AddReportTo` dodaje lokalny raport, gdy realm odbiorcy to `HomeRealm`; ID tekstów są `STR_RPT_*`, ale literalne teksty/kompletne zasoby lokalizacyjne nie są tu dekodowane.

## 6. Wydarzenia dotyczące regentów/postaci i inne skrypty

- Śmierć regenta, sukcesja/promocja lieutenant, śmierć domeny bez prowincji (`CheckRealmStatus`) i raport `IMMEDIATE_DEATHNOTIFY` są następstwami zdarzeń bojowych/utraty prowincji, nie losowaniem z puli eventów. `CheckRealmStatus` po wejściu do `GiveReport` usuwa domenę bez prowincji z wyjątkiem wyjątków; Gorgon takeover wykonuje pełny transfer wcześniej. Szczegóły skutków transferu i późniejszego zapisu regenta są w [grafie transferu Gorgona](SOURCE_REALM_TRANSFER_CALL_GRAPH.md).
- Awans postaci (`EXPLEVEL.CPP`) może dodać `IMMEDIATE_LEVELUP` po naliczeniu XP; funkcja raportuje wynik progu, nie losuje samodzielnego eventu.
- Bitwa z Gorgonem nagradza Banner jak wyżej; zwycięstwo kampanii wywołuje `PlayFinale`, nie jest losowym eventem.
- W analizowanym turn-loop znaleziono tylko jeden wieloetapowy, zmieniający stan skrypt fabularny: **Gorgon Plot**. `PlayGorgon` ma również niezależne wejścia debug/komendowe, które odtwarzają scenkę, ale nie wykonują transferu. Wersje 1.02–1.04 mogą mieć inne reguły i listę kandydatów.

## 7. Zakres przeglądu i ścieżki nierozstrzygnięte

| System / ścieżka | Pokrycie w tym audycie | Pozostała niepewność |
|---|---|---|
| `RandomEvents` + `DoRandomEvent`, pule i skutki 0–17 | **Przejrzane w całości** dla checkoutu: pętle, bramki, wszystkie 18 case, raporty i wywołania specjalne. | Brak porównania binary/source dla wydań 1.02–1.04; dokładna rozkładowa częstość platformowego `rand()` nie jest mierzona. |
| Faza `UpdateDataArea` → raport → RandomEvents → `DoNPCAdmin` | **Przejrzana** w zakresie porządku zdarzeń i automatycznych konsekwencji. | Cały system UI/report nie jest pełną inwentaryzacją każdej treści `STRDAT`. |
| Gorgon Plot i transfer | **Przejrzane**, w tym `iGorgonPlot`, `iGorgonAlly`, cinematic call, wzmocnienia i save/load; zob. graf transferu. | Wykluczenia/algorytm mogą się różnić w innych wersjach; brak porównania 1.02–1.04. |
| Generatory armii specjalnych domen | **Przejrzane** w `RandomEvents`; zakresy policzone z inkluzywnych pętli. | Wynik rzeczywisty zależy od `CreateUnit`, dostępności rekordu i limitu jednostek. |
| AI economy / `DoNPCAction` / losowania akcji | **Częściowo** — przejrzano admin, bonusy, kolejność, raporty i odróżnienie od eventów. | Wszystkie profile/gałęzie akcji AI nie są skatalogowane jako mechanika per-mechanika; to osobny system strategiczny. |
| Raporty | **Częściowo** — `AddReport*`, immediate queue i mapowanie subjectów. | Pełne literalne komunikaty z zasobów i wszystkie przypadki multiplayer. |
| RNG całego repozytorium C++ | **Przeszukane**, przejrzane główne źródła strategiczne oraz część rendererów. | Wspólny `rand()` jest również używany w animacji/rysowaniu (`REPORT.CPP`, `GAMEMAP.CPP`); wpływ call-order na późniejsze rzuty nie został odtworzony. Tactical combat/adventure i wszystkie wyjątki multiplayer nie są kompletnym audytem kampanii. |
| Dane źródłowe i oryginalne wydania | Wykorzystano jedynie do potwierdzenia kontekstu, gdy pasowały do badanej gałęzi kodu. | Brak inwentaryzacji eventów w każdym oryginalnym pliku zasobów/wydaniu; nie wyciągać z tego wniosku o zgodności wersji. |

## Implementation corrections and status

Five Peaks stack bounds were corrected: `random(3/4/5)` followed by an inclusive zero-ending loop yields 1–3/1–4/1–5 stacks. The final player province scan decrements its counter for every province, not only owned provinces; the processing-flow document now reflects this. Source IDs identify Five Peaks province 148 as **The Gorge**, independent of translated names. The current implementation, eight switches (Treasury Incidents Off by user choice), reports, media and remaining dependencies are documented in [the implementation report](CAMPAIGN_EVENTS_IMPLEMENTATION_REPORT.md).
