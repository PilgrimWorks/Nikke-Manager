# Nikke Manager

A browser-based roster manager for Nikke: Goddess of Victory. Track overload gear rolls, skill levels, Collection Dolls, Harmony Cubes, bond progress, and solo raid teams — all in one place.

**Live app:** https://pilgrimworks.github.io/Nikke-Manager

---

## What it does

Nikke Manager gives you a full picture of your roster's investment gaps and helps you prioritise where to spend limited resources. At its core is an overload gear tracker: enter the stat lines rolled on a piece, and the app tells you whether to keep it, lock a line and reroll the rest, or reset entirely — with estimated Overload Rock costs based on actual probability math. Beyond gear, the Overview dashboard surfaces skill levels, Collection Dolls, bond, and cube levels that are below recommendations, so you always know what to work on next.

### Tabs

| Tab                 | Purpose                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**        | Dashboard with five sub-views — Rock Efficiency, Equipment, Skills, Dolls, and Bond — each showing what needs attention across your roster         |
| **Nikkes**          | Add characters to your roster, enter their rolled stat lines per gear slot, and get a keep / lock+reroll / reset verdict with estimated rock costs |
| **Solo Raids**      | Track your solo raid teams and damage scores                                                                                                       |
| **Line Priorities** | Set which stats matter for each Nikke (e.g. ATK + Elemental DMG) and how many of each you need across all 4 pieces                                 |
| **Weights**         | Customise how much each stat is worth in the scoring formula                                                                                       |
| **Cubes**           | Track your Harmony Cube levels and see which Nikkes are equipped with each cube                                                                    |
| **Wishlist**        | Recommended SSR Nikkes to wish for across the Elysion, Missilis, Tetra, and Pilgrim/Over-spec pools                                                |

### Overview sub-views

| Sub-view            | What it shows                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Rock Efficiency** | Ranks all your Nikkes' gear slots by %gain per rock — see where rocks have the most impact, optionally weighted by Solo Raid damage |
| **Equipment**       | Lists overload gear lines below Prydwen recommendations, sorted by OL priority                                                      |
| **Skills**          | Lists skill levels below recommended, sorted by skill priority and bossing tier                                                     |
| **Dolls**           | Shows which high-bossing Nikkes (tier S+) still need their recommended Collection Doll                                              |
| **Bond**            | Lists Nikkes whose bond level hasn't reached its limit-break maximum                                                                |

The Equipment, Skills, Dolls, and Bond views can be filtered by element or by a specific Solo Raid team.

### Verdict logic

- **Keep** — 2 or more good lines already at your target tier
- **Lock + Change Effects** — 1 good line; lock it and reroll the rest
- **Reset Attributes** — no good lines, or a good line that needs a tier upgrade
- Rock cost estimates factor in line appearance rates (Line 1: 100%, Line 2: 50%, Line 3: 30%) and tier probabilities

---

## Getting started

Open the app at https://pilgrimworks.github.io/Nikke-Manager

### Option 1 — Auto-import with the browser extension (recommended)

The **Nikke Manager** Chrome extension reads your gear data directly from [blablalink.com](https://www.blablalink.com) (which mirrors your in-game account) and imports everything into the app automatically — no manual data entry needed.

**Extension repo:** [github.com/PilgrimWorks/Nikke-Manager-Extension](https://github.com/PilgrimWorks/Nikke-Manager-Extension)

**Requirements:**

- A [blablalink.com](https://www.blablalink.com) account linked to your NIKKE game
- Google Chrome (or any Chromium-based browser)

**Installation (unpacked):**

1. Download the extension from the [GitHub repo](https://github.com/PilgrimWorks/Nikke-Manager-Extension)
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the extension folder
5. The Nikke Manager icon will appear in your toolbar

> Chrome may show a warning about developer mode extensions on browser startup — click **Cancel** to dismiss it. This is normal for manually loaded extensions.

**Usage:**

1. Log in to [blablalink.com](https://www.blablalink.com) in Chrome
2. Click the **Nikke Manager** icon in your toolbar
3. Click **Fetch Data** and wait around 10 seconds
4. The extension automatically opens the Nikke Manager and imports your data

If you are not logged in to blablalink, a login button will appear — click it, log in, then click **Fetch Data** again.

The extension popup also has a **Download Data** button to save your fetched data as a file — useful as a backup or for importing manually.

---

### Option 2 — Manual entry

1. Go to **Nikkes** and click **+ Add Nikke** to add the characters you're working on
2. Select a Nikke, pick a gear slot (Helmet / Chest / Gloves / Boots), and enter the stat lines from in-game
3. The app gives you a verdict and estimated rock cost instantly
4. Repeat for each slot — check the **Overview** tab to see which pieces to prioritise

You can also add custom Nikkes (characters not yet in the database) by entering their name, burst type, element, and weapon manually.

---

### Saving your data

Your data is stored in your browser's local storage automatically. To back it up or move it to another device:

- Click **My Data** in the top bar to export a `.json` file
- Re-import it from the same menu on any browser

**Cloud sync (optional):** Click **Sign In** and log in with Google to sync your data across devices automatically via Firebase.

---

## Support & feature requests

Found a bug or have an idea? Open an issue on [GitHub](https://github.com/PilgrimWorks/Nikke-Manager/issues) — all feedback welcome.
