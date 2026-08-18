# WatchTrack v2 – lokale iPhone-PWA

WatchTrack ist eine statische Progressive Web App für iPhone/Safari. Die App-Oberfläche und deine Watch-Daten sind lokal; aktuelle Katalogdaten werden direkt von der TMDB API geladen.

<!-- deployment-test: 2026-08-18 -->
<!-- d1-binding-redeploy: 2026-08-18T19:52+02:00 -->

## Funktionen

- Filme: **Bald**, **Jetzt im Kino**, **Beliebt**, **Top bewertet**, **Katalog**
- Serien: **Bald**, **Läuft**, **Beliebt**, **Top bewertet**, **Katalog**
- Gesamten Film-/Serienkatalog durchsuchen
- Detailansicht mit Beschreibung, Bewertung, Genre, Laufzeit, Status und Trailer
- Streaming-/Kauf-/Leih-Anbieter für DE/AT/CH, soweit TMDB Daten dafür führt
- Watchlist / Am Schauen / Fertig
- Serienfortschritt pro Staffel und einzelner Folge
- Ganze Staffel als gesehen markieren
- Fortschrittsanzeige in „Meine Liste“
- Lokale Speicherung (`localStorage`)
- JSON Backup/Restore
- PWA-App-Shell für iPhone

## 1. TMDB Read Access Token

Die App benötigt für echte Katalogdaten deinen persönlichen TMDB **API Read Access Token**.

1. Kostenloses Konto auf TMDB anlegen/anmelden.
2. In den Kontoeinstellungen den Bereich **API** öffnen.
3. Einen API-Zugang erstellen und den **API Read Access Token** kopieren.
4. In WatchTrack unter **Setup → TMDB verbinden** einfügen und „Speichern & testen“ wählen.

Der Token wird nur im `localStorage` dieses Browsers gespeichert. Da WatchTrack eine statische App ohne Backend ist, kann ein lokaler Browser-Token technisch nicht wie ein Server-Secret verborgen werden.

## 2. Lokal starten

Service Worker funktionieren nicht zuverlässig über `file://`. Starte die Dateien deshalb über HTTP(S).

Auf einem Computer im Projektordner:

```bash
python3 -m http.server 8080
```

Dann im selben WLAN auf dem iPhone `http://<IP-DEINES-COMPUTERS>:8080` öffnen.

Für eine dauerhafte Installation auf dem iPhone ist **HTTPS** empfehlenswert, z. B. über GitHub Pages, Cloudflare Pages oder Netlify.

## 3. Auf dem iPhone installieren

In Safari:

**Teilen → Zum Home-Bildschirm → Als Web-App öffnen → Hinzufügen**

Danach erscheint WatchTrack wie eine App auf dem Home-Bildschirm.

## Internet / Offline

- App-Oberfläche, Watchlist und Fortschritt bleiben lokal verfügbar.
- Aktuelle Filme, Serien, Folgen, Poster und Anbieter benötigen Internetzugriff auf TMDB.

## Datenquelle

This product uses the TMDB API but is not endorsed or certified by TMDB.

Streaming-/Anbieterdaten werden über TMDB abgefragt und stammen aus der TMDB/JustWatch-Integration. JustWatch wird in der App bei diesen Daten ausdrücklich genannt.
