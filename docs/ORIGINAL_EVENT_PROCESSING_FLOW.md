# Oryginalny przepływ przetwarzania wydarzeń

## Zakres

Dokument opisuje **kolejność w badanym checkoutcie C++ `fire-lizard/birthrt`**. Główne definicje: [`GAMEMAP.CPP::DoRandomEvent`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L3776), [`RandomEvents`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L3996), [`UpdateDataArea`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4316), [`MAPAI.CPP::DoNPCAdmin`](../reference/research-cache/fire-lizard-birthrt/MAPAI.CPP#L236) i raporty w [`REPORT.CPP`](../reference/research-cache/fire-lizard-birthrt/REPORT.CPP#L682). Inwentarz eventów i kwalifikacje źródłowe są w [katalogu wydarzeń](ORIGINAL_RANDOM_EVENTS_INVENTORY.md).

## Graf tur i raportów

```text
ostatnia runda domeny; UpdateDataArea, ACTN_MODE && fRoundOver
  ├─ zmniejszenie timerów realm-magic
  ├─ reset contested/occupation i ponowne obliczenie okupacji z oddziałów
  ├─ sezonowa loyalty: dostępne prawo, tax, okupacja, raport rebellion
  ├─ aktualizacja placówek/oddziałów, utrzymanie, degradacja zamków
  ├─ sprawdzenie wyniku kampanii (ew. PlayFinale)
  ├─ losowa degradacja relacji / rozwiązanie sojuszy i wasalstwa
  ├─ rzut 25% na SelectAdvSite (poza multiplayer; date > 1)
  └─ dturn_mode = INIT_REPORT_MODE
       └─ INIT_REPORT_MODE: ++date; ClearOldReports(); GiveReport()
            └─ GiveReport -> CheckRealmStatus -> wyliczenie/wyświetlenie raportu
                 └─ REPORT_DONE_MODE
                      ├─ RandomEvents()
                      │    ├─ tutorial / item / bonus Basic
                      │    ├─ standardowe próby DoRandomEvent (date >= 2)
                      │    ├─ Gorgon's Plot (po standardowych próbach)
                      │    ├─ niezależne generatory wojsk specjalnych
                      │    └─ stały ward Sideath
                      ├─ DoNPCAdmin()
                      │    ├─ administracja istniejących realmów NPC
                      │    └─ losowanie kolejności RealmOrder
                      └─ kolejny etap domeny / następna tura
```

`date` startuje od 0 w `CHARSEL.CPP`; `INIT_REPORT_MODE` zwiększa ją przed `GiveReport`, a blok `REPORT_DONE_MODE` wywołuje `RandomEvents` i dopiero potem `DoNPCAdmin`. Źródło: [`CHARSEL.CPP`](../reference/research-cache/fire-lizard-birthrt/CHARSEL.CPP#L435), [`GAMEMAP.CPP`](../reference/research-cache/fire-lizard-birthrt/GAMEMAP.CPP#L4739) (date increment) oraz linie 4770–4791 (wywołania). Zatem wydarzenia są przetwarzane **po generowaniu raportu za sezon i przed administracją NPC**, nie podczas rysowania raportu.

## Losowanie standardowych wydarzeń

Makro źródłowe [`random(num)`](../reference/research-cache/fire-lizard-birthrt/SYSTEM.H#L214) skaluje `rand()` do `0..num-1`. Dokładna częstotliwość zależy od `rand()`/platformy; wyrażenia 1/n niżej są nominalnymi szansami kodu.

### 1. Wczesne wyjścia i dodatkowe obliczenia

1. Jeśli tutorial: dodaje Dhoesone `+210`, podnosi reakcję Eyeless One–Dhoesone do co najmniej 95, a w `date==5` ustawia Nolien `Blighted=2` i Riverford `Loyalty=3`; później funkcja kończy się przed standardowymi eventami i Gorgon Plot.
2. Poza tutorialem Basic dodaje `+110` do skarbca aktywnego `HomeRealm`.
3. Jeśli aktywny regent ma `MONEYMULT_MOD`, dwa niezależne przeliczenia `((105*x)/100)+((random(20)+1)*10)` modyfikują `new_treasury` i `realm[HomeRealm].Treasury`.
4. Jeśli `date < 2`, funkcja kończy się po powyższych efektach: nie ma eventów, plotu, spawnów ani wardu Sideath.

### 2. Dokładna pętla

Po opcjonalnym `AMultiPlayer.NextSeed` kod wykonuje:

```text
N := random(5) + 3                       // 3–7 prób, nominalnie jednakowo
for attempt := N-1 downto 0:
    jeśli attempt > 0 lub IsMultiPlayer():
        province := random(PROVINCE_COUNT-1) + 1
    w przeciwnym razie:                 // ostatnia próba gry single-player
        l := liczba prowincji HomeRealm
        k := random(max(l, 3))
        jeśli k >= l: pomiń próbę        // bez losowania typu
        province := pierwsza prowincja HomeRealm po co najmniej k skanach prowincji

    pool := 9, jeśli trudność/data spełnia warunek wczesny; inaczej 18
    eventId := random(pool)
    DoRandomEvent(eventId, province)
```

**Korekta implementacyjna:** wewnętrzny skan zmniejsza `k` dla każdej prowincji, także cudzej. Nie jest to wybór k-tej własnej prowincji; źródło preferuje pierwszą własną prowincję osiągniętą po `k` skanach. HD zachowuje ten bias.

W kodzie zapis `for (j=0, i=random(5)+2; i>=0; i--)` oznacza **`random(5)+3` iteracji**, nie `random(5)+2`. Próba ostatnia jest kierowana na domenę gracza tylko single-player. Dla `l>=3` zawsze losuje jedną należącą prowincję; dla `l=1` jest to nominalnie szansa 1/3, dla `l=2` 2/3; dla `l=0` próba jest zawsze pomijana. Dla targetów pozostałych prób wybór jest nominalnie jednostajny po indeksach `1..PROVINCE_COUNT-1`, bez ważenia właścicielem/lojalnością.

Pula:

```text
rm = 9, jeśli:
  (difficulty == EASY   && date < 4)
  || (difficulty == MEDIUM && date < 3)
  || (difficulty == HARD   && date < 2)
w pozostałych przypadkach rm = 18
eventId = random(rm)      // 0..rm-1
```

Przykłady: przy `date=2` Easy/Medium losują 0–8, Hard już 0–17; przy `date=3` Easy losuje 0–8, Medium/Hard 0–17; od `date=4` wszystkie trudności mają 18 typów. Trudność wpływa także na liczbę wojsk Gorgona/Five Peaks i pomoc skarbcową AI. `fControlMode` i tutorial wpływają na osobne premie/wyjście; nie zmieniają `rm`. Zmiana trybu multiplayer zmienia ostatni target, wybór ally, limit jednostek i wybór adventure site.

### 3. Wynik, niepowodzenie i limity

- Losowanie eventu następuje **po wyborze prowincji**. Wartość eventu nie jest losowana, jeśli ostatnia próba dla gracza została pominięta.
- Wylosowany typ nie jest ponawiany, gdy jego skutek jest pusty: odbiorca ekonomiczny player-controlled, limit jednostek przekroczony, `CreateUnit` zwraca `fERROR`, brak odpowiedniego celu albo inne warunki. Nie ma limitu „jeden typ/prowincja na turę”.
- Ta sama wartość 0–17 może wystąpić wiele razy podczas jednego wywołania.
- Wydarzenia 0–3 nie zależą od wybranej prowincji. Eventy magiczne, wojskowe i rebellion otrzymują ją jako bezpośredni argument; każda z tych gałęzi ma własne warunki.
- Po pętli może nastąpić wiele dodatkowych spawnowań wojsk, które **nie** zużywają standardowych prób i nie korzystają z ich puli wczesnej 9.

## Gorgon Plot i generatory wojsk

Po standardowych próbach i drugim `NextSeed` funkcja przechodzi do Gorgon Plot. Warunki etapów są odrębnymi gałęziami `if/else if`: etapów nie da się przejść kilka naraz w jednym wywołaniu.

```text
date >= 3 && plot==0 && Gorgon not player
    -> PlayGorgon(1), ally=0, plot=1

plot==1 && date>=8 && random(4)==0 && Gorgon not player
    -> PlayGorgon(2), wylicz iGorgonAlly, plot=2

plot==2 && date>=16 && random(4)==0 && Gorgon not player
    -> PlayGorgon(3), transfer + treasury, plot=3

plot==2 && iGorgonAlly!=0
    -> ally +100 native treasury, +50 RP przy każdym wywołaniu,
       które nie awansowało właśnie do etapu 3
```

Losowania etapów 2 i 3 są nominalnie 1/4 **na każde wywołanie** po progu daty. Porażka pozostawia etap bez zmian i rzut wraca przy następnym `RandomEvents`; cinematic nie jest warunkiem udanego odtworzenia. Kandydat wybierany jest po scenie 2. Pełna formuła i dokładny transfer są w [inwentarzu](ORIGINAL_RANDOM_EVENTS_INVENTORY.md) oraz [grafie transferu](SOURCE_REALM_TRANSFER_CALL_GRAPH.md). `iGorgonPlot` i `iGorgonAlly` są zapisywane/odczytywane przez `SaveGameFiles`/`LoadGameFiles`.

Po fabule (w tym samym wywołaniu) następują:

1. Gorgon, `date>3`: losowy spawn w 17 prowincjach regionu oraz opcjonalny dodatkowy spawn skeletonów przy jednostce Gorgona.
2. `date>4`: losowe stosy Five Peaks, potem Spiderfell, potem Rhuobhe.
3. `Warded=3` i `DispelLvl=MONSTERS` w Sideath, ustawiane przy każdym nie-wczesnym wyjściu z `RandomEvents`.

W pętlach z `for (i=random(x)+base; i>=0; --i)` liczebność to `random(x)+base+1`; opisy komentarzy źródła są tu o jeden mniejsze. Zestawienia trudności i dodatkowe warunki są w tabeli [inwentarza](ORIGINAL_RANDOM_EVENTS_INVENTORY.md#4-wydarzenia-wojskowe-i-specjalne-wsparcie-domen).

## Po `RandomEvents`: administracja AI

`UpdateDataArea` bezpośrednio wywołuje `DoNPCAdmin`. Funkcja iteruje native realm-index order, pomija realm-y nieistniejące, przyznaje AI pomoc skarbcową zależną od trudności i `date`, wykonuje administrację i losuje `RealmOrder` z `random(LAND_REALM_COUNT)` aż trafi na wolny indeks. Potem AI domain actions są osobnym systemem (`DoNPCAction`), a nie dodatkową fazą eventów. W szczególności automatyczny rzut `random(5)==0` na +500 native dla NPC nie należy do puli 0–17.

## Raporty, RNG i granice kompletności

- `DoRandomEvent` używa `AddReportTo` dla magii/rebellion i `AddReport` dla troop-spawn raportu do gracza; raporty immediate są kolejkowane przez `REPORT.CPP::AddReport` i wyświetlane przez `CheckForImmediateReports`. Raport nie jest triggerem.
- Dla report audience liczy się właściciel-prowincji `HomeRealm`, a nie okupujący ją gracz. Wydarzenia ekonomiczne nie emitują `AddReport`.
- Badany [`SYSTEM.H::random`](../reference/research-cache/fire-lizard-birthrt/SYSTEM.H#L214) korzysta z `rand()`. W repo są też wywołania losowe w animacjach raportu (`REPORT.CPP`) i rysowaniu (`GAMEMAP.CPP` `fWander`). Nie są to eventy, lecz potencjalnie zużywają wspólny RNG; ich wpływ na późniejsze wyniki nie został odtworzony.
- Inne ważne automatyczne losowania: rzut 25% na `SelectAdvSite` (`date>1`, poza multiplayer; potem wybór najmniej używanej kwalifikującej się lokacji), losowe zmiany reakcji relacji i skarbca-threshold PARTY/THEFT/EMBEZZLE. Szczegóły: [inwentarz](ORIGINAL_RANDOM_EVENTS_INVENTORY.md).
- Nie sklasyfikowano losowych wyborów akcji AI, rzutów sukcesu akcji, losowań bitewnych ani dialogów przygodowych jako Random Events. Te systemy zmieniają stan kampanii, ale ich pełny audyt jest odrębnym zakresem; granice i nierozpoznane ścieżki podano w [inwentarzu](ORIGINAL_RANDOM_EVENTS_INVENTORY.md#7-zakres-przegladu-i-sciezki-nierozstrzygniete).

## Current HD implementation

Native event date now maps directly to HD turn; events begin on turn 2. See [implementation report](CAMPAIGN_EVENTS_IMPLEMENTATION_REPORT.md) for preserved source behavior and the deliberate simultaneous-economy difference.
