# PRD — Workforce Planner

**Wersja:** 1.0
**Data:** 11 lutego 2026
**Autor:** Product Management
**Status:** Draft — do review przez stakeholderów

---

## 1. Problem Statement

Firma IT licząca ponad 80 pracowników nie posiada jednego źródła prawdy o alokacji zasobów na projekty. Planowanie obciążenia odbywa się ręcznie (arkusze kalkulacyjne, komunikatory), co prowadzi do niewidocznych konfliktów — pracownicy bywają przypisani na ponad 100% FTE bez wiedzy PM-ów, a wolne moce przerobowe pozostają niezauważone. Brak centralnego widoku utrudnia podejmowanie decyzji o staffingu nowych projektów i zwiększa ryzyko wypalenia przeciążonych osób.

---

## 2. Goals

| # | Cel | Metryka | Target |
|---|-----|---------|--------|
| G1 | **Jedno źródło prawdy o alokacji** | % projektów z aktualnymi assignmentami w systemie | ≥ 90% w ciągu 3 msc od wdrożenia |
| G2 | **Eliminacja overbookingu** | Liczba przypadków przypisania >100% FTE wykrytych w ciągu tygodnia | Wykrywalność 100% (zero ukrytych konfliktów) |
| G3 | **Skrócenie czasu planowania** | Czas potrzebny PM-owi na ustalenie dostępności osoby | < 30 sekund (z obecnych ~10-15 minut) |
| G4 | **Adopcja narzędzia** | Aktywni użytkownicy tygodniowo / łączna liczba PM-ów i liderów | ≥ 80% w ciągu 2 msc |
| G5 | **Widoczność urlopów w kontekście alokacji** | % urlopów widocznych w timeline (po wdrożeniu integracji) | ≥ 95% |

---

## 3. Non-Goals

| # | Czego NIE robimy | Uzasadnienie |
|---|-------------------|--------------|
| NG1 | **Moduł finansowy** (stawki, budżety, marże projektów) | Scope ograniczony do capacity planning; finanse obsługiwane przez dedykowane narzędzia |
| NG2 | **Time tracking / ewidencja czasu pracy** | Narzędzie planuje przyszłą alokację, nie rejestruje faktycznie przepracowanych godzin |
| NG3 | **Raportowanie i dashboardy analityczne** | MVP skupia się na operacyjnym widoku kalendarza; raporty to potencjalna faza 2 |
| NG4 | **Zarządzanie kompetencjami / skill matrix** | Dodaje złożoność bez bezpośredniego wpływu na core problem |
| NG5 | **Aplikacja mobilna** | Narzędzie desktop-first; timeline z drag & drop nie jest ergonomiczny na telefonie |

---

## 4. User Stories

### 4.1 Logowanie

- **US-AUTH-01**: Jako użytkownik systemu chcę zalogować się emailem i hasłem, aby uzyskać dostęp do planowania zasobów.
- **US-AUTH-02**: Jako administrator chcę tworzyć konta użytkowników, aby kontrolować kto ma dostęp do systemu.

### 4.2 Zarządzanie pracownikami

- **US-EMP-01**: Jako administrator chcę dodać nowego pracownika (imię, nazwisko, zespół), aby pojawił się na timeline i mógł być przypisany do projektów.
- **US-EMP-02**: Jako administrator chcę usunąć pracownika, aby osoby, które odeszły z firmy, nie zaśmiecały widoku.
- **US-EMP-03**: Jako PM chcę widzieć do jakiego zespołu należy pracownik, aby szybko filtrować ludzi po kompetencjach.

### 4.3 Zarządzanie projektami

- **US-PROJ-01**: Jako PM chcę dodać nowy projekt z nazwą i kolorem, aby assignmenty były wizualnie rozróżnialne na timeline.
- **US-PROJ-02**: Jako administrator chcę usunąć projekt, aby zamknięte projekty nie zaśmiecały list wyboru.

### 4.4 Assignmenty

- **US-ASGN-01**: Jako PM chcę przypisać pracownika do projektu na określony okres z alokacją procentową, aby zaplanować jego obciążenie.
- **US-ASGN-02**: Jako PM chcę przypisać pracownika do projektu podając liczbę godzin miesięcznie, aby zaplanować mniejsze zaangażowania (np. maintenance).
- **US-ASGN-03**: Jako PM chcę edytować istniejący assignment, aby zaktualizować alokację lub daty bez usuwania i tworzenia od nowa.
- **US-ASGN-04**: Jako PM chcę usunąć assignment, aby odwołać planowane zaangażowanie.
- **US-ASGN-05**: Jako PM chcę dodać notatkę do assignmentu, aby przekazać kontekst (np. "tylko bug fixy", "onboarding w pierwszym tygodniu").

### 4.5 Widok kalendarza / timeline

- **US-CAL-01**: Jako PM chcę widzieć timeline z listą pracowników i ich assignmentami, aby mieć pełny obraz obciążenia zespołu.
- **US-CAL-02**: Jako PM chcę przełączać się między widokiem miesięcznym a tygodniowym, aby dostosować poziom szczegółowości do potrzeby.
- **US-CAL-03**: Jako PM chcę scrollować timeline w przeszłość i przyszłość, aby planować z wyprzedzeniem i weryfikować historię.
- **US-CAL-04**: Jako PM chcę filtrować timeline po zespołach, aby widzieć tylko istotne dla mnie osoby.
- **US-CAL-05**: Jako PM chcę widzieć sumaryczne % obłożenia każdej osoby, aby natychmiast identyfikować overbooking.
- **US-CAL-06**: Jako PM chcę zmieniać długość assignmentu przeciągając jego krawędź, aby szybko korygować daty.
- **US-CAL-07**: Jako PM chcę przenieść assignment na inną osobę metodą drag & drop, aby szybko przekierowywaś zasoby.
- **US-CAL-08**: Jako PM chcę widzieć obłożenie powyżej 100% FTE wyróżnione na czerwono, aby natychmiast reagować na konflikty.

### 4.6 Integracje

- **US-INT-01**: Jako PM chcę widzieć urlopy pracowników (z Calamari) na timeline, aby uwzględniać je przy planowaniu alokacji.
- **US-INT-02**: Jako PM chcę widzieć polskie święta państwowe w kalendarzu, aby prawidłowo liczyć dostępne godziny robocze.

---

## 5. Requirements

### 5.1 Must-Have (P0)

#### **[P0-AUTH-01] Logowanie emailem i hasłem**

Jako użytkownik systemu chcę zalogować się podając email i hasło, aby uzyskać dostęp do aplikacji.

Acceptance criteria:

- Formularz logowania zawiera pola: email, hasło, przycisk „Zaloguj"
- Po podaniu prawidłowych danych użytkownik zostaje przekierowany do widoku kalendarza
- Po podaniu nieprawidłowych danych wyświetla się komunikat „Nieprawidłowy email lub hasło" (bez wskazywania które pole jest błędne)
- Po 5 nieudanych próbach logowania konto zostaje tymczasowo zablokowane na 15 minut
- Sesja wygasa po 24 godzinach nieaktywności
- Brak opcji samodzielnej rejestracji — widoczny tylko formularz logowania

---

#### **[P0-AUTH-02] Zarządzanie kontami przez admina**

Jako administrator chcę tworzyć i dezaktywować konta użytkowników.

Acceptance criteria:

- Administrator może utworzyć konto podając: email, imię i nazwisko, rola (admin / user)
- System wysyła zaproszenie emailowe z linkiem do ustawienia hasła
- Administrator może dezaktywować konto (użytkownik nie może się zalogować, ale dane historyczne pozostają)
- Hasło musi mieć min. 8 znaków, zawierać wielką literę, cyfrę i znak specjalny

---

#### **[P0-EMP-01] Dodawanie pracownika**

Jako administrator chcę dodać nowego pracownika.

Acceptance criteria:

- Formularz zawiera: imię (wymagane), nazwisko (wymagane), zespół (opcjonalne, wybierany z listy)
- Dostępne zespoły: PM, QA, Frontend, Backend, Mobile, UX/UI Designer, DevOps
- Po dodaniu pracownik natychmiast pojawia się na timeline (alfabetycznie)
- System nie pozwala dodać pracownika bez imienia i nazwiska (walidacja formularza)
- Dozwolone jest dodanie pracownika bez przypisanego zespołu

---

#### **[P0-EMP-02] Usuwanie pracownika**

Jako administrator chcę usunąć pracownika z systemu.

Acceptance criteria:

- Usunięcie wymaga potwierdzenia w dialogu modalnym
- Jeśli pracownik ma aktywne assignmenty (data końcowa >= dzisiaj), system wyświetla ostrzeżenie z listą tych assignmentów
- Po potwierdzeniu: pracownik i jego przyszłe assignmenty zostają usunięte; historyczne assignmenty (data końcowa < dzisiaj) zostają zachowane oznaczone jako „pracownik usunięty"
- Pracownik znika z timeline po usunięciu

---

#### **[P0-PROJ-01] Dodawanie projektu**

Jako PM chcę dodać nowy projekt.

Acceptance criteria:

- Formularz zawiera: nazwa projektu (wymagana), kolor projektu (wymagany, wybierany z palety min. 12 kolorów)
- Nazwa projektu musi być unikalna (walidacja case-insensitive)
- Po dodaniu projekt jest natychmiast dostępny w liście przy tworzeniu assignmentów

---

#### **[P0-PROJ-02] Usuwanie projektu**

Jako administrator chcę usunąć projekt.

Acceptance criteria:

- Usunięcie wymaga potwierdzenia w dialogu modalnym
- Jeśli projekt ma aktywne assignmenty, system wyświetla ostrzeżenie z liczbą powiązanych assignmentów
- Po potwierdzeniu: projekt i wszystkie powiązane assignmenty zostają usunięte
- Projekt znika z list wyboru i z timeline

---

#### **[P0-ASGN-01] Tworzenie assignmentu — alokacja procentowa**

Jako PM chcę przypisać pracownika do projektu z alokacją procentową.

Acceptance criteria:

- Formularz (modal) zawiera: pracownik (dropdown), projekt (dropdown), data od, data do, alokacja % (1-100), notatka (opcjonalna)
- Alokacja procentowa działa niezależnie od miesiąca — 50% oznacza 50% × dostępne godziny robocze w danym miesiącu
- Assignment nie przypisuje godzin na soboty i niedziele
- System pozwala na sumaryczną alokację >100% FTE (ale ostrzega wizualnie na timeline)
- Data „od" nie może być późniejsza niż data „do"
- Assignment pojawia się na timeline natychmiast po zapisaniu

---

#### **[P0-ASGN-02] Tworzenie assignmentu — godziny miesięczne**

Jako PM chcę przypisać pracownika do projektu podając liczbę godzin miesięcznie.

Acceptance criteria:

- Formularz identyczny jak P0-ASGN-01, ale zamiast % użytkownik podaje godziny/miesiąc (min. 1h)
- Godziny miesięczne są proporcjonalnie rozkładane na dni robocze danego miesiąca
- Przeliczenie na %: godziny_miesięczne / (dni_robocze_w_miesiącu × 8) × 100
- Gdy assignment obejmuje niepełny miesiąc, godziny są proporcjonalnie redukowane do faktycznej liczby dni roboczych w tym okresie
- Na timeline wyświetlany jest zarówno % jak i przeliczone godziny

---

#### **[P0-ASGN-03] Edycja assignmentu**

Jako PM chcę edytować istniejący assignment.

Acceptance criteria:

- Kliknięcie assignmentu na timeline otwiera modal z aktualnymi danymi
- Można zmienić: projekt, daty, alokację, typ alokacji (% / godziny), notatkę
- Nie można zmienić pracownika (do tego służy drag & drop na inną osobę)
- Zmiany zapisują się po kliknięciu „Zapisz", anulowanie zamyka modal bez zmian
- Timeline aktualizuje się natychmiast po zapisaniu

---

#### **[P0-ASGN-04] Usuwanie assignmentu**

Jako PM chcę usunąć assignment.

Acceptance criteria:

- Opcja usunięcia dostępna w modalu edycji assignmentu
- Usunięcie wymaga potwierdzenia (przycisk „Usuń" + dialog potwierdzenia)
- Po usunięciu assignment znika z timeline, obłożenie pracownika przelicza się automatycznie

---

#### **[P0-CAL-01] Widok timeline — tryb miesięczny**

Jako PM chcę widzieć timeline w widoku miesięcznym.

Acceptance criteria:

- Wyświetla min. 4-5 pełnych miesięcy kalendarzowych jednocześnie
- Oś Y: lista pracowników posortowana alfabetycznie (nazwisko, imię)
- Oś X: miesiące z podziałem na kolumny
- Każdy assignment wyświetla się jako kolorowy pasek (kolor projektu) w wierszu pracownika
- Na pasku widoczne: nazwa projektu, % alokacji, godziny
- Przy nazwisku pracownika widoczne sumaryczne % obłożenia (suma wszystkich assignmentów w widocznym okresie)
- Obłożenie >100% FTE wyświetla się na czerwono (zarówno wartość liczbowa, jak i wizualne wyróżnienie wiersza)

---

#### **[P0-CAL-02] Widok timeline — tryb tygodniowy**

Jako PM chcę widzieć timeline w widoku tygodniowym.

Acceptance criteria:

- Kolumny to poszczególne dni, pogrupowane w tygodnie (pn-ndz)
- Soboty i niedziele widoczne, ale wizualnie wyszarzone (brak assignmentów)
- Assignmenty wyświetlane per dzień z godzinami i %
- Tydzień zaczyna się od poniedziałku
- Nagłówki tygodni w formacie: „Tydzień 6 (2-8 lut)"

---

#### **[P0-CAL-03] Scrollowanie timeline**

Jako PM chcę przewijać timeline w przeszłość i przyszłość.

Acceptance criteria:

- Scrollowanie horyzontalne (scroll myszy z Shift, scrollbar, lub strzałki nawigacyjne)
- Płynne scrollowanie bez przeładowywania strony
- Brak twardego limitu zakresu dat (minimum: 12 miesięcy wstecz, 12 miesięcy w przód)
- Przycisk „Dzisiaj" przenosi widok na bieżący miesiąc/tydzień

---

#### **[P0-CAL-04] Filtrowanie po zespołach**

Jako PM chcę filtrować timeline po zespołach.

Acceptance criteria:

- Kontrolka multi-select z listą zespołów (PM, QA, Frontend, Backend, Mobile, UX/UI Designer, DevOps)
- Domyślnie: wszystkie zespoły widoczne
- Filtrowanie ukrywa pracowników nienależących do wybranych zespołów
- Pracownicy bez przypisanego zespołu widoczni tylko gdy „brak zespołu" jest wybrany w filtrze
- Filtr zachowuje się po przełączaniu trybów widoku (miesięczny/tygodniowy)

---

#### **[P0-CAL-05] Resize assignmentu (zmiana dat)**

Jako PM chcę zmienić długość assignmentu przeciągając jego krawędź.

Acceptance criteria:

- Przeciągnięcie lewej krawędzi zmienia datę „od"
- Przeciągnięcie prawej krawędzi zmienia datę „do"
- Minimalna długość assignmentu: 1 dzień roboczy
- Wizualny podgląd nowych dat podczas przeciągania (tooltip)
- Zmiana zapisuje się automatycznie po puszczeniu myszy
- Alokacja (% lub godziny miesięczne) nie zmienia się — zmienia się tylko okres

---

#### **[P0-CAL-06] Drag & drop — przeniesienie na inną osobę**

Jako PM chcę przenieść assignment na inną osobę metodą drag & drop.

Acceptance criteria:

- Przeciągnięcie assignmentu na wiersz innego pracownika zmienia przypisanego pracownika
- Daty i alokacja pozostają bez zmian
- Wizualne podświetlenie wiersza docelowego podczas przeciągania
- Zmiana zapisuje się automatycznie po upuszczeniu
- Obłożenie obu pracowników (źródłowego i docelowego) przelicza się natychmiast

---

### 5.2 Nice-to-Have (P1)

#### **[P1-INT-01] Integracja z Calamari — urlopy**

Jako PM chcę widzieć zatwierdzone urlopy pracowników na timeline.

Acceptance criteria:

- System synchronizuje się z Calamari API co 1 godzinę (lub on-demand przyciskiem)
- Urlopy wyświetlane na timeline jako osobny pasek (np. szary/pasiasty) z etykietą „Urlop"
- Urlop pomniejsza dostępność pracownika — np. dzień urlopu = 0h dostępnych
- Obłożenie przelicza się z uwzględnieniem urlopów (baza: dni robocze minus urlopy)
- Tylko zatwierdzone urlopy są widoczne (nie wnioski w toku)

---

#### **[P1-INT-02] Święta polskie w kalendarzu**

Jako PM chcę widzieć polskie święta państwowe w timeline.

Acceptance criteria:

- System zawiera predefiniowaną listę świąt polskich lub pobiera je z publicznego API
- Święta wyświetlane w nagłówku timeline (analogicznie do weekendów — wyszarzone kolumny)
- Dni świąteczne traktowane jak weekendy — nie naliczają godzin roboczych
- Liczba godzin roboczych w miesiącu uwzględnia święta

---

#### **[P1-CAL-07] Dodawanie assignmentu z timeline**

Jako PM chcę dodać assignment klikając bezpośrednio na timeline.

Acceptance criteria:

- Kliknięcie pustego miejsca w wierszu pracownika otwiera modal nowego assignmentu
- Pracownik jest automatycznie wypełniony na podstawie wiersza
- Daty są wstępnie ustawione na podstawie pozycji kliknięcia (początek klikniętego tygodnia/miesiąca)

---

#### **[P1-AUTH-03] Reset hasła**

Jako użytkownik chcę zresetować zapomniane hasło.

Acceptance criteria:

- Link „Nie pamiętam hasła" na stronie logowania
- Użytkownik podaje email, system wysyła link do resetu (ważny 1h)
- Nowe hasło musi spełniać te same wymagania co przy rejestracji
- Po udanym resecie użytkownik jest przekierowany na stronę logowania

---

#### **[P1-EMP-03] Edycja pracownika**

Jako administrator chcę edytować dane pracownika (zmienić zespół lub poprawić imię/nazwisko).

Acceptance criteria:

- Edycja dostępna z poziomu sekcji zarządzania pracownikami
- Zmiana zespołu natychmiast wpływa na filtrowanie na timeline
- Historia zmian nie jest wymagana

---

#### **[P1-PROJ-03] Edycja projektu**

Jako PM chcę zmienić nazwę lub kolor projektu.

Acceptance criteria:

- Zmiana koloru aktualizuje wygląd wszystkich assignmentów tego projektu na timeline
- Zmiana nazwy walidowana pod kątem unikalności

---

### 5.3 Future Considerations (P2)

#### **[P2-CAL-08] Widok per projekt**

Widok timeline pogrupowany po projektach (zamiast po pracownikach) — pokazuje kto jest przypisany do danego projektu i w jakim wymiarze.

---

#### **[P2-RPT-01] Raport utilization**

Dashboard z % obciążenia per zespół i per osoba w wybranym okresie, z wykresami trendów.

---

#### **[P2-ASGN-05] Szablony assignmentów**

Możliwość stworzenia szablonu (np. „Standard Backend Dev: 100%, 3 msc") i szybkiego przypisywania go do pracowników.

---

#### **[P2-INT-03] Integracja z Jira/Linear**

Automatyczne tworzenie assignmentów na podstawie przypisań w project trackerze.

---

#### **[P2-NOTIFY-01] Powiadomienia o konfliktach**

Automatyczne emaile/notyfikacje gdy overbooking zostanie wykryty lub gdy assignment zbliża się do końca.

---

## 6. UX/UI Considerations

**Layout:** Aplikacja single-page z bocznym panelem nawigacyjnym (Pracownicy, Projekty, Timeline). Timeline jako domyślny i główny widok po zalogowaniu.

**Timeline — rdzeń doświadczenia:** Oś Y to lista pracowników (pozycja sticky — widoczna zawsze podczas scrollowania horyzontalnego). Oś X to oś czasu. Assignmenty jako kolorowe paski z minimalnym tekstem (nazwa projektu, %, godziny). Wysokość wiersza stała — przy wielu assignmentach w jednym okresie paski stackują się pionowo.

**Interakcje drag & drop:** Kursor zmienia się na `resize` przy krawędziach assignmentu i na `grab` przy jego środku. Podczas przeciągania widoczny „ghost" element pokazujący docelową pozycję. Po upuszczeniu: krótka animacja potwierdzająca zmianę. Undo (Ctrl+Z) dla ostatniej operacji drag & drop — cofnięcie w ciągu 10 sekund.

**Kolorystyka:** Każdy projekt ma unikalny kolor z predefiniowanej palety (min. 12 kolorów o wystarczającym kontraście). Weekend i święta: tło jasnoszare. Overbooking (>100%): tło wiersza lekko czerwone, wartość % w kolorze czerwonym, bold. Normal range (≤100%): wartość % w kolorze domyślnym.

**Modale:** Tworzenie i edycja assignmentów odbywa się w modalu (nie inline). Modal nie zamyka się po kliknięciu tła (wymaga jawnego „Anuluj" lub „Zapisz"). Walidacja formularza inline (przy polu) przed zapisem.

**Responsywność:** Aplikacja nie wymaga pełnej responsywności mobilnej (non-goal). Minimalna obsługiwana rozdzielczość: 1280 × 720px. Optymalizacja pod szerokie ekrany (≥ 1440px).

---

## 7. Technical Considerations

**Przeliczanie godzin:** Centralny moduł kalkulacji operujący na dni roboczych w miesiącu (pon-pt minus święta polskie). 1 dzień = 8h. Alokacja procentowa: `godziny_dziennie = 8 × (alokacja% / 100)`. Godziny miesięczne: `godziny_dziennie = godziny_miesięczne / dni_robocze_w_miesiącu`. Sumaryczne obłożenie: suma godzin dziennych ze wszystkich assignmentów / 8h × 100%.

**Edge cases:**

- *Assignment na przełomie miesięcy:* Każdy miesiąc przeliczany osobno (różna liczba dni roboczych)
- *Usunięcie pracownika z aktywnymi assignmentami:* Wymagane potwierdzenie; przyszłe assignmenty usuwane, historyczne archiwizowane
- *Usunięcie projektu z aktywnymi assignmentami:* Kaskadowe usunięcie assignmentów (po potwierdzeniu)
- *Urlop pokrywający się z assignmentem:* Dostępność pracownika pomniejszona; assignment nie jest usuwany, ale godziny robocze na ten dzień = 0
- *Assignment 1-dniowy w weekend:* System nie pozwala — walidacja wymaga min. 1 dnia roboczego w zakresie dat
- *Resize poniżej 1 dnia roboczego:* System blokuje — minimalna długość to 1 dzień roboczy

**Integracja Calamari:** API REST z autentykacją OAuth2 lub API key. Synchronizacja scheduled (co 1h) + manual trigger. Cachowanie po stronie aplikacji. Fallback: jeśli API niedostępne, wyświetlenie ostatnio zsynchronizowanych danych z komunikatem o statusie.

**Święta polskie:** Predefiniowana lista świąt stałych (np. 1 stycznia, 3 maja) + algorytm do obliczania świąt ruchomych (Wielkanoc, Boże Ciało). Alternatywa: publiczne API (np. Nager.Date).

**Wydajność:** Przy 80+ pracownikach i potencjalnie setkach assignmentów timeline musi renderować płynnie. Rozważyć wirtualizację wierszy (render only visible rows) i lazy loading assignmentów per widoczny zakres dat.

**Bezpieczeństwo:** Hasła przechowywane jako hash (bcrypt, min. 10 rounds). Sesje oparte na JWT z krótkim TTL + refresh token. Wszystkie endpointy wymagają autoryzacji. HTTPS obligatoryjne.

---

## 8. Success Metrics

### Leading Indicators (mierzalne w ciągu 2-4 tygodni)

| Metryka | Target | Sposób pomiaru |
|---------|--------|----------------|
| Liczba aktywnych użytkowników / tydzień | ≥ 80% PM-ów i liderów | Logi logowań |
| Liczba assignmentów tworzonych / tydzień | ≥ 50 w pierwszym miesiącu | Baza danych |
| Średni czas od otwarcia timeline do znalezienia pracownika | < 30s | Obserwacja / user testing |
| Liczba raportowanych bugów krytycznych | < 3 w pierwszym miesiącu | Bug tracker |

### Lagging Indicators (mierzalne po 2-3 miesiącach)

| Metryka | Target | Sposób pomiaru |
|---------|--------|----------------|
| % projektów z aktualnymi danymi alokacji w systemie | ≥ 90% | Audyt danych vs. rzeczywistość |
| Redukcja ukrytych overbookingów | 100% wykrywalność (zero ukrytych) | Porównanie z dawnymi arkuszami |
| Czas PM-a poświęcony na planowanie zasobów / tydzień | Redukcja o ≥ 50% | Ankieta wśród PM-ów |
| NPS wewnętrzny (zadowolenie użytkowników) | ≥ 40 | Ankieta kwartalna |

---

## 9. Open Questions

| # | Pytanie | Odpowiada | Priorytet |
|---|---------|-----------|-----------|
| OQ-1 | Czy istnieje podział ról: admin vs. zwykły użytkownik? Jeśli tak, kto może tworzyć/usuwać pracowników i projekty? | **Stakeholder / Product** | Wysoki |
| OQ-2 | Czy Calamari udostępnia API z listą zatwierdzonych urlopów? Jakie limity rate? | **Engineering** | Średni |
| OQ-3 | Czy potrzebujemy soft-delete (archiwizacja) czy hard-delete dla pracowników i projektów? | **Product / Stakeholder** | Wysoki |
| OQ-4 | Czy przypisanie pracownika do wielu zespołów jednocześnie jest realnym scenariuszem? (Np. osoba z QA wspierająca DevOps) | **Stakeholder** | Średni |
| OQ-5 | Jaki stack technologiczny jest preferowany? (React/Vue/Angular + backend) | **Engineering** | Wysoki |
| OQ-6 | Czy system ma obsługiwać pracowników na niepełny etat (np. 0.5 FTE = 4h/dzień)? | **Stakeholder / Product** | Wysoki |
| OQ-7 | Czy potrzebna jest historia zmian (audit log) — kto zmienił assignment i kiedy? | **Product** | Niski |
| OQ-8 | Czy assignment w trybie „godziny miesięczne" powinien rozkładać godziny równomiernie na dni, czy PM sam decyduje o rozkładzie? | **Product / Design** | Średni |
| OQ-9 | Hosting: on-premise czy cloud? Czy są ograniczenia dotyczące przechowywania danych osobowych? | **Engineering / Legal** | Wysoki |
| OQ-10 | Czy trzeba obsłużyć niepełne tygodnie na początku/końcu miesiąca w widoku miesięcznym? | **Design** | Niski |

---

## 10. Timeline & Phasing

### Faza 1 — MVP (szacunkowo 8-10 tygodni)

Cel: działający system z core functionality, gotowy do adopcji.

Scope:

- Logowanie (P0-AUTH-01, P0-AUTH-02)
- CRUD pracowników (P0-EMP-01, P0-EMP-02)
- CRUD projektów (P0-PROJ-01, P0-PROJ-02)
- Tworzenie, edycja, usuwanie assignmentów (P0-ASGN-01 do P0-ASGN-04)
- Timeline — widok miesięczny (P0-CAL-01, P0-CAL-03, P0-CAL-04)
- Sumaryczne obłożenie z wizualizacją overbookingu (P0-CAL-08 via CAL-01)

### Faza 2 — Interakcje i widok tygodniowy (szacunkowo 4-6 tygodni)

Scope:

- Widok tygodniowy (P0-CAL-02)
- Drag & drop — przeniesienie assignmentu (P0-CAL-06)
- Resize assignmentu (P0-CAL-05)
- Dodawanie assignmentu z timeline (P1-CAL-07)

### Faza 3 — Integracje i polish (szacunkowo 3-4 tygodnie)

Scope:

- Integracja Calamari (P1-INT-01)
- Święta polskie (P1-INT-02)
- Reset hasła (P1-AUTH-03)
- Edycja pracowników i projektów (P1-EMP-03, P1-PROJ-03)
- Bug fixing i UX polish

### Faza 4 — Rozszerzenia (backlog, bez harmonogramu)

Scope: Wymagania P2 (widok per projekt, raporty, szablony, integracja Jira, powiadomienia). Priorytetyzacja po zbieraniu feedbacku z faz 1-3.

---

*Dokument wymaga review przez: Engineering Lead, Design Lead, stakeholderów biznesowych (PM Lead, Operations). Po zatwierdzeniu sekcji Requirements rozpoczynamy fazę designu UX/UI dla timeline.*
