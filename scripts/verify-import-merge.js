/**
 * IMPORT MERGE VERIFICATION SCRIPT
 *
 * Exercises mergeScraperData() against fixtures covering every rule in
 * docs/superpowers/specs/2026-07-28-scraper-import-merge-design.md
 *
 * Usage: node scripts/verify-import-merge.js
 * Exits 0 if all cases pass, 1 otherwise.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load the app's globals into one shared VM context ────────
// knowledge/nikke-database.js and js/scraper-import.js are plain <script>
// files. Run them in the same context so top-level `const` from the first
// is visible to the second, exactly as it is in the browser.
// js/scraper-import.js registers its extension entry points on `window` at load
// time. Only mergeScraperData() is under test here — it touches none of this —
// so a minimal stub is enough to let the file evaluate.
const root = path.join(__dirname, "..");
const ctx = { window: { addEventListener() {} } };
vm.createContext(ctx);

function loadScript(relPath, exportNames) {
    const src = fs.readFileSync(path.join(root, relPath), "utf8");
    const exports = exportNames.map((n) => `this.${n} = ${n};`).join("\n");
    vm.runInContext(src + "\n" + exports, ctx, { filename: relPath });
}

loadScript("knowledge/nikke-database.js", [
    "SLOTS",
    "NIKKE_DATABASE",
    "NIKKE_DB_MAP",
    "HARMONY_CUBES",
    "COLLECTION_DOLLS",
]);
loadScript("js/scraper-import.js", ["mergeScraperData", "mkNikke", "dbOverloadToPriorities"]);

const { mergeScraperData, mkNikke, dbOverloadToPriorities } = ctx;

// ── Tiny assertion harness ───────────────────────────────────
let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  PASS  ${name}`);
    } catch (e) {
        failures.push({ name, message: e.message });
        console.log(`  FAIL  ${name}\n        ${e.message}`);
    }
}

function eq(actual, expected, what) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`);
}

function truthy(value, what) {
    if (!value) throw new Error(`${what}: expected truthy, got ${JSON.stringify(value)}`);
}

// ── Fixture builders ─────────────────────────────────────────
// "Alice" is a real NIKKE_DATABASE entry (id 191, Fire, SR, has overload data).
const ALICE_ID = "191";

function scrapeEntry(overrides) {
    return Object.assign(
        {
            name: "Alice",
            power: 100000,
            Helmet: { lv: 5, tier: 3, lines: [{ stat: "ATK", value: "9.00" }, null, null] },
        },
        overrides,
    );
}

function existingAlice(overrides) {
    const n = mkNikke("Alice", false, false, true, "Fire", "SR");
    return Object.assign(n, overrides);
}

function prevState(nikkes, savedPriorities) {
    return { nikkes: nikkes || [], savedPriorities: savedPriorities || {}, cubeLevels: {} };
}

function blankLineJs() {
    return { stat: "", val: "", locked: false };
}

function blankSlotJs() {
    return { lv: 0, tier: 0, lines: [blankLineJs(), blankLineJs(), blankLineJs()] };
}

// ── Cases ────────────────────────────────────────────────────
console.log("\nImport merge verification\n");

check("1. custom priorities survive an import that changes gear", () => {
    const custom = [{ line: "Crit Dmg", tier: "Ideal", count: 3, targetTier: 10 }];
    const alice = existingAlice({ priorities: custom });
    const out = mergeScraperData(prevState([alice]), { [ALICE_ID]: scrapeEntry() });

    eq(out.nikkes.length, 1, "roster size");
    eq(out.nikkes[0].priorities, custom, "priorities");
    eq(out.stats.updated, 1, "stats.updated");
    eq(out.stats.added, 0, "stats.added");
});

check("2. lock survives when the scraped stat matches", () => {
    const alice = existingAlice();
    alice.gear.Helmet.lines[0] = { stat: "ATK", val: "8.00", locked: true };
    const out = mergeScraperData(prevState([alice]), {
        [ALICE_ID]: scrapeEntry({
            Helmet: { lv: 5, tier: 3, lines: [{ stat: "ATK", value: "9.00" }, null, null] },
        }),
    });
    const line = out.nikkes[0].gear.Helmet.lines[0];
    eq(line.stat, "ATK", "stat");
    eq(line.val, "9.00", "value takes the scraped number");
    eq(line.locked, true, "lock survives");
});

check("3. lock clears when the scraped stat differs", () => {
    const alice = existingAlice();
    alice.gear.Helmet.lines[0] = { stat: "ATK", val: "8.00", locked: true };
    const out = mergeScraperData(prevState([alice]), {
        [ALICE_ID]: scrapeEntry({
            Helmet: { lv: 5, tier: 3, lines: [{ stat: "Crit Rate", value: "4.00" }, null, null] },
        }),
    });
    const line = out.nikkes[0].gear.Helmet.lines[0];
    eq(line.stat, "Crit Rate", "stat replaced");
    eq(line.locked, false, "stale lock cleared");
});

check("4. a slot absent from the entry resets to empty", () => {
    const alice = existingAlice();
    alice.gear.Torso = {
        lv: 9,
        tier: 4,
        lines: [{ stat: "ATK", val: "7.00", locked: true }, blankLineJs(), blankLineJs()],
    };
    const out = mergeScraperData(prevState([alice]), { [ALICE_ID]: scrapeEntry() });
    eq(out.nikkes[0].gear.Torso, blankSlotJs(), "Torso cleared");
});

check("5. a blank line inside a read slot clears stat, val and lock", () => {
    const alice = existingAlice();
    alice.gear.Helmet.lines[1] = { stat: "Crit Dmg", val: "5.00", locked: true };
    const out = mergeScraperData(prevState([alice]), {
        [ALICE_ID]: scrapeEntry({
            Helmet: { lv: 5, tier: 3, lines: [{ stat: "ATK", value: "9.00" }, null, null] },
        }),
    });
    eq(out.nikkes[0].gear.Helmet.lines[1], blankLineJs(), "line 1 cleared");
});

check("5b. gear lv and tier come from the scrape", () => {
    const alice = existingAlice();
    const out = mergeScraperData(prevState([alice]), { [ALICE_ID]: scrapeEntry() });
    eq(out.nikkes[0].gear.Helmet.lv, 5, "lv");
    eq(out.nikkes[0].gear.Helmet.tier, 3, "tier");
    eq(out.nikkes[0].power, 100000, "power");
});

check("6. a Nikke absent from the scrape is removed and its custom priorities stashed", () => {
    const custom = [{ line: "Crit Dmg", tier: "Ideal", count: 3, targetTier: 10 }];
    const alice = existingAlice({ priorities: custom });
    const out = mergeScraperData(prevState([alice]), {}); // empty scrape

    eq(out.nikkes.length, 0, "roster emptied");
    eq(out.stats.removed, 1, "stats.removed");
    eq(out.savedPriorities["Alice"], custom, "priorities stashed under the name");
    eq(out.stats.prioritiesStashed, 1, "stats.prioritiesStashed");
});

check("7. priorities matching the database default are not stashed", () => {
    const alice = existingAlice({ priorities: dbOverloadToPriorities("Alice") });
    const out = mergeScraperData(prevState([alice]), {});

    eq(out.stats.removed, 1, "stats.removed");
    eq(out.savedPriorities["Alice"], undefined, "nothing stashed");
    eq(out.stats.prioritiesStashed, 0, "stats.prioritiesStashed");
});

check("8. a stashed Nikke reappearing gets its priorities back and clears the stash", () => {
    const custom = [{ line: "Crit Dmg", tier: "Ideal", count: 3, targetTier: 10 }];
    const out = mergeScraperData(prevState([], { Alice: custom }), { [ALICE_ID]: scrapeEntry() });

    eq(out.nikkes.length, 1, "roster size");
    eq(out.nikkes[0].priorities, custom, "priorities restored");
    eq(out.savedPriorities["Alice"], undefined, "stash entry consumed");
    eq(out.stats.prioritiesRestored, 1, "stats.prioritiesRestored");
    eq(out.stats.added, 1, "stats.added");
});

check("9. a scrape entry with no database match imports as unrecognized", () => {
    const out = mergeScraperData(prevState([]), {
        "999999": { name: "Totally New Nikke", power: 1000 },
    });
    const rec = out.nikkes[0];
    eq(rec.unrecognized, true, "flagged");
    eq(rec.weapon, "", "weapon left blank");
    eq(rec.element, "", "element left blank");
    eq(out.stats.unrecognized, 1, "stats.unrecognized");
    eq(out.stats.unrecognizedNames, ["Totally New Nikke"], "stats.unrecognizedNames");
});

check("10. database catch-up fills metadata and clears the flag", () => {
    const stale = existingAlice({ unrecognized: true, weapon: "", element: "" });
    const out = mergeScraperData(prevState([stale]), { [ALICE_ID]: scrapeEntry() });
    const rec = out.nikkes[0];
    const db = ctx.NIKKE_DB_MAP.get("Alice");

    eq(rec.unrecognized, undefined, "flag cleared");
    eq(rec.element, db.element, "element from database");
    eq(rec.weapon, db.weapon, "weapon from database");
    eq(rec.burst3, !!db.burst3, "burst from database");
});

check("11. first import stamps gameId on a record matched by name", () => {
    const alice = existingAlice();
    truthy(alice.gameId === undefined, "fixture starts with no gameId");
    const out = mergeScraperData(prevState([alice]), { [ALICE_ID]: scrapeEntry() });

    eq(out.nikkes[0].gameId, ALICE_ID, "gameId stamped");
    eq(out.stats.added, 0, "matched, not added");
    eq(out.stats.updated, 1, "stats.updated");
});

check("12. two entries resolving to the same record: first wins", () => {
    const alice = existingAlice();
    const out = mergeScraperData(prevState([alice]), {
        [ALICE_ID]: scrapeEntry({ power: 111 }),
        "888888": scrapeEntry({ name: "Alice", power: 222 }),
    });

    eq(out.nikkes.length, 1, "no duplicate record");
    eq(out.nikkes[0].power, 111, "first entry won");
    eq(out.stats.duplicatesSkipped, 1, "stats.duplicatesSkipped");
});

check("13. mergeScraperData does not mutate its prev argument", () => {
    const custom = [{ line: "Crit Dmg", tier: "Ideal", count: 3, targetTier: 10 }];
    const alice = existingAlice({ priorities: custom });
    const prev = prevState([alice]);
    const before = JSON.stringify(prev);
    mergeScraperData(prev, { [ALICE_ID]: scrapeEntry() });
    eq(JSON.stringify(prev), before, "prev unchanged");
});

// ── Report ───────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length ? 1 : 0);
