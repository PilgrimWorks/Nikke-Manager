// ============================================================
//  SCRAPER IMPORT — merges extension/scraper data into the roster
// ============================================================
//  Split in two:
//    mergeScraperData()    pure, testable, no state/DOM (see scripts/verify-import-merge.js)
//    _applyScraperImport() thin shell: assigns to state, saves, renders
// ============================================================

// Scraper stat names differ from the app's — this handles the translation.
const STAT_MAP = {
    ATK: "ATK",
    "Element DMG": "Ele Dmg",
    "Elemental Damage": "Ele Dmg",
    "Elemental Dmg": "Ele Dmg",
    "Ele Dmg": "Ele Dmg",
    "Max Ammo": "Max Ammo",
    "Charge Speed": "Charge Spd",
    "Charge Spd": "Charge Spd",
    "Charge DMG": "Charge Dmg",
    "Charge Damage": "Charge Dmg",
    "Charge Dmg": "Charge Dmg",
    "Critical Rate": "Crit Rate",
    "Crit Rate": "Crit Rate",
    "Critical DMG": "Crit Dmg",
    "Critical Damage": "Crit Dmg",
    "Critical Dmg": "Crit Dmg",
    "Crit Dmg": "Crit Dmg",
    "Hit Rate": "Hit Rate",
    DEF: "DEF",
};

const SLOT_MAP = {
    Helmet: "Helmet",
    Chest: "Torso",
    Gloves: "Arms",
    "Combat Boots": "Legs",
};

const NAME_OVERRIDES = {
    Asuka: "Asuka Shikinami Langley",
    "Asuka: WILLE": "Asuka Shikinami Langley: Wille",
    "Rei (Tentative Name)": "Rei Ayanami (Tentative Name)",
    EVE: "Eve",
    Mari: "Mari Makinami Illustrious",
    Chisato: "Chisato Nishikigi",
    Takina: "Takina Inoue",
    Kurumi: "Kurumi",
    Ada: "Ada Wong",
    Jill: "Jill Valentine",
    Claire: "Claire Redfield",
    Misato: "Misato Katsuragi",
    "Little Mermaid": "Siren",
};

const ID_OVERRIDES = {
    831: "Rei Ayanami",
    836: "Sakura Suzuhara",
};

function resolveNikkeName(scraperName, gameId) {
    if (ID_OVERRIDES[gameId]) return ID_OVERRIDES[gameId];
    if (NAME_OVERRIDES[scraperName]) return NAME_OVERRIDES[scraperName];
    const exact = NIKKE_DATABASE.find((n) => n.name === scraperName);
    if (exact) return exact.name;
    const lower = String(scraperName || "").toLowerCase();
    const ci = NIKKE_DATABASE.find((n) => n.name.toLowerCase() === lower);
    if (ci) return ci.name;
    return scraperName;
}

function blankLine() {
    return { stat: "", val: "", locked: false };
}

function blankSlot() {
    return { lv: 0, tier: 0, lines: [blankLine(), blankLine(), blankLine()] };
}

function mkNikke(name, burst1, burst2, burst3, element, weapon) {
    const gear = {};
    SLOTS.forEach((s) => {
        gear[s] = blankSlot();
    });
    // ID uses no decimal point (avoids inline onclick breakage)
    return {
        id: "n" + Date.now() + Math.floor(Math.random() * 1000000),
        name,
        burst1: burst1 || false,
        burst2: burst2 || false,
        burst3: burst3 || false,
        element,
        weapon: weapon || (NIKKE_DB_MAP.get(name) && NIKKE_DB_MAP.get(name).weapon) || "AR",
        power: 0,
        limitBreak: 0,
        cores: 0,
        bond: 0,
        skill1: 1,
        skill2: 1,
        skill3: 1,
        gear,
        priorities: dbOverloadToPriorities(name),
    };
}

function dbOverloadToPriorities(name) {
    const db = NIKKE_DB_MAP.get(name);
    const overload = db && db.build && db.build.overload;
    if (!overload) return [];
    const { ideal = [], passable = [] } = overload;
    return [
        ...ideal.map((e) => ({ line: e.name, tier: "Ideal", count: e.amount, targetTier: 10 })),
        ...passable.map((e) => ({ line: e.name, tier: "Passable", count: e.amount, targetTier: 10 })),
    ];
}

// Deep equality on the fields the Priorities sub-tab can edit. Used to decide
// whether a departing Nikke's priorities are worth stashing.
function samePriorities(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((p, i) => {
        const q = b[i];
        return (
            p.line === q.line &&
            p.tier === q.tier &&
            (parseInt(p.count) || 1) === (parseInt(q.count) || 1) &&
            (parseInt(p.targetTier) || 10) === (parseInt(q.targetTier) || 10)
        );
    });
}

// Writes every scraper-owned field onto rec. Absent or empty incoming data is
// authoritative and clears the local value. Locks are the one exception: a lock
// survives only when the incoming stat matches the stat already on that line,
// because a changed stat means the gear was rerolled in-game.
function applyScrapedFields(rec, entry, cubeLevels) {
    rec.cube = entry.cube ? { tid: entry.cube.tid, name: HARMONY_CUBES[entry.cube.tid] ?? null } : null;
    if (entry.cube && entry.cube.lv != null) cubeLevels[entry.cube.tid] = entry.cube.lv;

    const doll = entry.doll ? COLLECTION_DOLLS.find((d) => d.id === entry.doll.tid) : null;
    rec.doll = entry.doll ? { tid: entry.doll.tid, lv: entry.doll.lv ?? 0, name: (doll && doll.name) ?? null } : null;

    rec.power = entry.power ?? 0;
    rec.bond = entry.bond ?? 0;
    rec.limitBreak = entry.limitBreak ?? 0;
    rec.cores = entry.cores ?? 0;
    rec.skill1 = entry.skill1 ?? 1;
    rec.skill2 = entry.skill2 ?? 1;
    rec.skill3 = entry.ultiSkill ?? 1;

    if (!rec.gear || typeof rec.gear !== "object") rec.gear = {};

    for (const [scraperSlot, appSlot] of Object.entries(SLOT_MAP)) {
        const prevSlot = rec.gear[appSlot] || blankSlot();
        const raw = entry[scraperSlot];
        const rawLines = raw ? (Array.isArray(raw) ? raw : raw.lines) : null;

        if (!Array.isArray(rawLines)) {
            rec.gear[appSlot] = blankSlot();
            continue;
        }

        const slot = blankSlot();
        if (!Array.isArray(raw)) {
            slot.lv = raw.lv ?? 0;
            slot.tier = raw.tier ?? 0;
        }

        for (let i = 0; i < 3; i++) {
            const incoming = rawLines[i];
            if (!incoming || !incoming.stat) continue; // stays blank

            const stat = STAT_MAP[incoming.stat] || incoming.stat;
            let val = incoming.value || "";
            if (val) {
                const num = parseFloat(String(val).replace("%", ""));
                if (!isNaN(num)) val = num.toFixed(2);
            }

            const prevLine = (prevSlot.lines && prevSlot.lines[i]) || blankLine();
            slot.lines[i] = { stat, val, locked: prevLine.locked === true && prevLine.stat === stat };
        }

        rec.gear[appSlot] = slot;
    }
}

// Element, burst and weapon are database-owned, not scraper-owned. A Nikke the
// database does not know keeps them blank and carries the `unrecognized` flag
// until a later database update covers it, at which point the canonical values
// land and the flag clears.
function applyDbMetadata(rec, dbEntry) {
    if (dbEntry) {
        rec.element = dbEntry.element;
        rec.burst1 = !!dbEntry.burst1;
        rec.burst2 = !!dbEntry.burst2;
        rec.burst3 = !!dbEntry.burst3;
        rec.weapon = dbEntry.weapon;
        delete rec.unrecognized;
    } else {
        rec.unrecognized = true;
        rec.element = "";
        rec.weapon = "";
    }
}

// ── Merge core ───────────────────────────────────────────────
// prev: { nikkes, savedPriorities, cubeLevels }
// Returns fresh objects; never mutates prev.
function mergeScraperData(prev, scraperData) {
    const working = JSON.parse(JSON.stringify((prev && prev.nikkes) || []));
    const savedPriorities = Object.assign({}, (prev && prev.savedPriorities) || {});
    const cubeLevels = Object.assign({}, (prev && prev.cubeLevels) || {});
    const stats = {
        updated: 0,
        added: 0,
        removed: 0,
        unrecognized: 0,
        unrecognizedNames: [],
        duplicatesSkipped: 0,
        prioritiesStashed: 0,
        prioritiesRestored: 0,
    };

    const seen = new Set();
    const nikkes = [];

    for (const [gameId, entry] of Object.entries(scraperData)) {
        const resolvedName = resolveNikkeName(entry && entry.name, gameId);
        let rec = working.find((n) => n.gameId != null && String(n.gameId) === String(gameId));
        if (!rec) rec = working.find((n) => n.name === resolvedName);

        if (rec && seen.has(rec)) {
            stats.duplicatesSkipped++;
            continue;
        }

        if (!rec) {
            rec = mkNikke(resolvedName, false, false, false, "", "");
            if (savedPriorities[resolvedName]) {
                rec.priorities = savedPriorities[resolvedName];
                delete savedPriorities[resolvedName];
                stats.prioritiesRestored++;
            }
            stats.added++;
        } else {
            stats.updated++;
        }

        rec.gameId = String(gameId);
        rec.name = resolvedName;

        const dbEntry = NIKKE_DB_MAP.get(resolvedName) || null;
        applyDbMetadata(rec, dbEntry);
        if (!dbEntry) {
            stats.unrecognized++;
            stats.unrecognizedNames.push(resolvedName);
        }

        applyScrapedFields(rec, entry || {}, cubeLevels);

        seen.add(rec);
        nikkes.push(rec);
    }

    // Nikkes with no matching scrape entry leave the roster. Keep any priorities
    // the user customised, keyed by name, so they return if the Nikke is ever
    // re-acquired. Untouched database defaults are not stashed, so an updated
    // recommendation still wins next time.
    for (const n of working) {
        if (seen.has(n)) continue;
        stats.removed++;
        const custom =
            Array.isArray(n.priorities) &&
            n.priorities.length > 0 &&
            !samePriorities(n.priorities, dbOverloadToPriorities(n.name));
        if (custom) {
            savedPriorities[n.name] = n.priorities;
            stats.prioritiesStashed++;
        }
    }

    return { nikkes, savedPriorities, cubeLevels, stats };
}

// ── Shell: state assignment, side effects, user feedback ─────
// opts.silent = true skips the confirm dialog and shows a toast instead of alert.
function _applyScraperImport(scraperData, opts) {
    const silent = opts && opts.silent;

    if (typeof scraperData !== "object" || scraperData === null || Array.isArray(scraperData)) {
        if (!silent) alert("Invalid scraper file — expected an object keyed by Nikke ID.");
        return;
    }

    const scraperEntries = Object.values(scraperData);
    const withGear = scraperEntries.filter(
        (entry) => entry.Helmet || entry.Chest || entry.Gloves || entry["Combat Boots"],
    );

    if (!silent) {
        const ok = confirm(
            `Scraper file contains ${scraperEntries.length} Nikke(s), ${withGear.length} with gear data.\n\n` +
                `OK = Import (updates your roster; Nikkes not in the file are removed)\nCancel = abort import`,
        );
        if (!ok) return;
    }

    const merged = mergeScraperData(
        { nikkes: state.nikkes, savedPriorities: state.savedPriorities, cubeLevels: state.cubeLevels },
        scraperData,
    );

    state.nikkes = merged.nikkes;
    state.savedPriorities = merged.savedPriorities;
    state.cubeLevels = merged.cubeLevels;

    // Prune Team entries that reference Nikkes no longer in the roster
    const validIds = new Set(state.nikkes.map((n) => n.id));
    if (state.teamRaids) {
        state.teamRaids.forEach((r) => {
            r.entries = (r.entries || []).filter((e) => validIds.has(e.nikkeId));
        });
    }

    // An import can delete the selected Nikke, so validate rather than only
    // filling an empty selection.
    const sorted = sortNikkesBySidebar(state.nikkes);
    const fallback = sorted.length ? sorted[0].id : null;
    if (!state.selGear || !validIds.has(state.selGear)) state.selGear = fallback;
    if (!state.selPrio || !validIds.has(state.selPrio)) state.selPrio = fallback;

    save();
    render();

    const s = merged.stats;
    const parts = [`${s.updated} updated`, `${s.added} added`];
    if (s.removed) parts.push(`${s.removed} removed`);
    if (s.unrecognized) parts.push(`${s.unrecognized} not in database`);
    const summary = parts.join(" · ");

    if (silent) {
        _showExtImportToast("Extension import complete — " + summary, s.unrecognized > 0);
    } else {
        let msg = `Import complete!\n\n• ${summary}`;
        if (s.prioritiesRestored) msg += `\n• ${s.prioritiesRestored} Nikke(s) had saved priorities restored`;
        if (s.unrecognized) {
            msg +=
                `\n• ${s.unrecognized} not in database (${s.unrecognizedNames.join(", ")})` +
                `\n\nBurst, element and weapon will be filled in automatically once the database is updated.`;
        }
        alert(msg);
    }
}

// Called by the browser extension via chrome.scripting.executeScript
window._nikkeExtImport = function (data) {
    _applyScraperImport(data, { silent: true });
};

// Fallback: extension wrote to localStorage and fired this event
window.addEventListener("_nikke_ext_pending", () => {
    try {
        const raw = localStorage.getItem("_nikke_ext_pending");
        if (!raw) return;
        localStorage.removeItem("_nikke_ext_pending");
        _applyScraperImport(JSON.parse(raw), { silent: true });
    } catch (_) {}
});

function _showExtImportToast(msg, warn) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    // Amber warning palette when something needs the user's attention
    // (e.g. Nikkes imported that aren't in the local database), green otherwise.
    const palette = warn
        ? { bg: "#2e1e05", border: "#92610a", color: "#fbbf24" }
        : { bg: "#052e16", border: "#166534", color: "#4ade80" };
    toast.style.cssText = [
        "position:fixed",
        "bottom:20px",
        "right:20px",
        "z-index:9999",
        `background:${palette.bg}`,
        `border:1px solid ${palette.border}`,
        `color:${palette.color}`,
        "padding:12px 18px",
        "border-radius:8px",
        "font-size:15px",
        "box-shadow:0 4px 12px rgba(0,0,0,.5)",
        "pointer-events:none",
        "opacity:1",
        "transition:opacity .5s",
    ].join(";");
    document.body.appendChild(toast);
    setTimeout(
        () => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 500);
        },
        warn ? 7000 : 4000,
    );
}
