# Brakujące i niezgodne mechaniki oryginalnych wydarzeń

> **Historical pre-implementation HD snapshot.** The campaign-event implementation now supersedes the HD status statements below. See [implementation report](CAMPAIGN_EVENTS_IMPLEMENTATION_REPORT.md), [options](CAMPAIGN_EVENT_OPTIONS.md), and [test matrix](CAMPAIGN_EVENTS_TEST_MATRIX.md). Treasury Incidents defaults Off by explicit user decision. The Windows 1.03 binary remains unverified; other recovered ally-exclusion builds are covered in the version comparison.

## Priorytety dla planowania osobnego milestone'u

Kolejność odzwierciedla wpływ na kampanię i kompletność rekonstrukcji, nie łatwość implementacji. To **raport badawczy**; poniżej nie wprowadzono poprawek. Wszystkie wnioski odnoszą się do dostępnego checkoutu `fire-lizard/birthrt`; retail 1.02–1.04 pozostaje do porównania.

### P0 — brak całego systemu fabularnego

1. **Brak Gorgon Plot.** HD nie ma etapów `iGorgonPlot`, `iGorgonAlly`, progów `date >= 3/8/16`, dwóch testów 1/4, wyboru domeny, sezonowych premii, transferu realm-u ani `PlayGorgon(1..3)`. Oryginał zapisuje/odczytuje oba liczniki w save. To nie może być zastąpione ogólnym eventem tekstowym. Użyj [pełnego grafu transferu](SOURCE_REALM_TRANSFER_CALL_GRAPH.md), [inwentarza](ORIGINAL_RANDOM_EVENTS_INVENTORY.md) i [porównania wersji binarnych](GORGON_PLOT_VERSION_COMPARISON.md). Wykluczenia Anuire/Chimaeron potwierdzają dostępne binaria CD/1.02/1.03 DOS/1.04; Windows 1.03 pozostaje niezweryfikowany. To nie rozstrzyga innych ewentualnych różnic między wersjami ani modyfikacji kampanii.

2. **Brak specjalnego harmonogramu wojsk Gorgona/Five Peaks/Spiderfell/Rhuobhe.** Zwykły event 9–16 istnieje, lecz oryginalne `RandomEvents` po plotcie dodatkowo uruchamia zestawy spawnów zależne od `date`, `game_difficulty`, kontroli playera i położenia jednostki Gorgona. W pętlach inclusive kod tworzy zakresy o jeden większe niż komentarze (Gorgon 6–10/6–15/6–20; Five Peaks 1–4/1–5/1–6 stosów po 5–7 jednostek; Spider/Rhuobhe 5–7). W HD tych dedykowanych generatorów nie ma.

### P1 — błąd fazy, progu lub reguły wyniku

3. **Standardowe eventy zaczynają się o sezon później.** Źródło inicjuje `date=0`, zwiększa do 1 przy pierwszym raporcie, po pierwszym pełnym sezonie do 2 i w `REPORT_DONE_MODE` uruchamia eventy (`date>=2`). HD zaczyna `turn=1`, zwiększa do 2 po pierwszym sezonie, lecz `strategicEvents` zwraca przy `turn<3`. Rzut 3–7 prób zaczyna się więc dopiero po drugim pełnym sezonie. To wpływa też na wartości zależne od daty.

4. **Trudność zastąpiona `victoryTarget`.** Oryginał używa `game_difficulty` Easy/Medium/Hard i progów `date < 4/3/2`. HD wybiera wczesną pulę przez `victoryTarget===300/400/500` i `turn-1`. Tych wymiarów nie wolno utożsamiać: zmiana celu zwycięstwa nie jest źródłowym wyborem trudności. Efekt jest dodatkowo przesunięty przez różnicę licznika turn/date. Nie znaleziono zapisanej trudności w stanie Campaign.

5. **ID 17: target i stan contested nie są równoważne.** Oryginał rozpoczyna od wylosowanej prowincji i jej lojalności, potem wybiera wyłącznie dodatnią lojalność **niższą od tej wartości**, zachowując pierwotny target, gdy nie ma niższej. HD wybiera globalnie najsłabszą dodatnią lojalność domeny sortując po ID, a następnie ustawia `contested=true`. Oryginał w samym case 17 nie ustawia contested. Różnica może przenieść bunt do innej prowincji i zmienić następne rozstrzygnięcie sezonu.

6. **ID 0 pomija `surplusIncome`.** Oryginał oprócz time-scaled treasury dodaje trzy stałe wartości `mfAddSurplusIncome(1000/500/300)`. HD dodaje jedynie treasury. Oryginalna bramka to wyłącznie „Gorgon's Crown nie jest player-controlled”; HD odrębnie filtruje każdą domenę na `controller==='ai'` i not eliminated, co zmienia sytuacje kontroli gracza/inactive.

7. **Specjalne AI/NPC admin bonuses poza event pool.** Oryginał `DoNPCAdmin` daje `5/10/15 * date` native każdemu istniejącemu NPC i 20% szansy na +500 native; ma też fallback treasury i automatyczny conversion/disband. HD ekonomia nie odwzorowuje tej konkretnej randomizacji. To zmienia balans AI, choć nie jest ID 0–17.

8. **Próg pojemności i target/routing spawnów 9–16.** Oryginał pilnuje aktywnych rekordów jednostek przez `cntUnits_()<maxNPCUnits()`; single-player limit to `NPC_MAX_UNITS=1000`, multiplayer rezerwuje sloty. HD liczy wszystkich unit entries w armiach i characters względem 1000, tworzy `strength:100`, scala do armii poniżej 15 i określa native region przez właściciela z `scenario.initial`. To nie jest potwierdzony odpowiednik native `CreateUnit`, tablicy indeksowanych regionów i multiplayer capacity.

9. **Automatyczny zanik reakcji/sojuszy nie ma źródłowych rzutów.** Oryginał losuje spadek `1..5` dla statusu 0x80 oraz nominalne 1/50 na wzrost `1..5` między zwykłymi domenami, po czym stosuje progi 35/45/40/tribute. HD `seasonalDiplomacy` zmienia status na podstawie reaction, ale nie losuje jego rocznej zmiany i nie odtwarza źródłowego wzrostu.

### P2 — brak wydarzeń warunkowych / economy automations

10. **Brak losowego dodawania adventure sites.** Oryginał poza multiplayer, przy `date>1`, ma `random(100)<25` (25%, mimo błędnego komentarza „75%”) i wybiera najrzadziej używaną dostępna lokację poniżej poziomu wyliczanego przez adventure difficulty. Nie jest to obecnie część PC strategic scheduler-a HD.

11. **Brak overflow PARTY/THEFT/EMBEZZLE.** Oryginalna pętla aktywuje się tylko przy `new_treasury >= 50000`, może iterować wielokrotnie i koryguje saldo o `amount*10000`; przy `date%4==3` party, inaczej 60% theft /40% embezzle. Nie jest odtworzona przez eventy PC HD. Trzeba osobno zweryfikować intencję tej ochrony dla HD treasury range.

12. **Nieodtworzone premie trybu tutorial/basic i modyfikator dochodu.** `fTutorialSelected` daje stały Dhoesone boost i scripted Nolien/Riverford changes, kończy losowe eventy i plot; `fControlMode==0` daje `+110` native co wywołanie; `MONEYMULT_MOD` stosuje mnożnik 105% i dwa rzuty `1..20`. HD nie ma w `strategic-events.ts` równoważnych przełączników. Ich zgodność zależy od zakresu trybów kampanii, nie od standardowego event ID.

13. **Prezentacja nie odtwarza oryginalnych reportów.** Oryginał mapuje subjecty `IMMEDIATE_BLESS_LAND`, `IMMEDIATE_BLIGHT`, `IMMEDIATE_WARDING`, `IMMEDIATE_HONEST`, `IMMEDIATE_DISPEL_REALM_MAGIC`, `IMMEDIATE_REBELLION` i `IMMEDIATE_NPC_MOVE_TROOP` do `STR_RPT_*`; skarbcowe eventy 0–3 nie dodają reportu. HD loguje generic `event.npc-aid`, `event.realm-magic`, `event.antimagic`, `event.raiders`, `event.rebellion`. Odbiorcy/original audience też różnią się: oryginał raportuje event prowincjonalny do suwerena tylko jeśli jest `HomeRealm`, HD utrwala globalny log.

14. **ID eventu nie jest utrwalone w raporcie HD.** `applyOriginalEvent` dispatchuje argument 0–17, ale trwałe logi magicznych efektów są ogólne; log raiders zawiera type zamiast numeric index. Porównanie/replay audytowe nie może wnioskować o oryginalnym ID z podobnej nazwy tekstu.

15. **Źródłowe text/audio/cinematics nie są odwzorowane przez event log.** Standardowe eventy źródłowe korzystają z immediate reports; Gorgon Plot uruchamia FLC `intro\gorgon2.flc`, `gorgon3.flc`, `gorgon4.flc`, plansze `gorgon1.txt`–`gorgon3.txt` oraz zsynchronizowane frame-sound cues. HD nie ma tego story presentation. Dokładne teksty `STRDAT` i dostępność wszystkich zasobów dla wersji nie zostały w tym audycie w pełni porównane.

### P3 — odróżnienie mechanik i nierozstrzygnięte wersje

16. **Inne rodzaje zdarzeń nie są systemem random events.** AI `DoNPCAction`, losowania sukcesów akcji, deklaracje wojny, boje, okupacja/inwestytura, sezonowe zmiany lojalności, śmierć/promocja regenta, `CheckRealmStatus` i raport `LEVELUP` to istotne automatyczne/warunkowe ścieżki. Nie należy uznać ich za odtworzone przez event ID ani przez podobny wpis logu; pełne porównanie tych subsystemów nie jest częścią macierzy 0–17.

17. **Wspólny RNG wymaga dodatkowego rozstrzygnięcia.** Źródłowe makro `random(num)` korzysta z `rand()`, a animacje raportu/rysowanie również wykonują `random`. Scheduler HD korzysta z serializowanego seeded PRNG, co jest poprawne dla deterministycznych zapisów HD, lecz nie odtwarza bit-for-bit źródłowej kolejności ani możliwego zużycia RNG przez prezentację.

18. **Retail source/version matrix missing.** Różnice między 1.02, 1.03, 1.04 i aktualnym repozytorium GitHub pozostają **wymagające porównania wersji**. W szczególności nie uogólniać wykluczeń w `iGorgonAlly`, warunków special domains, multiplayer limits, random seed synchronization ani rozmiarów/rodzajów spawnów na wszystkie wydania.

## Kolejność dalszego planowania

Przed implementacją warto rozstrzygnąć źródło i regułę wersji (1–2), potem odtworzyć scheduler i różnice eventowe na testach per-indeks (3–9), a dopiero następnie zakres opcjonalnych trybów/economy/presentation (10–18). Ten raport nie wybiera intencjonalnych HD deviations i nie zmienia balansu.
