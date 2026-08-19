# WatchTrack – Projektstand / Übergabe

> Diese Datei ist die dauerhafte Kurz-Dokumentation für spätere Weiterarbeit. Vor Änderungen zuerst diese Datei und anschließend den aktuellen Code lesen. Der Code im Repository ist immer die technische Wahrheit, falls diese Notizen einmal hinterherhinken.

## Aktueller Stand

- Aktuelle sichtbare Version: **v3.2.2**.
- WatchTrack ist eine installierbare PWA für Filme und Serien.
- Hauptnutzung: eine **gemeinsame Liste auf zwei Geräten**, ohne getrennte Benutzerkonten.
- Serien stehen in der Oberfläche bewusst **vor Filmen**, weil Serien häufiger genutzt werden.
- Design: seriös, dunkel/hell, mit **Gold/Gelb als Akzentfarbe** passend zum WatchTrack-App-Logo.
- Darstellung: **System | Hell | Dunkel**. System ist Standard und folgt dem Betriebssystem.
- Das echte App-Logo liegt unter `icons/icon-180.png`, `icons/icon-192.png` und `icons/icon-512.png` und wird auch im Header verwendet.

## Produktidee

WatchTrack soll einen einfachen gemeinsamen Überblick geben über:

- Serien und Filme, die noch geschaut werden sollen
- aktuell laufende Serien
- bereits gesehene bzw. abgeschlossene Titel
- einzelne Staffeln und Folgen inklusive Fortschritt
- kommende Folgen, Staffeln, Serien und Filme
- Streaming-/Kino-Verfügbarkeit soweit über die verwendeten Datenquellen verfügbar
- persönliche Empfehlungen aus der gemeinsamen Watch-Historie

Die App soll **übersichtlich bleiben**. Neue Funktionen nur hinzufügen, wenn sie im Alltag wirklich helfen; keine unnötige Überladung.

## Wichtige UX-Entscheidungen

- In Bereichen mit Serien/Filmen steht **Serien zuerst**.
- `Meine Liste` trennt Serien und Filme, damit es nicht unübersichtlich wird.
- Fertig gesehene Serien sollen unter **Gesehen** erscheinen und nicht weiter unter den aktiven eigenen Serien.
- `Als Nächstes` zeigt die nächsten relevanten Folgen; wenn ein Ausstrahlungsdatum bekannt ist, soll es direkt dort sichtbar sein.
- Ganze Staffeln und einzelne Folgen können abgehakt werden. Das Abhaken darf die Seite nicht störend springen/einklappen lassen.
- Eigene Filme/Serien können manuell hinzugefügt werden, wenn ein Titel nicht über den Katalog gefunden wird. Bei Serien sind optional einzelne Staffeln/Folgen möglich.
- Status **Abgebrochen** ist vorhanden.
- Keine getrennten Benutzerprofile und keine Anzeige „wer hat hinzugefügt“.
- Keine individuelle Sternebewertung. Stattdessen einfache gemeinsame Vorlieben: **Doppel-Daumen hoch / Daumen hoch / Daumen runter**.
- Der Doppel-Daumen soll optisch wie **ein Symbol mit leicht überlappenden Händen** wirken, nicht wie zwei getrennte Emojis hintereinander.
- Vorlieben sitzen dezent in der Detailansicht und bleiben nach Auswahl sichtbar markiert.

## Empfehlungen

`recommendations.js` ergänzt in Entdecken die Kategorie **Für euch** für Serien und Filme.

Gewichtung derzeit:

- `love` (Doppel-Daumen hoch): stark positiv
- `like`: positiv
- `dislike`: negativ
- gesehen/aktuell geschaut: leicht positiv
- Watchlist: schwach positiv
- abgebrochene Titel werden nicht als Empfehlungssaat verwendet

Empfehlungen werden über TMDB `recommendations` bzw. `similar` erzeugt und mit den gespeicherten Vorlieben gewichtet.

## Gemeinsame Synchronisation

- `sync.js` synchronisiert die gemeinsame Library über `./api/sync`.
- Geräte werden über einen **Familien-Key** verbunden (`wt_family_key` in localStorage).
- Kein zweites Konto erforderlich.
- Der Key kann unter Setup eingegeben/kopiert/geteilt werden und funktioniert damit auch bei der installierten Home-Screen-PWA.
- Serverseitig wird Cloudflare/D1 verwendet; Watch-Daten werden bei aktiver Synchronisierung dort gespeichert.
- Lokale Löschungen werden über Tombstones (`wt_deleted`) berücksichtigt, damit entfernte Einträge nicht durch Sync wieder auftauchen.
- Sync läuft nach Änderungen sowie regelmäßig bei sichtbarer App/Fokus.

## Benachrichtigungen / kommende Inhalte

Die App wurde so erweitert, dass relevante neue Inhalte der eigenen Liste berücksichtigt werden können, insbesondere:

- neue Folgen einer gespeicherten Serie
- neue Staffel einer Serie, auch wenn die bisherige Serie/Staffel bereits fertig gesehen wurde
- Veröffentlichung eines vorgemerkten, bisher noch nicht erschienenen Films
- kommende Inhalte / „Demnächst“

Es gibt bewusst **keine separate „Heute neu“-Kategorie**; „Demnächst“ reicht.

## Statistik

In `v3.js` gibt es eine bewusst einfache Statistik mit:

- Filme gesehen
- Serien fertig
- Staffeln begonnen
- Folgen gesehen
- Abgebrochen

Die Statistik soll kompakt bleiben und nicht zu einem großen Analyse-Dashboard ausgebaut werden.

## Backup

- Lokaler Backup-Export/-Import ist im Setup vorhanden.
- Zusätzlich wurde automatische Sicherung im Zusammenhang mit der gemeinsamen D1-Synchronisation vorgesehen.
- Bei Änderungen an Sync/Backup besonders darauf achten, keine bestehende gemeinsame Liste zu überschreiben oder gelöschte Einträge wiederherzustellen.

## Design / Theme

Aktuelle Designrichtung:

- **Gold/Gelb** als Hauptakzent passend zum `T` des Logos
- Dunkel: Anthrazit/Schwarz + Gold + helle Schrift
- Hell: warmes Off-White/Creme + weiße Karten + dunkle Schrift + Gold
- Hellmodus soll **keine schweren schwarzen UI-Flächen** enthalten
- echtes WatchTrack-App-Logo im Header, kein alternatives/generiertes Ersatzlogo
- helle Karten mit weichen Schatten und großzügigen Abständen
- Bottom-Navigation und Theme-Auswahl sollen zum jeweiligen Modus passen

Theme-Dateien: `theme-logo.css`, `theme-mode.css`, `theme-mode.js`, zusätzlich `ui-polish.js` für den aktuellen UI-Feinschliff.

## PWA / Cache

- `manifest.webmanifest` nutzt die drei PNG-App-Icons.
- `sw.js` verwendet Network-first für Navigation und relevante Assets, damit neue Versionen zuverlässiger ankommen.
- Bei jedem sichtbaren Release/Asset-Update **Cache-Namen in `sw.js` ändern**, sonst können installierte PWAs auf alten Dateien hängen bleiben.
- iOS kann ein bereits installiertes Homescreen-Icon separat cachen; bei Icon-Wechsel kann Entfernen und erneutes „Zum Home-Bildschirm“ nötig sein.

## Wichtige Dateien

- `index.html` – Grundstruktur, sichtbare Versionsnummer und eingebundene CSS/JS-Dateien
- `app.js` – Kernlogik / TMDB / Library
- `features.js`, `custom.js`, `v24.js`, `v3.js` – schrittweise Feature-Erweiterungen
- `series-first.js` – Serien-zuerst-Verhalten
- `stable-progress.js` – stabileres Staffel-/Folgen-Abhaken
- `sync.js`, `sync.css` – Familien-Key und gemeinsame Synchronisation
- `notifications.js`, `upcoming-library.js` – Benachrichtigungen/kommende Inhalte
- `next-up.js` – Als-Nächstes-Funktion
- `recommendations.js` – Für-euch-Empfehlungen
- `preference.css` – Vorlieben / Daumen-UI
- `theme-logo.css` – Gold/Logo-Design
- `theme-mode.css`, `theme-mode.js` – System/Hell/Dunkel
- `ui-polish.js` – aktueller visueller Feinschliff
- `sw.js` – Service Worker / Cache / Push
- `manifest.webmanifest` – PWA-Metadaten und Icons

## Regeln für zukünftige Änderungen

1. Vor jeder größeren Änderung `WATCHTRACK-NOTES.md`, `index.html` und die betroffenen aktuellen Dateien lesen.
2. Bestehende gemeinsame Datenstruktur und Sync-Kompatibilität möglichst nicht brechen.
3. Nach Änderungen sichtbare Versionsnummer konsistent erhöhen, wenn es ein echtes App-Update ist.
4. Bei CSS/JS/Manifest/Icon-Änderungen Service-Worker-Cache aktualisieren.
5. Mobile/iPhone-PWA ist der wichtigste Formfaktor; Änderungen dort zuerst gedanklich prüfen.
6. Serien-zuerst-Prinzip beibehalten.
7. UI kompakt und alltagstauglich halten; keine Features nur um der Feature-Menge willen.
8. Bei Designänderungen echtes vorhandenes App-Logo weiterverwenden und Gold als Markenakzent erhalten.

## Stand der nächsten Ideen

Aktuell gibt es **keine offene gewünschte Funktion**. Erst im Alltag beobachten, was tatsächlich fehlt oder stört. Wenn später weitergebaut wird, zuerst den aktuellen Repository-Stand gegen diese Notizen prüfen und die Notizen nach der Änderung aktualisieren.
