# Nikke Manager

A browser-based tool to track overload gear rolls for Nikke: Goddess of Victory — get reroll verdicts, rock cost estimates, and see at a glance which gear slots are worth working on next.

**Live app:** https://bongjames.github.io/Nikke-Overload-Gears-Manager

---

## What it does

Overload gear has up to 3 random stat lines per piece, and rerolling them costs Overload Rocks. This tool helps you decide whether a rolled piece is worth keeping, which lines to lock, and how many rocks to budget before you hit your targets.

### Tabs

| Tab                 | Purpose                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Overview**        | Ranks all your Nikkes' gear slots by reroll priority — see where your rocks will have the most impact              |
| **Gear Tracker**    | Enter your rolled stat lines per Nikke and slot; get a keep / lock+reroll / reset verdict with expected rock costs |
| **Line Priorities** | Set which stats matter for each Nikke (e.g. ATK + Elemental DMG) and how many of each you need across all 4 pieces |
| **Solo Raids**      | Track your solo raid teams and damage scores                                                                       |
| **Weights**         | Customise how much each stat is worth in the scoring formula                                                       |

### Verdict logic

- **Keep** — 2 or more good lines already at your target tier
- **Lock + Change Effects** — 1 good line; lock it and reroll the rest
- **Reset Attributes** — no good lines, or a good line that needs a tier upgrade
- Rock cost estimates factor in line appearance rates (Line 1: 100%, Line 2: 50%, Line 3: 30%) and tier probabilities

---

## Getting started

Open the app at https://bongjames.github.io/Nikke-Overload-Gears-Manager

### Option 1 — Auto-import with the browser extension (recommended)

The **Nikke Manager** Chrome extension reads your gear data directly from [blablalink.com](https://www.blablalink.com) (which mirrors your in-game account) and imports everything into the app automatically — no manual data entry needed.

**Requirements:**

- A [blablalink.com](https://www.blablalink.com) account linked to your NIKKE game
- Google Chrome (or any Chromium-based browser)

**Getting the extension:**

The extension is not yet on the Chrome Web Store. To get the current version, message **xehny** on Discord and they will send you the unpacked extension files. A Web Store release is planned for the future.

**Installation (unpacked):**

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked** and select the extension folder
4. The Nikke Manager icon will appear in your toolbar

> Chrome may show a warning about developer mode extensions on browser startup — click **Cancel** to dismiss it. This is normal for manually loaded extensions.

**Usage:**

1. Log in to [blablalink.com](https://www.blablalink.com) in Chrome
2. Click the **Nikke Manager** icon in your toolbar
3. Click **Fetch Data** and wait around 10 seconds
4. The extension automatically opens the Gear Manager and imports your data

If you are not logged in to blablalink, a login button will appear — click it, log in, then click **Fetch Data** again.

---

### Option 2 — Manual entry

1. Go to **Gear Tracker** and click **+ Add Nikke** to add the characters you're working on
2. Select a Nikke, pick a gear slot (Helmet / Chest / Gloves / Boots), and enter the stat lines from in-game
3. The app gives you a verdict and estimated rock cost instantly
4. Repeat for each slot — check the **Overview** tab to see which pieces to prioritise

---

### Saving your data

Your data is stored in your browser's local storage automatically. To back it up or move it to another device:

- Click **My Data** in the top bar to export a `.json` file
- Re-import it from the same menu on any browser

**Cloud sync (optional):** Click **Sign In** and log in with Google to sync your data across devices automatically via Firebase.

---

## Support & feature requests

Found a bug or have an idea? Open an issue on [GitHub](https://github.com/bongjames/Nikke-Overload-Gears-Manager/issues) — all feedback welcome.
