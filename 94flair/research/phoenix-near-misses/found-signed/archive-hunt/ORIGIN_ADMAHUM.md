# Dark Phoenix / Flair PB5 origin hunt — report
Date: 2026-10-21  
Target: 802×589 found scan (md5 `0a140f30e369d3030577dbc569328304`) + dreager1 same-frame

## Verdict (short)

The circulating signed painting is **Adham Hussain**’s (DeviantArt **Admahum** / **AddHam2it**) large fan recreation of 1994 Flair Powerblast #5, first posted **2006-03-20**. The lower-right interlocking **AH** monogram is **his** mark (also on his other 2006 Katrina-era recreations)—**not** Adam Hughes.  
**Fleer’s original PB5 source artist remains unidentified**; Adham’s own caption says he painted *from* the Marvel trading card.

---

## 1. Confirmed earlier hosts (URL + date)

| Host | Date | Notes |
|------|------|-------|
| https://www.deviantart.com/admahum/art/Dark-Phoenix-30640234 (`fav.me/di8q5m`) | **Published 2006-03-20** (live; no Wayback snapshot of page) | Author **Admahum** = **Adham Hussain**. 802×589, **46,163 bytes**, md5 **`38be99fed9bbda034ce3baecae5af691`**. Caption: painted 3ft×4ft of the Marvel trading card; destroyed in Hurricane Katrina. Comment (2010-05-25): “awesome rendition of the 94 flair card.” |
| https://dreager1.com/wp-content/uploads/2011/01/dark_phoenix.jpg | upload path year **2011** (live) | **Byte-identical** to DA file (same md5/size). Uncredited vs-battle decoration. **Never** Wayback-archived. |
| https://dreager1.com/wp-content/uploads/2012/05/dark_phoenix.jpg | upload path year **2012** (live; used on 2012-05-13 Jean Grey vs Scarlet Witch post; reused 2022) | Same bytes as 2011/DA. |
| Collector “found” scan (`found-phoenix.jpg`) | unknown provenance | Same 802×589 frame; **cleaner** JPEG (97,882 bytes, md5 `0a140f30…`). Mean RGB abs diff vs DA/dreager ≈ **0.29**; corr ≈ **0.99993** → same master, lighter recompress. |

Wayback digests for this exact painting file: **not present** under found digest `OLRNGWQAMRCDNVRCVXDJKAEHHNUVQMH5` or dreager digest `AVW7D26KYQDLW2JKYIOY27VSZIHVHIAU` (prior pass). DA page/`fav.me/di8q5m` availability API: **no archived snapshots**.

---

## 2. Artist ID confidence

### A) Painter of the circulating signed JPEG — **Adham Hussain — HIGH**

Evidence:
1. **SauceNAO 88.97%** → DeviantArt ID `30640234`, author **Admahum**, title “Dark Phoenix”.
2. Live oEmbed + page: New Orleans hobbyist **Adham Hussain**, site **addham2it.com**, email addham2it@gmail.com; DA Traditional Paintings folder includes this piece.
3. Caption claims **his** 3×4 ft painting of the Marvel card, Katrina-destroyed; 2010 commenter treats it as a **rendition of 94 Flair**.
4. **Same interlocking AH monogram** on his other **2006-03-20** Katrina recreations:
   - `Saint-Michael-Slaying-Satan-30642401` — “found this picture on the internet… 4ft×3ft… Katrina”
   - `Silver-Myr-30640400` — “based on the Magic… card… by artist **Kev Walker**… 4ft×4ft”
5. Initials / branding: **A**dham **H**ussain → **AH**; handles **Admahum**, **AddHam2it**.

### B) Adam Hughes hypothesis for the monogram — **RULED OUT (HIGH)**

Same AH glyph appears on Adham’s Silver Myr remake of a **Kev Walker** card and on Saint Michael; not an AH! bang; style is airbrush-noir fan recreation, not Hughes good-girl ink. CAF Chris Klamer “Dark Phoenix (AH)” is a **different** AH pencil portrait (corr ≈ 0).

### C) Fleer Powerblast #5 *original source* artist — **UNKNOWN (LOW on all named candidates)**

Adham’s consistent MO (Silver Myr credits Walker; Saint Michael “from internet”; Phoenix “of the Marvel trading card”) indicates **card → his painting**, not the reverse. Reddit/Blowout note that Powerblast art is reused existing art “**except possibly Phoenix**” still stands: **PB5 source not found** in this pass.  
Named pinup painters checked via search/CAF/Heritage with **no pose match**: Alex Horley, Hildebrandts, Jusko, Vallejo/Julie Bell, Royo, Bisley, Brom, Dorman, Ezra Tucker (Fleer Ultra Phoenix ≠ this), Greg Hildebrandt later commission, etc.

---

## 3. Reverse-image / archive avenues tried

| Engine | Result |
|--------|--------|
| **SauceNAO** (file upload) | **Hit** — Admahum DA 88.97% |
| **Yandex** (URL = dreager1 2012) | Lands on dreager; CBIR otherwise thin / imageExpired flags |
| **IQDB** | No relevant matches (anime DBs) |
| **ascii2d** | 403 |
| **TinEye** | 403 bot wall |
| **Google SBI / Lens** | Soft-block / no useful hosts |
| **Bing** visual URL/upload | Redirected to Image Creator or unrelated; prior Bing HTML unhelpful |
| **Wayback CDX** | dreager images never archived; DA page not archived; gangus/CAF exclusions as prior |
| **Common Crawl index** | 504 timeouts this pass (not negative proof) |
| **Geocities/Angelfire/Photobucket/ImageShack CDX** | empty/timeout (prior + this) |

---

## 4. Dead ends (one line each)

- **Adam Hughes** — AH monogram is Adham Hussain’s; Hughes not supported by style or bang.
- **Alex Horley** — no Dark Phoenix pinup/card match; different mark (full name).
- **CAF Chris Klamer “Dark Phoenix (AH)” (148691)** — different AH pencil portrait, not this blast pose.
- **gangus.net 2006 `dark_phoenix.jpg`** — Glen Angus Raven/X2 art; pixel corr ≈ 0.02.
- **Julie Bell / Boris Vallejo** — Julie Bell “Dark Phoenix” is a 2025 private oil; no PB5 pose.
- **Greg & Tim Hildebrandt** — Greg’s CAF Dark Phoenix is 2017 black-board commission; different.
- **Joe Jusko / Dave Dorman / Simon Bisley / Brom / Luis Royo** — no auction/CAF hit matching this pose.
- **Ezra Tucker Fleer Ultra Phoenix** — different 1994 Ultra painted card, not Flair PB5.
- **Fleer CGI studio name** — no Digitel/Metropolis/etc. credit found for Flair Powerblast.
- **Heritage / ComicLink / eBay sold / Raremarq** — no sale of this exact blast-pose original.
- **ArtStation / CGSociety / Instagram** — no attributed match found in search.
- **adhamhussein.com** (architecture/AP portfolio) — different person (Hussein vs Hussain).

---

## 5. Best next leads (if hunting Fleer source further)

1. **Contact Adham Hussain** (addham2it@gmail.com / AddHam2it Facebook): ask paint date, whether he worked from the foil card, a magazine scan, or a pre-CGI file, and if higher-res photos of the destroyed canvas survive.
2. **Treat Adham’s JPEG as a derivative**: hunt PB5 source among pre-1994 Marvel painted pinups / unused Fleer inventory *without* expecting his AH mark on the Fleer plate.
3. **Collector forums**: Blowout thread that IDed other Powerblast sources (Texeira Wolverine, McFarlane Spidey, JRJr Punisher, Madureira Deadpool, Lee Cap) — ask the Phoenix exception specifically.
4. **Pixel forensics**: map CGI-only deltas (PB5 HD vs Adham scan) to confirm Adham cleaned/expanded vs Fleer crushed a different master.
5. **Manual TinEye/Google Lens** from a residential IP (bot-walled here) on both found and Adham files.
6. **Facebook groups / CAF search** for “Powerblast Phoenix source” / unused Flair painted Phoenix.

---

## Evidence files (`/tmp/origin-hunt/`)

- `da-admahum-dark-phoenix.jpg` — DA download (md5 `38be99fe…`, = dreager)
- `da-admahum.html`, `da-oembed.json` — page + oEmbed
- `da-sm.jpg`, `da-myr.jpg` + `sig-da-*-corner*` — AH monogram peers
- `saucenao.html`, `iqdb.html`, `yandex-url.html`, `tineye-url.html`, …
- `found-phoenix.jpg`, `found-vs-pb5-full.jpg`, signature zooms
- `addham-about.html` / `addham2it.html` — identity pages
