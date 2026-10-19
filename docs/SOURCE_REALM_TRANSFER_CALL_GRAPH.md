# Oryginalny kod: graf wywołań transferu domeny i fabuły Gorgona

## Zakres

Analiza dotyczy kopii źródeł `fire-lizard/birthrt` w `reference/research-cache/fire-lizard-birthrt`. Opisuje zachowanie kodu, a nie implementację Birthright HD. Nie zmieniono kodu gry ani danych kampanii.

## Najważniejszy wynik

Kod fabularnego przejęcia znajduje się w `GAMEMAP.CPP::RandomEvents`, nie w zwykłej dyplomacji `ACTNMENU.CPP::PaintDiplomacy`.

Łańcuch jest jawny:

1. `RandomEvents` odtwarza pierwszą scenkę Gorgona od `date >= 3`.
2. Od `date >= 8`, po losowaniu 1/4, odtwarza drugą scenkę i wybiera istniejącą domenę sterowaną przez AI jako sprzymierzeńca Gorgona.
3. Po `date >= 16`, przy kolejnym losowaniu 1/4, odtwarza trzecią scenkę.
4. Po powrocie ze scenki kod przenosi wszystkie prowincje, jednostki i holdingi wybranego realm do Gorgon's Crown.
5. W następnym generowaniu raportu `CheckRealmStatus` wykrywa dawną domenę bez prowincji i oznacza ją jako nieistniejącą. Jednostki, które już zmieniły właściciela, nie są kasowane.

Scenka trzecia poprzedza transfer w tej samej funkcji. Sama funkcja odtwarzająca film nie zmienia stanu kampanii; stan zmienia kod `RandomEvents` bezpośrednio po jej powrocie.

## 1. Punkt wejścia i harmonogram wydarzeń

### `UpdateDataArea` → `RandomEvents` → `DoNPCAdmin`

W [GAMEMAP.CPP::UpdateDataArea](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4316) blok fazy `REPORT_DONE_MODE` wywołuje `RandomEvents()` (linia 4790), a następnie `DoNPCAdmin()`. Zatem plot jest rozpatrywany w przejściu po raporcie i przed administrowaniem domenami AI.

Data kampanii jest zwiększana przy wejściu do `INIT_REPORT_MODE`, przed `GiveReport` ([GAMEMAP.CPP](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4739)). Wnioski poniżej odnoszą się do licznika `date` z kodu; źródło nie nazywa tych progów dniami.

Na wejściu `RandomEvents`:

- samouczek kończy tę funkcję przed zdarzeniami losowymi i plotem Gorgona;
- `date < 2` kończy funkcję przed plotem;
- w trybach kontroli poniżej 2 mogą być wcześniej stosowane modyfikacje skarbca;
- od `date >= 2` najpierw wykonywana jest pętla losowych wydarzeń ogólnych: liczba prób wynika z `random(5)+2`; później losowane jest `DoRandomEvent` z puli 9 typów na wczesnych etapach lub 18 typów po progu trudności/data.
- dopiero po tej pętli rozpoczyna się sekcja `Gorgon's Plot`.

Wydarzenia Gorgona nie są wynikiem losowania `DoRandomEvent(r, province)`: mają osobne warunki, stan etapów i wywołania filmów w dalszej części `RandomEvents` ([GAMEMAP.CPP::RandomEvents](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L3996)).

### Stan plotu i zapis gry

Globalne `iGorgonPlot` i `iGorgonAlly` startują od zera ([GAMEMAP.CPP](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L376)). Są jawnie zapisywane i odczytywane przez `SaveGameFiles`/`LoadGameFiles` ([LOADSAVE.CPP zapis](../reference/research-cache/fire-lizard-birthrt/LOADSAVE.CPP#L287), [odczyt](../reference/research-cache/fire-lizard-birthrt/LOADSAVE.CPP#L541)). Etap oraz wybrany sojusznik przetrwają zatem normalny zapis/odczyt w tym modelu danych.

## 2. Dokładny przebieg fabuły Gorgona

Kod znajduje się w [GAMEMAP.CPP::RandomEvents, sekcja „Gorgon's Plot”](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4096).

| Etap | Warunki | Operacje przed / po scenie |
|---|---|---|
| 1 | `date >= 3`, `iGorgonPlot == 0`, Gorgon's Crown nie jest sterowane przez gracza | Wywołuje `PlayGorgon(1,0)`, zeruje `iGorgonAlly`, zwiększa `iGorgonPlot` do 1. Nie transferuje zasobów. |
| 2 | `iGorgonPlot == 1`, `date >= 8`, `random(4)==0`, Gorgon nie jest sterowany przez gracza | Wywołuje `PlayGorgon(2,0)`, resetuje `iGorgonAlly`, wybiera kandydata i zwiększa etap do 2. |
| 3 | `iGorgonPlot == 2`, `date >= 16`, `random(4)==0`, Gorgon nie jest sterowany przez gracza | Wywołuje `PlayGorgon(3,0)`, dodaje złoto Gorgonowi, Markazorowi i Mur-Kilad, przenosi prowincje/jednostki/holdingi kandydata do Gorgon's Crown i zwiększa etap do 3. |

Losowanie 1/4 w etapach 2 i 3 jest wykonywane za każdym wywołaniem `RandomEvents`, gdy spełniono próg daty i stan etapu. Nie jest to jednorazowy dzień ani pewny termin; po nieudanym losowaniu etap pozostaje bez zmian i próba powtarza się przy kolejnym wywołaniu. Warunek nie sprawdza, czy `PlayGorgon` faktycznie odtworzył całą animację.

### Wybór domeny w etapie 2

Pętla obejmuje lądowe indeksy domen (`1 .. LAND_REALM_COUNT-1`). Kandydat musi istnieć i nie być sterowany przez gracza. Jawnie wykluczone są: Anuire, Chimaeron, Gorgon's Crown, Markazor, Monsters, Mur-Kilad, Rhuobhe i Spiderfell. Dla każdego kandydata kod wylicza wartość porównującą wynik domeny `sScores[i]` z premiami za sąsiedztwo i sojusz z bieżącym `HomeRealm`; w multiplayerze zamiast tych premii stosuje losową korektę wyniku.

`sScores` jest wynikiem `CalculatePoints(realm)` obliczanym przy tworzeniu raportu ([REPORT.CPP](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L1097)). W pętli występuje istotny szczegół: warunek porównuje obliczoną wartość z `maxScore`, lecz po wyborze zapisuje do `maxScore` surowe `sScores[i]`, nie porównywaną wartość. To dokładny algorytm źródła, a nie czyste „wybierz najwyższy zmodyfikowany wynik”.

Jeżeli pętla nie wybierze kandydata, `iGorgonAlly` pozostaje równe 0. Etap 3 nie ma dodatkowego warunku `iGorgonAlly != 0`; wówczas jego pętle transferowe porównują właścicieli do `NO_COUNTRY` (0). To ścieżka brzegowa zapisana w kodzie.

Po osiągnięciu etapu 2, przy każdym wywołaniu `RandomEvents` przed etapem 3, wybrany sojusznik otrzymuje 100 skarbca i 50 Regency Points. Ten przyrost zachodzi w osobnym warunku `iGorgonPlot == 2 && iGorgonAlly` (linie 4172–4177); w wywołaniu, które uruchomi etap 3, etap jest już zwiększony do 3, więc premia nie zostaje naliczona.

## 3. Funkcja odtwarzania scenek i kolejność efektów

### `MAIN.CPP::PlayGorgon`

[PlayGorgon](../reference/research-cache/fire-lizard-birthrt/MAIN.CPP#L1184) mapuje argumenty na pliki:

| argument | animacja | plansza tekstowa |
|---|---|---|
| 1 | `intro\\gorgon2.flc` | `gorgon1.txt` |
| 2 | `intro\\gorgon3.flc` | `gorgon2.txt` |
| 3 | `intro\\gorgon4.flc` | `gorgon3.txt` |

Funkcja dobiera paletę i dźwięki klatkowe, wywołuje `PlayFlic(buf, 4)`, czyści dźwięk, odtwarza planszę przez `DrawHintPanel(buf1)` i wznawia muzykę. Nie zapisuje prowincji, holdingów, jednostek, regentów, skarbca ani relacji dyplomatycznych.

Wynik `PlayFlic` nie jest sprawdzany. Naciśnięcie klawisza może przerwać odtwarzanie, a brak/niepowodzenie pliku może uniemożliwić film, lecz kod wywołujący po powrocie nadal wykonuje następujące operacje plotu.

Przed sekcją plotu, w tym samym `RandomEvents`, wykonywane są ogólne losowe eventy prowincji/jednostek. Po bloku etapu 3 funkcja kontynuuje do stałego wsparcia Gorgona: dla `date > 3` i AI-controlled Gorgon's Crown dodaje potwory w losowej prowincji z zakresu `ABATTOIR..ABATTOIR+16`, a jeśli jednostka Gorgona istnieje i jest umieszczona, dodaje też szkielety w jej prowincji. Zatem bezpośrednio po takeover w tym samym wywołaniu może dojść do dalszych spawnowań wojsk; te oddziały nie są częścią transferowanych armii dawnego realm.

### Call graph scenek

```text
UpdateDataArea [REPORT_DONE_MODE]
  -> RandomEvents
       -> PlayGorgon(1|2|3) [warunki etapów]
            -> PlayFlic [MAIN.CPP]
            -> DrawHintPanel [MAIN.CPP]
       -> po PlayGorgon(3): skarbiec + transfer realm + iGorgonPlot++
```

Inne bezpośrednie wejścia do `PlayGorgon`:

- klawisze 1/2/3 w `AddGameKeys`, wyłącznie w kompilacji debug (`MAIN.CPP`, linie 943–945);
- parser komendy `TCS<number>` w `GAME.CPP` (linia 2170).

Te ścieżki odtwarzają animację, ale nie wykonują transferu kampanii. Właściwe przejęcie jest związane z wywołaniem etapu trzeciego wewnątrz `RandomEvents`.

## 4. Mechanizm masowego takeover

### Operacje bezpośrednio po `PlayGorgon(3)`

W [GAMEMAP.CPP](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4147) po powrocie ze scenki:

1. Skarbiec Gorgon's Crown rośnie o 400, Markazoru o 200, Mur-Kilad o 100. Są wysyłane aktualizacje pól skarbca przez `SetGameData`.
2. Pętla po wszystkich prowincjach od indeksu 1 przenosi każdą, której `province[].Realm == iGorgonAlly`, do `REALM::GORGONSCROWN`.
3. Pętla po wszystkich indeksach jednostek od 1 przenosi każdą jednostkę, której `units[].Realm == iGorgonAlly`, do Gorgon's Crown. Nie ma filtra na prowincję jednostki, `Joined`, typ jednostki ani to, czy jest regentem/lieutenantem.
4. Pętla po wszystkich holdingach od indeksu 0 przenosi każdy `places[]` z właścicielem `iGorgonAlly` do Gorgon's Crown. Nie filtruje typu ani prowincji i nie wywołuje `CheckHolding`.
5. Zwiększa `iGorgonPlot`.

To są bezpośrednie przypisania w trzech pełnych skanach tablic. Kod transferu nie używa wspólnego helpera, nie aktualizuje w tej chwili macierzy `RealmStatus`, nie przenosi skarbca ani RP dawnej domeny i nie ustawia jej `exists` na `FALSE`. Nie wykonuje też `SetGameData` dla samych prowincji, jednostek i holdingów w tym miejscu.

Warunek właściciela oznacza, że holdingi niezależnych regentów znajdujące się w prowincjach dawnego sojusznika nie przechodzą, chyba że ich własny `places[].Realm` również równa się `iGorgonAlly`. W przypadku wyboru poprawnego kandydata wszystkie jego holdingi w dowolnej prowincji są transferowane.

### Regent i lieutenant po transferze

Kod plotu nie modyfikuje bezpośrednio `regents[]`, `realm[].regent`, identyfikatora regenta ani wskaźnika `regents[].unit`. Zmienia natomiast `units[].Realm` dla każdej jednostki byłej domeny — w tym jednostki regenta.

W efekcie bieżąca przynależność regenta jest wyliczana przez [REGENTS.HXX::REGENT::mfGetRealm](../reference/research-cache/fire-lizard-birthrt/REGENTS.HXX#L304): jeśli regent ma skojarzoną jednostkę, zwraca `units[unit].Realm`, a nie zapisany pierwotny realm. Klasyfikacja [REGUTIL.CPP::IsLieutenant](../reference/research-cache/fire-lizard-birthrt/REGUTIL.CPP#L183) uznaje jednostkę za lieutenant, gdy nie jest jednostką regenta realm, do którego należy, i jej `id > 1000`. Zatem przejęcie powoduje przejście byłego regenta do bieżącej przynależności Gorgona i klasyfikację jako lieutenant przez mechanizm pośredni — nie przez jawne wywołanie konwersji w evencie.

Konwersja nie jest bezwarunkowa dla każdego charakteru: `IsLieutenant` wymaga, by ID jednostki było większe niż 1000 i by nie była ona jednostką regenta obecnego realm. Sam takeover przenosi jednostkę regenta, ale nie zmienia `fRegentData.Realm`, `fRegentData.unit`, ID ani innych pól postaci.

### Usunięcie starego realm

Po transferze kod eventu nie wywołuje `CheckRealmStatus`. Funkcja [GAMEMAP.CPP::CheckRealmStatus](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L1467) jest wywoływana podczas kolejnego `GiveReport` ([REPORT.CPP](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L1013)). Gdy zlicza zero prowincji dla istniejącego realm, ustawia `realm[i].mfSetExists(FALSE)`, zeruje jego tribute w obu kierunkach, usuwa jednostki nadal oznaczone dawnym realm i usuwa/transferuje pozostałe holdingi. Jednostki już przejęte przez Gorgona nie spełniają filtra `units[j].Realm == i`, więc nie są usuwane.

Ta funkcja przenosi do aktualnego właściciela prowincji jedynie określone obiekty fort/port/ruiny dawnej domeny, jeżeli takie jeszcze zostały; pozostałe holdingi usuwa. Nie przenosi skarbca ani regency i nie czyści macierzy wszystkich statusów dyplomatycznych. W fabularnym takeover holdingi są już wcześniej masowo przypisane do Gorgona, więc ta ścieżka sprzątająca zwykle nie ma ich już do usunięcia.

### Konsekwencja zapisu/odczytu dla byłego regenta

`LOADSAVE.CPP` po odtworzeniu wskaźnika jednostki regenta wywołuje `regents[i].mfSetRealm(pRgS->mfGetOriginalRealm())` ([LOADSAVE.CPP](../reference/research-cache/fire-lizard-birthrt/LOADSAVE.CPP#L648)). Jednak `REGENT::mfSetRealm` przy istniejącej jednostce ustawia realm tej jednostki, zamiast zmieniać zapisane pole pierwotnego realm ([REGENTS.HXX](../reference/research-cache/fire-lizard-birthrt/REGENTS.HXX#L378)). Ponieważ Gorgon takeover zmienia realm jednostki byłego regenta, ten odczyt może przywrócić ją do jej `OriginalRealm`, mimo że prowincje/holdingi zostały już przejęte i stary realm może być nieistniejący. To konkretna niespójność pomiędzy mechanicznym przejęciem i ścieżką odtwarzania regentów w badanym źródle.

## 5. Zwykła dyplomacja: osobny, węższy mechanizm

### `HomeRealm` i wybór celu w `PaintDiplomacy`

`HomeRealm` jest globalnym realm bieżącego gracza/aktywnej domeny ([GAMEMAP.CPP](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L347)). Przy rozpoczęciu nowej gry ustawiają go `SelectARealm` albo wybór prowincji w `SELRLM_MODE` ([CHARSEL.CPP](../reference/research-cache/fire-lizard-birthrt/CHARSEL.CPP#L474), [GAMEMAP.CPP](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L7161)); później tury zmieniają go na realm sterowany przez gracza. `ActiveRegent` pochodzi z `realm[HomeRealm].mfGetRegent()`.

`iSelectedRealm` nie jest domeną przejmującą: to cel dyplomacji wybrany z listy przez `SelectRealm`. Lista `PaintDiplomacy` pomija m.in. Gorgon's Crown, Mur-Kilad, Markazor, Monsters, Anuire, Five Peaks, Spiderfell oraz już podporządkowane/nieaktywne cele (ACTNMENU.CPP, linie 2750–2784). Dlatego zwykłe okno dyplomacji gracza nie wybiera Gorgona jako celu.

### `ACTNMENU.CPP::PaintDiplomacy`

Funkcja zaczyna się w linii 2689 i jest wywoływana przez `PaintDomainAction` tylko dla akcji `DIPLOMACY` ([ACTNMENU.CPP](../reference/research-cache/fire-lizard-birthrt/ACTNMENU.CPP#L7045), wywołanie w linii 7106). To interfejs negocjacji gracza, nie funkcja AI ani helper używany przez fabularny takeover.

Pełny przebieg funkcji:

- Przy braku celu funkcja wyświetla listę realmów w dwóch kolumnach. Pomija własny realm, realm nieistniejące, specjalne realm wyłączone z listy, realm bez regenta oraz już podporządkowane cele. Po kliknięciu ustawia `iSelectedRealm`; ponowne kliknięcie celu go odznacza i resetuje selekcje.
- Dla wybranego celu pobiera alignment regenta, reakcję bilateralną i bonus przedmiotów regenta gracza. Jeśli cel nie-lądowy jest już wasalem kogoś innego, wraca do wyboru celu.
- Pętla `NUMDIPSUBJ` rysuje tematy petycji/żądań/ofert: permissive/full alliance, oath/vassalage, gold, territory, holding, tribute, salary i Regency. Niektóre tematy są blokowane zależnie od statusu vassal, nie-lądowego celu, trybu kontroli i wcześniej zaznaczonych transferów. Kolejne wybory wykluczają się wzajemnie, gdy są alternatywnymi sojuszami lub wzajemnie sprzecznymi żądaniami/ofertami.
- Wybór prowincji/holdingu otwiera ekran pomocniczy. Jego pętle pokazują wyłącznie prowincje należące do właściwej strony; żądanie terytorium pomija stolicę/zamek realm, a oferta terytorium wyszukuje analogicznie posiadłości `HomeRealm`. Ekran stronkuje listy i pozwala wybrać pojedynczy holding z wybranej prowincji.
- Modyfikatory oferty/żądania wpływają na reakcję. Funkcja stosuje minimalny próg reakcji, alignment i bonusy, koszt zasobów oraz modyfikatory z garnizonu/cywilizacji/fortów. Jeżeli propozycja jest dopuszczalna, wylicza szansę rzutu; `RollSuccess` rozstrzyga powodzenie lub porażkę.
- Przy powodzeniu funkcja aktualizuje skarbce obu realm i rozlicza Regency. Dla żądanej prowincji (`iSelection[4]`) skanuje wszystkie jednostki; zwykły oddział kwalifikuje się, gdy zgadzają się prowincja i realm z suwerenem prowincji oraz `Joined == 0`, po czym zmieniany jest realm całego łańcucha `NextUnit` na `HomeRealm`. Następnie zmienia suwerenność tej jednej prowincji. Dla oferowanej prowincji (`iSelection[7]`) skanuje oddziały `HomeRealm` i analogicznie przenosi zwykłe oddziały do celu, po czym zmienia suwerenność prowincji na `iSelectedRealm`. Branch dla jednostki-lieutenanta sprawdza wewnątrz warunek `units[j].Icon < FIRST_CHARACTER_TYPE`, mimo że jego zewnętrzny warunek wymaga `>= FIRST_CHARACTER_TYPE`; dlatego ten branch nie przenosi tej jednostki ani łańcucha. Są to linie [3291–3367](../reference/research-cache/fire-lizard-birthrt/ACTNMENU.CPP#L3291).
- Kod aktualizuje `investor`, `victim` i `target_province`; po transferze terytorium rekonstruuje mapę i przekazuje parę realm do `CheckRealmStatus`. Jeśli w wyniku transakcji znika `HomeRealm`, funkcja zamyka menu i wraca.
- Holding żądany lub oferowany jest pojedynczym obiektem. Jeżeli transakcja powoduje konflikt tego samego rodzaju holdingu w tej samej prowincji, `CheckHoldingConflict` zamienia właścicieli albo wywołuje `CheckHolding`.
- `typAlliance == 1/2` tworzy odpowiednio permissive/full alliance.
- `typAlliance == 3` ustawia status vassal w kierunku `iSelectedRealm -> HomeRealm`. Dla lądowego realm pozostawia go jako oddzielny realm, ustawia odwrotną relację full alliance i w grze single-player przełącza jego flagę player-control. Dla realm nieposiadającego ziemi istnieje osobna gałąź lieutenant opisana niżej.
- Po sukcesie aktualizowane są reakcje i tribute; po porażce złoto jest zwracane, a wydana Regency synchronizowana. Ekran pomocniczy oraz końcowy cleanup regionów są obsługiwane osobnymi gałęziami funkcji.

Dokładne przypisania `units[].Realm = HomeRealm` i `province[].Realm = HomeRealm` są w [ACTNMENU.CPP:3298–3323](../reference/research-cache/fire-lizard-birthrt/ACTNMENU.CPP#L3298), w gałęzi udanej prośby o jedną prowincję. To wcześniejszy trop zwykłej umowy, a nie Gorgon event ani przejęcie całej domeny. Odwrócona oferta do `iSelectedRealm` znajduje się w liniach 3341–3367.

### `CheckHolding`

[ACTNMENU.CPP::CheckHolding](../reference/research-cache/fire-lizard-birthrt/ACTNMENU.CPP#L2508) faktycznie przenosi własność wskazanego holdingu do podanego realm, o ile nie ma kolizji z takim samym typem holdingu tego realm w tej samej prowincji. Wtedy dodaje poziom przejmowanego holdingu do istniejącego i usuwa przejmowany obiekt; w przeciwnym razie aktualizuje `places[place].Realm`. Jest to operacja na jednym obiekcie, a nie transfer całego realm.

`CheckHoldingConflict` (ACTNMENU.CPP, linia 2458) obsługuje wymianę holdingów i tę samą logikę konsolidacji.

### Lieutenant z wasalstwa niezależnego realm

W `PaintDiplomacy`, po osiągniętym vassalage, gałąź dla `iSelectedRealm >= LAND_REALM_COUNT`:

1. Odczytuje prowincję jednostki regenta `HomeRealm`.
2. Skanuje regentów `j=69..CHARACTER_COUNT-1` i wybiera tego, którego aktualny realm to cel.
3. Wywołuje [CreateUnit](../reference/research-cache/fire-lizard-birthrt/UNITS.CPP#L2719) z prowincją regenta liege, ikoną i ID wybranej postaci oraz realm `HomeRealm`. Funkcja przydziela nowy slot i inicjalizuje jego pola jednostki; przy `fJoin=TRUE` może dołączyć nową jednostkę do stosu w tej prowincji.
4. Przenosi holdingi wskazanego pierwotnego realm przez `CheckHolding`, jeśli jego realm był poza zakresami lądowych domen albo równy `HomeRealm`.
5. Ustawia `MPREG_UNIT` wybranego rekordu regenta na nową jednostkę ([ACTNMENU.CPP](../reference/research-cache/fire-lizard-birthrt/ACTNMENU.CPP#L3501)). To zmienia jego skojarzoną jednostkę (`REGENTS.HXX::mfSetunit`, linia 433), a przez `mfGetRealm()` jego bieżący realm; nie przepisuje bezpośrednio pozostałych pól postaci. Kod nie usuwa jawnie poprzedniej jednostki regenta.
6. Przy zaoferowanym tribute konfiguruje salary nowej jednostki i zeruje tribute w obie strony.

To jest konwersja niezależnego/nie-lądowego regenta do jednostki liege. Mapowanie `MPREG_UNIT` aktualizuje skojarzony slot regenta w [MULTIMAP.CPP](../reference/research-cache/fire-lizard-birthrt/MULTIMAP.CPP#L253). Dla domen lądowych vassalage nie wykonuje takich operacji ani nie usuwa domeny. Żadna z tych gałęzi nie jest wykorzystywana przez Gorgon plot.

### Pełna lista wywołań `CheckHolding`

Poza definicją w ACTNMENU.CPP:2508, wyszukiwanie wszystkich wywołań w badanym drzewie źródeł daje:

| Plik i linie | Funkcja / przypadek |
|---|---|
| ACTNMENU.CPP:2498–2499 | `CheckHoldingConflict`: przenosi dwa holdingi przy wymianie, jeśli nie są wariantem tego samego typu holdingu w jednej prowincji. |
| ACTNMENU.CPP:3384, 3394, 3407, 3412 | `PaintDiplomacy`: wybrany holding żądany/oferowany; w razie kolizji przechodzi przez `CheckHoldingConflict`. |
| ACTNMENU.CPP:3497 | `PaintDiplomacy`: holdingi realm regenta nie-lądowego przy konwersji na lieutenant. |
| ACTNMENU.CPP:8659, 8661, 8674, 8676, 8693, 8702, 8709, 8712, 8721 | `NPCResult`: holdingi przekazane w propozycji dyplomatycznej AI, w tym pojedynczy holding przy wymianie prowincji/tribute. |
| MAPAI.CPP:5022, 5024, 5067, 5099, 5102 | `DoNPCAction`: holdingi w umowach sojuszu/vassalage; 5067 jest skanem holdingów realm dawnego regenta podczas jego awansu do lieutenant. |
| MAPAI.CPP:5294, 5297 | `DoNPCAction`: żądanie i oferta holdingów w `ACTION_DIPLMCY_DMD_HOLD`. |

Żadna z tych referencji nie należy do Gorgon plot. Tamte trzy pętle nad `province[]`, `units[]` i `places[]` przypisują nowe realm bez `CheckHolding`.

## 6. Pozostałe wywołania transferów przez AI i odpowiedzi gracza

### Incoming diplomacy: `NPCResult` i `YesOthersDiplomacy`

AI kierujące propozycję do gracza odkłada dane w `dData` i pokazuje `D_OTHERDIPLOMACY`. Po akceptacji [YesOthersDiplomacy](../reference/research-cache/fire-lizard-birthrt/ACTNMENU.CPP#L8855) wywołuje `NPCResult(TRUE)` dla NPC. `NPCResult` (linia 8645) aktualizuje statusy i może transferować:

- holdingi przez `CheckHolding`;
- pojedynczą prowincję przez `MPPROV_REALM`;
- tribute, złoto i Regency.

Nie ma w tej odpowiedzi pętli przenoszącej wszystkie prowincje lub jednostki domeny. Transakcja jest ograniczona do pól przekazanych w jednej propozycji.

### AI: `MAPAI.CPP::DoNPCAction`

`DoNPCAction` (linia 4072) wybiera akcje AI na podstawie trybu, szans z tabeli i triggerów. W `ACTION_DIPLMCY_ALLY` (linia 4889) AI może:

- nawiązać permissive/full alliance;
- z realm w stanie full alliance próbować vassalage;
- dla lądowego realm ustawić relację vassal/full alliance, zachowując oddzielny realm;
- dla nie-lądowego realm utworzyć jednostkę regenta w domenie AI i przez `MPREG_UNIT` powiązać z nią regenta; przy tym może przenieść jego holdings.

Wymaga to poprawnego celu z `FindRealm` (MAPAI.CPP, linia 3762). Ta funkcja jawnie odrzuca Gorgon's Crown jako cel wraz z innymi specjalnymi realmami. Gorgon może występować jako aktywny aktor, ale nie jest zwykłym celem tego AI-owego wyboru.

Inna AI-owa ścieżka, `ACTION_DIPLMCY_DMD_PROV` (MAPAI.CPP, ok. linie 5160–5210), może przejąć jedną prowincję od NPC: odrzuca multiplayer i Monsters, wybiera prowincję, przechodzi warunek finansowania/losowania, zmienia właściciela prowincji oraz zamki dawnego właściciela w tej prowincji, po czym wywołuje `CheckRealmStatus`. Nie przenosi wszystkich jednostek ani holdingów; nie jest realm-wide annexation.

`ACTION_DIPLMCY_DMD_HOLD` przenosi pojedyncze holdingi przez `CheckHolding`, nie domenę.

### AI: investiture i okupacja

`ACTION_INVESTITURE` w `MAPAI.CPP` (linie 5580–5640) przenosi pojedynczą okupowaną prowincję na realm AI i czyści `OccupRealm`. Dla każdej takiej operacji sprawdza `CheckRealmStatus`. Sama okupacja nie zmienia suwerenności.

Oddzielnie `UpdateDataArea`, na początku `ACTN_MODE`, w trybach podstawowym/zaawansowanym bez tutoriala, przechodzi po wszystkich prowincjach i automatycznie inwestuje wszystkie, w których `OccupRealm == HomeRealm` (GAMEMAP.CPP, linie 4930–4950). Jest to wieloprowincjowy transfer suwerenności oparty na okupacji, ale nie transfer armii i holdingów domeny. Aktualizacja `MPPROV_INVESTED` przechodzi przez obsługę w `MULTIMAP.CPP` i prowadzi do `CheckRealmStatus` (linie 400–408).

## 7. Gorgon AI a fabularny wybór sojusznika

`MAPAITBL.CPP` zawiera osobny rekord AI Gorgon's Crown (linia 74): zestaw trybów budowy/rajdów/wojny/obrony Gorgona i triggery na inwazję, okupację, zerwane relacje, sojuszników na wojnie, brak sąsiednich jednostek i rozwój sąsiada. Definicje triggerów są w [MAPAI.HXX](../reference/research-cache/fire-lizard-birthrt/MAPAI.HXX#L240).

Tryby Gorgona (`modeBN`, `modeRN`, `modeWN`, `modeDN`) w [MAPAITBL.CPP](../reference/research-cache/fire-lizard-birthrt/MAPAITBL.CPP#L1011) zawierają ruch, wojnę, inwestyturę, magię, ekonomię i muster; nie zawierają `ACTION_DIPLMCY_ALLY`. W połączeniu z wykluczeniem Gorgona z `FindRealm` oznacza to, że opisany takeover nie jest zwykłym wynikiem dyplomatycznego AI. Jest oddzielnym skryptem kampanii w `RandomEvents`.

Wybór fabularnego sojusznika również nie zmienia statusów sojuszu/wassalage: `iGorgonAlly` jest selektorem celu, a następnie wykonują się transfery. Kod nie ustawia `RealmStatus[ally][Gorgon]` ani `RealmStatus[Gorgon][ally]`.

## 8. Inne ścieżki zmiany właściciela i eliminacji

| Funkcja / blok | Co zmienia | Zakres i ograniczenia |
|---|---|---|
| `RandomEvents` — Gorgon plot, GAMEMAP.CPP 4147–4166 | Prowincje, jednostki i holdingi z jednego wskazanego realm | Jedyny znaleziony skan całych tablic wykonujący ten 3-częściowy transfer domeny. |
| `PaintDiplomacy`, ACTNMENU.CPP 3290–3420 | Jedna wskazana prowincja oraz jednostki w tej prowincji; opcjonalnie wskazane holdingi | Wymaga udanej negocjacji gracza; może być umową z terytorialną koncesją, nie annexacją całego realm. |
| `NPCResult`, ACTNMENU.CPP 8645–8850 | Pojedyncza prowincja/holding, relacje i zasoby | Odpowiedź gracza na propozycję AI. |
| `DoNPCAction::ACTION_DIPLMCY_DMD_PROV`, MAPAI.CPP 5160–5210 | Jedna prowincja i jej zamki | Bez transferu armii ani wszystkich holdingów. |
| `DoNPCAction::ACTION_INVESTITURE`, MAPAI.CPP 5580–5640 | Jedna okupowana prowincja | Suwerenność zmienia się po okupacji; pozostałe zasoby nie są masowo przekazywane. |
| `UpdateDataArea` auto-investiture, GAMEMAP.CPP 4930–4950 | Wszystkie prowincje okupowane przez `HomeRealm` | Może zmienić wiele prowincji w jednym przejściu, ale nie przenosi całej domeny. |
| `CheckRealmStatus`, GAMEMAP.CPP 1467–1565 | Ustawia `exists=false` dla realm bez prowincji, czyści jego tribute/jednostki/holdingi; zachowuje/przenosi wybrane forty/porty do suwerena prowincji | Sprzątanie domeny po utracie wszystkich prowincji, nie mechanizm jej wchłonięcia. |

W badanym źródle bezpośrednie pętle transferu prowincji, jednostek i holdingów Gorgon plot są unikalne. Pozostałe ścieżki są lokalne (pojedyncza prowincja/holding) lub stanowią cleanup po utracie ziem.

## 9. Skrócony graf wywołań

```text
UpdateDataArea [REPORT_DONE_MODE]
  -> RandomEvents
       -> DoRandomEvent [ogólne losowe wydarzenia]
       -> plot Gorgona:
            etap 1 -> PlayGorgon(1)
            etap 2 -> PlayGorgon(2) -> wybór iGorgonAlly
                      -> bonus +100 native (10 GB) / +50 RP na późniejszych wywołaniach
            etap 3 -> PlayGorgon(3)
                      -> Gorgon +400, Markazor +200, Mur-Kilad +100
                      -> scan provinces: iGorgonAlly -> GORGONSCROWN
                      -> scan units: iGorgonAlly -> GORGONSCROWN
                      -> scan places: iGorgonAlly -> GORGONSCROWN
       -> dalsze wzmocnienia/armie Gorgona w RandomEvents
  -> DoNPCAdmin
  -> AI realm actions
  -> kolejny raport:
       GiveReport -> CheckRealmStatus
                     -> stary realm bez prowincji: exists=false
```

## 10. Odpowiedzi na wskazane pytania

1. Funkcją z `province[].Realm = HomeRealm` / `units[].Realm = HomeRealm` jest `ACTNMENU.CPP::PaintDiplomacy`; są to wybiórcze transfery prowincji w umowie.
2. Funkcja wykonująca fabularny takeover to `GAMEMAP.CPP::RandomEvents`; transfer jest w etapie trzecim po `PlayGorgon(3)`.
3. `HomeRealm` to aktywna domena gracza/administracyjnego kontekstu. Domena przejmowana przez fabułę nie jest `HomeRealm`: jest zapamiętana w `iGorgonAlly`, wybrana po scenie 2 na podstawie statusu AI, istnienia, wyniku domeny i relacji względem `HomeRealm`.
4. `CheckHolding` przenosi lub scala jeden holding. Gorgon plot omija go i bezpośrednio zmienia właściciela wszystkich holdingów dawnego sojusznika.
5. Regent nie jest w evencie jawnie przebudowywany. Jego jednostka zmienia `Realm`; dynamiczny `mfGetRealm` i `IsLieutenant` powodują wynikową przynależność/klasyfikację lieutenant. Późniejszy `CheckRealmStatus` wyłącza dawną domenę.
6. Transfery dyplomatyczne mają odrębne call pathy w `PaintDiplomacy`, `NPCResult` i `DoNPCAction`; tylko `RandomEvents` wykonuje pełny skan prowincji, armii i holdingów.
7. AI umie wykonywać zwykłe vassalage oraz per-province demands/investiture, ale Gorgon ma własny profil akcji bez `ACTION_DIPLMCY_ALLY`; AI nie używa zwykłej dyplomacji jako opisanego plot takeover.
8. Scenki kampanii są obsługiwane przez `MAIN.CPP::PlayGorgon`, wywoływane przez `RandomEvents`. Efekty etapu 3 zachodzą po powrocie z animacji; jej wynik jest ignorowany.
9. Tak: trzecia scenka jest bezpośrednim poprzednikiem transferu w tej samej gałęzi warunkowej `RandomEvents`.
10. Poza plotem są transfery pojedynczej prowincji/holdingu i masowa automatyczna inwestytura prowincji. Nie znaleziono innego bloku przenoszącego jednocześnie wszystkie prowincje, jednostki i holdingi realm.
