# WatchTrack – Projektstand / Übergabe

> Diese Datei ist die dauerhafte Kurz-Dokumentation für spätere Weiterarbeit. Vor Änderungen zuerst diese Datei und anschließend den aktuellen Code lesen. Der Code im Repository ist immer die technische Wahrheit, falls diese Notizen einmal hinterherhinken.

## Aktueller Stand

- Aktuelle sichtbare Version: **v3.3**.
- WatchTrack ist eine installierbare PWA für Filme und Serien.
- Hauptnutzung: eine **gemeinsame Liste auf zwei Geräten**, ohne getrennte Benutzerkonten.
- Serien stehen in der Oberfläche bewusst **vor Filmen**, weil Serien häufiger genutzt werden.
- Design: seriös, dunkel/hell, mit **Gold/Gelb als Akzentfarbe** passend zum WatchTrack-App-Logo.
- Darstellung: **System | Hell | Dunkel**. System ist Standard und folgt dem Betriebssystem.
- Das echte App-Logo liegt unter `icons/icon-180.png`, `icons/icon-192.png` und `icons/icon-512.png` und wird auch im Header verwendet.

## Produktidee

WatchTrack soll einen einfachen gemeinsamen Überblick geben über Filme/Serien, Fortschritt, kommende Inhalte, Verfügbarkeit und persönliche Empfehlungen. Die App soll **übersichtlich bleiben**. Neue Funktionen nur hinzufügen, wenn sie im Alltag wirklich helfen.

## Wichtige UX-Entscheidungen

- In Bereichen mit Serien/Filmen steht **Serien zuerst**.
- `Meine Liste` trennt Serien und Filme.
- Fertig gesehene Serien erscheinen unter **Gesehen** und nicht weiter unter aktiven eigenen Serien.
- `Als Nächstes` zeigt die nächste relevante Folge inklusive Ausstrahlungsdatum, soweit bekannt.
- Ganze Staffeln und einzelne Folgen können stabil abgehakt werden, ohne störendes Springen.
- Eigene Filme/Serien können manuell hinzugefügt werden; bei Serien sind optional Staffeln/Folgen möglich.
- Status **Abgebrochen** ist vorhanden.
- Keine getrennten Benutzerprofile und keine Anzeige „wer hat hinzugefügt“.
- Statt Sternebewertung gibt es **Doppel-Daumen hoch / Daumen hoch / Daumen runter**.
- Der Doppel-Daumen wirkt optisch als ein Symbol mit leicht überlappenden Händen.
- Vorlieben sitzen dezent in der Detailansicht und bleiben nach Auswahl markiert.

## Empfehlungen

`recommendations.js` ergänzt in Entdecken die Kategorie **Für euch** für Serien und Filme.

Gewichtung:

- `love`: stark positiv
- `like`: positiv
- `dislike`: negativ
- gesehen/aktuell geschaut: leicht positiv
- Watchlist: schwach positiv
- abgebrochene Titel werden nicht als positive Empfehlungssaat verwendet

Seit **v3.3** können Titel direkt in **Für euch** mit **„Nicht zeigen“** ausgeblendet werden. Dabei gilt:

- der Titel verschwindet sofort aus den Vorschlägen
- er wird in `wt_rec_feedback` als negatives Empfehlungsfeedback gespeichert
- ausgeblendete Titel werden künftig nicht erneut vorgeschlagen
- ausgeblendete Titel werden zusätzlich als negative Saat verwendet, damit ähnliche Empfehlungen heruntergewichtet werden
- das Empfehlungsfeedback wird über den Familien-Key mit den anderen Geräten synchronisiert (`recommendationFeedback` im Sync-State)
- CSS dafür: `recommendation-feedback.css`

## Gemeinsame Synchronisation

- `sync.js` synchronisiert die gemeinsame Library über `./api/sync`.
- Geräte werden über einen **Familien-Key** verbunden (`wt_family_key`).
- Kein zweites Konto erforderlich.
- Serverseitig wird Cloudflare/D1 verwendet.
- Lokale Löschungen werden über Tombstones (`wt_deleted`) berücksichtigt.
- Sync läuft nach Änderungen sowie regelmäßig bei sichtbarer App/Fokus.
- Seit v3.3 wird zusätzlich `recommendationFeedback` synchronisiert.

## Benachrichtigungen / kommende Inhalte

Relevante neue Inhalte der eigenen Liste können berücksichtigt werden, insbesondere neue Folgen, neue Staffeln auch nach Abschluss sowie Filmveröffentlichungen. Es gibt bewusst keine separate „Heute neu“-Kategorie; **Demnächst** reicht.

## Statistik

Bewusst einfach: Filme gesehen, Serien fertig, Staffeln begonnen, Folgen gesehen, Abgebrochen.

## Backup

Lokaler Backup-Export/-Import ist vorhanden. Zusätzlich wurde automatische Sicherung im Zusammenhang mit der gemeinsamen D1-Synchronisation vorgesehen.

## Design / Theme

- Gold/Gelb als Hauptakzent passend zum Logo
- Dunkel: Anthrazit/Schwarz + Gold
- Hell: warmes Off-White/Creme + weiße Karten + dunkle Schrift + Gold
- Hellmodus soll keine schweren schwarzen UI-Flächen enthalten
- echtes WatchTrack-App-Logo im Header
- System | Hell | Dunkel

Theme-Dateien: `theme-logo.css`, `theme-mode.css`, `theme-mode.js`, zusätzlich `ui-polish.js`.

## PWA / Cache

- `manifest.webmanifest` nutzt die drei PNG-App-Icons.
- `sw.js` nutzt Network-first für Navigation und relevante Assets.
- Bei jedem sichtbaren Release/Asset-Update Cache-Namen in `sw.js` ändern.
- iOS kann Homescreen-Icons separat cachen.

## Wichtige Dateien

- `index.html` – Grundstruktur, sichtbare Version, CSS/JS
- `app.js` – Kernlogik / TMDB / Library
- `features.js`, `custom.js`, `v24.js`, `v3.js` – Feature-Erweiterungen
- `series-first.js` – Serien-zuerst
- `stable-progress.js` – Staffel-/Folgen-Abhaken
- `sync.js`, `sync.css` – Familien-Key und Sync
- `notifications.js`, `upcoming-library.js` – Benachrichtigungen/kommende Inhalte
- `next-up.js` – Als Nächstes
- `recommendations.js` – Für-euch-Empfehlungen + Lernlogik
- `recommendation-feedback.css` – „Nicht zeigen“-UI
- `preference.css` – Daumen-UI
- `theme-logo.css`, `theme-mode.css`, `theme-mode.js`, `ui-polish.js` – Design
- `sw.js` – Service Worker / Cache / Push
- `manifest.webmanifest` – PWA-Metadaten und Icons

## Regeln für zukünftige Änderungen

1. Vor jeder größeren Änderung `WATCHTRACK-NOTES.md`, `index.html` und betroffene Dateien lesen.
2. Bestehende gemeinsame Datenstruktur und Sync-Kompatibilität möglichst nicht brechen.
3. Sichtbare Versionsnummer konsistent erhöhen.
4. Bei CSS/JS/Manifest/Icon-Änderungen Service-Worker-Cache aktualisieren.
5. Mobile/iPhone-PWA ist der wichtigste Formfaktor.
6. Serien-zuerst-Prinzip beibehalten.
7. UI kompakt und alltagstauglich halten.
8. Echtes App-Logo und Gold als Markenakzent erhalten.

## Stand der nächsten Ideen

Aktuell keine weitere offene gewünschte Funktion nach v3.3. Erst im Alltag beobachten, was tatsächlich fehlt oder stört.

<!-- deployment trigger: 2026-09-05 -->
<!-- deployment trigger 2: 2026-09-05T14:49+02:00 -->
<!-- deployment trigger 3: after Cloudflare output-directory change -->