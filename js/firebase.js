// ============================================================
//  FIREBASE — Auth & Cloud Sync
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyB6-sBTm8y6p6gWrwrTl32Xg-P-17dHMk4",
    authDomain: "nikke-overload-gear-manager.firebaseapp.com",
    projectId: "nikke-overload-gear-manager",
    storageBucket: "nikke-overload-gear-manager.firebasestorage.app",
    messagingSenderId: "600898359371",
    appId: "1:600898359371:web:f14284dd7404baabf7bdce",
    measurementId: "G-H4RGX62XH0",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence so Firestore works without connection
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

let currentUser = null;
let _wasSignedIn = false; // tracks whether user was signed in this session (to detect sign-out vs cold load)
let _saveTimeout = null;
const DEBOUNCE_MS = 1500; // debounce cloud saves

function setSyncStatus(status, msg) {
    // Sync indicator hidden for now
    return;
}

// Persist state that should be saved (strip transient UI fields)
function getSerializableState() {
    const s = JSON.parse(JSON.stringify(state));
    // Remove transient fields that shouldn't sync
    delete s.selGear;
    delete s.selPrio;
    delete s._localUpdatedAt;
    return s;
}

// Flag set true ONLY when user explicitly clears all data via clearAllData()
let _intentionalWipe = false;

// Save to Firestore (debounced)
function saveToCloud() {
    if (!currentUser) return;
    // Guard: never push empty state to cloud unless user explicitly wiped
    if (state.nikkes.length === 0 && !_intentionalWipe) return;
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(async () => {
        try {
            setSyncStatus("saving", "☁ saving…");
            const data = getSerializableState();
            data._updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("users").doc(currentUser.uid).set(data);
            setSyncStatus("saved", "☁ saved");
            setTimeout(() => setSyncStatus("saved", "☁ online"), 2000);
        } catch (e) {
            console.error("Cloud save failed:", e);
            setSyncStatus("error", "☁ error");
        }
        _intentionalWipe = false; // reset after use
    }, DEBOUNCE_MS);
}

// Load from Firestore
async function loadFromCloud() {
    if (!currentUser) return null;
    try {
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if (doc.exists) return doc.data();
    } catch (e) {
        console.error("Cloud load failed:", e);
    }
    return null;
}

// Upload current localStorage data to cloud (first sign-in merge)
async function uploadLocalToCloud() {
    if (!currentUser) return;
    // Guard: never push empty state to cloud
    if (state.nikkes.length === 0) return;
    try {
        const data = getSerializableState();
        data._updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("users").doc(currentUser.uid).set(data);
        setSyncStatus("saved", "☁ synced");
        setTimeout(() => setSyncStatus("saved", "☁ online"), 2000);
    } catch (e) {
        console.error("Upload failed:", e);
    }
}

// Auth state change handler.
// NOTE: this callback calls render(), which is defined in app.js — a script that
// loads *after* this file. Firebase can restore a persisted session and fire this
// before app.js has executed, which throws "render is not defined". So we define
// the handler here but defer registering it until DOMContentLoaded (see below),
// by which point every script — including app.js's initial load()/render() — has run.
async function onAuthChanged(user) {
    const wasSignedIn = _wasSignedIn;
    currentUser = user;
    _wasSignedIn = !!user;
    updateAuthUI();
    if (user) {
        // User signed in — always prefer cloud data
        const cloudData = await loadFromCloud();
        if (cloudData && cloudData.nikkes && cloudData.nikkes.length > 0) {
            if (state.nikkes.length > 0 && cloudData.nikkes.length !== state.nikkes.length) {
                // Both have data with different counts — ask user
                const useCloud = confirm(
                    `Found cloud data (${cloudData.nikkes.length} Nikkes) and local data (${state.nikkes.length} Nikkes).\n\n` +
                        `OK = Use cloud data\nCancel = Keep local data (will overwrite cloud)`,
                );
                if (useCloud) {
                    Object.assign(state, cloudData);
                    delete state._updatedAt;
                    migrateState();
                    {
                        const _lastG = localStorage.getItem("nikke_selGear");
                        const _sorted = sortNikkesBySidebar(state.nikkes);
                        state.selGear =
                            _lastG && state.nikkes.find((n) => n.id === _lastG)
                                ? _lastG
                                : _sorted.length
                                  ? _sorted[0].id
                                  : null;
                    }
                    save();
                    render();
                } else {
                    await uploadLocalToCloud();
                }
            } else if (state.nikkes.length === 0) {
                // No local data — use cloud (this is the normal post-sign-out re-sign-in path)
                Object.assign(state, cloudData);
                delete state._updatedAt;
                migrateState();
                {
                    const _lastG = localStorage.getItem("nikke_selGear");
                    const _sorted = sortNikkesBySidebar(state.nikkes);
                    state.selGear =
                        _lastG && state.nikkes.find((n) => n.id === _lastG)
                            ? _lastG
                            : _sorted.length
                              ? _sorted[0].id
                              : null;
                }
                save();
                render();
            } else {
                // Same nikke count — compare timestamps to decide which is newer
                const cloudTime =
                    cloudData._updatedAt && cloudData._updatedAt.toMillis
                        ? cloudData._updatedAt.toMillis()
                        : cloudData._updatedAt && cloudData._updatedAt.seconds
                          ? cloudData._updatedAt.seconds * 1000
                          : 0;
                const localTime = state._localUpdatedAt || 0;
                if (cloudTime > localTime) {
                    // Cloud is newer — use cloud data
                    Object.assign(state, cloudData);
                    delete state._updatedAt;
                    migrateState();
                    {
                        const _lastG = localStorage.getItem("nikke_selGear");
                        const _sorted = sortNikkesBySidebar(state.nikkes);
                        state.selGear =
                            _lastG && state.nikkes.find((n) => n.id === _lastG)
                                ? _lastG
                                : _sorted.length
                                  ? _sorted[0].id
                                  : null;
                    }
                    save();
                    render();
                } else {
                    // Local is newer or same — upload local to cloud
                    await uploadLocalToCloud();
                }
            }
        } else if (state.nikkes.length > 0) {
            // Cloud empty but local has data — upload
            await uploadLocalToCloud();
        }
        setSyncStatus("saved", "☁ online");
    } else {
        // User signed out — only wipe local data if this is an actual sign-out
        // (transition from signed-in to signed-out). On a cold page load where
        // no user was ever present, keep localStorage intact so restored data survives.
        if (wasSignedIn) {
            state = {
                nikkes: [],
                selGear: null,
                selPrio: null,
                elementalBoss: true,
                rankSort: "efficiency",
                rankSortAsc: false,
                skillTarget: "rec",
                gearElementFilter: "",
                gearSidebarSort: "power",
                gearSidebarSortDir: "desc",
                cubeLevels: {},
                teamRaids: [],
                selTeamRaid: null,
                teamRaidView: "teams",
                teamRaidGap: null,
            };
            try {
                localStorage.removeItem("nikke_v8");
            } catch (e) {}
            render();
        }
        setSyncStatus("offline", "");
    }
}

// Defer registration until the DOM is ready so app.js (which defines render) has
// loaded. Handle the already-loaded case too, in case this ever runs after DOMContentLoaded.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => auth.onAuthStateChanged(onAuthChanged));
} else {
    auth.onAuthStateChanged(onAuthChanged);
}

function updateAuthUI() {
    const btn = document.getElementById("auth-btn");
    const mydataBtn = document.getElementById("mydata-btn");
    if (!btn) return;
    if (currentUser) {
        const photo = currentUser.photoURL
            ? `<img class="user-avatar" src="${currentUser.photoURL}" alt="" referrerpolicy="no-referrer" onerror="this.nextSibling.textContent='☁ Sign Out'">`
            : "☁ ";
        btn.innerHTML = `${photo}Sign Out`;
        btn.classList.add("signed-in");
    } else {
        btn.innerHTML = "☁ Sign In";
        btn.classList.remove("signed-in");
    }
}

async function handleAuth() {
    if (currentUser) {
        if (
            confirm(
                "Sign out? Local data will be cleared.\nYour data is safely stored in the cloud and will reload when you sign back in.",
            )
        ) {
            await auth.signOut();
        }
    } else {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (e) {
            if (e.code !== "auth/popup-closed-by-user") {
                alert("Sign-in failed: " + e.message);
            }
        }
    }
}

// Returns display string for a nikke's burst(s): "All", "III", "II", or "I"
function burstDisplay(n) {
    const count = (n.burst1 ? 1 : 0) + (n.burst2 ? 1 : 0) + (n.burst3 ? 1 : 0);
    if (count >= 3) return "All";
    if (n.burst3) return "III";
    if (n.burst2) return "II";
    if (n.burst1) return "I";
    return "";
}

function save() {
    state._localUpdatedAt = Date.now();
    try {
        localStorage.setItem("nikke_v8", JSON.stringify(state));
    } catch (e) {}
    saveToCloud(); // sync to Firestore if signed in
}

function load() {
    try {
        const d = localStorage.getItem("nikke_v8");
        if (d) state = JSON.parse(d);
    } catch (e) {}
    migrateState();
    // Restore last selected Nikke if still valid, otherwise pick first in sorted display list
    const lastGear = localStorage.getItem("nikke_selGear");
    if (lastGear && state.nikkes.find((n) => n.id === lastGear)) {
        state.selGear = lastGear;
    } else {
        const sorted = sortNikkesBySidebar(state.nikkes);
        state.selGear = sorted.length ? sorted[0].id : null;
    }
    const lastPrio = localStorage.getItem("nikke_selPrio");
    if (lastPrio && state.nikkes.find((n) => n.id === lastPrio)) {
        state.selPrio = lastPrio;
    } else {
        const sorted = sortNikkesBySidebar(state.nikkes);
        state.selPrio = sorted.length ? sorted[0].id : null;
    }
    // Teams tab: default to latest team-raid, collapse any expanded gap
    state.selTeamRaid = state.teamRaids.length ? state.teamRaids[state.teamRaids.length - 1].id : null;
    state.teamRaidGap = null;
    // Save to localStorage only (auth listener handles cloud sync)
    try {
        localStorage.setItem("nikke_v8", JSON.stringify(state));
    } catch (e) {}
}

// Migrate/normalize state shape (works on both local and cloud data)
function migrateState() {
    if (!state.nikkes) state.nikkes = [];
    if (!state.cubeLevels) state.cubeLevels = {};
    state.elementalBoss = true;
    if (state.gearElementFilter === undefined) state.gearElementFilter = "";
    if (state.gearBurstFilter === undefined) state.gearBurstFilter = "";
    if (state.gearSidebarSort === undefined) state.gearSidebarSort = "power";
    if (state.gearSidebarSortDir === undefined) state.gearSidebarSortDir = "desc";
    if (state.overviewElementFilter === undefined) state.overviewElementFilter = "";
    if (!state.teamRaids) state.teamRaids = [];
    // Backfill roster mode/teamCount: pre-mode rosters were all 5-team Solo Raids.
    state.teamRaids.forEach((r) => {
        if (!r.mode) r.mode = "solo";
        if (!r.teamCount || r.teamCount < 1) {
            r.teamCount = r.mode === "campaign" ? 1 : r.mode === "union" ? 3 : 5;
        }
    });
    if (state.selTeamRaid === undefined) state.selTeamRaid = null;
    if (state.teamRaidView === undefined) state.teamRaidView = "teams";
    if (state.teamRaidGap === undefined) state.teamRaidGap = null;
    if (state.rankSortAsc === undefined) state.rankSortAsc = false;
    if (state.skillTarget === undefined) state.skillTarget = "rec";
    // Migrate old slot names (Chest→Torso, Gloves→Arms, Boots→Legs)
    const SLOT_RENAMES = { Chest: "Torso", Gloves: "Arms", Boots: "Legs" };
    state.nikkes.forEach((n) => {
        if (n.gear) {
            for (const [oldName, newName] of Object.entries(SLOT_RENAMES)) {
                if (n.gear[oldName] && !n.gear[newName]) {
                    n.gear[newName] = n.gear[oldName];
                    delete n.gear[oldName];
                }
            }
        }
    });

    state.nikkes.forEach((n) => {
        if (!n.id) n.id = "n" + Date.now() + Math.floor(Math.random() * 1000000);
        n.id = String(n.id).replace(".", "");
        if (!n.name) n.name = "Unknown";
        if (!n.element) {
            const dbEntry = NIKKE_DATABASE.find((e) => e.name === n.name);
            n.element = dbEntry ? dbEntry.element : "";
        }
        if (n.burst1 === undefined) {
            const dbEntry = NIKKE_DATABASE.find((e) => e.name === n.name);
            n.burst1 = dbEntry ? dbEntry.burst1 || false : false;
            n.burst2 = dbEntry ? dbEntry.burst2 || false : false;
            n.burst3 = dbEntry ? dbEntry.burst3 || false : true;
        }
        if (!n.priorities) n.priorities = dbOverloadToPriorities(n.name);
        if (!Array.isArray(n.priorities)) n.priorities = [];
        n.priorities.forEach((p) => {
            if (!p.targetTier) p.targetTier = 11;
            if (!p.count) p.count = 1;
        });
        if (!n.gear || typeof n.gear !== 'object') n.gear = {};
        SLOTS.forEach((s) => {
            if (!n.gear[s])
                n.gear[s] = {
                    lv: 0,
                    tier: 0,
                    lines: [
                        { stat: "", val: "", locked: false },
                        { stat: "", val: "", locked: false },
                        { stat: "", val: "", locked: false },
                    ],
                };
            n.gear[s].lines.forEach((l) => {
                if (l.locked === undefined) l.locked = false;
            });
        });
    });

    // Migrate legacy stat names to the current short canonical forms so old
    // cloud/backup data keeps matching after the stat-name rename.
    // (Elemental Dmg → Ele Dmg, Critical Rate → Crit Rate, Critical Dmg →
    //  Crit Dmg, Charge Speed → Charge Spd; long "Damage" variants included.)
    const STAT_NAME_RENAME = {
        "Elemental Damage": "Ele Dmg",
        "Elemental Dmg": "Ele Dmg",
        "Critical Rate": "Crit Rate",
        "Critical Damage": "Crit Dmg",
        "Critical Dmg": "Crit Dmg",
        "Charge Speed": "Charge Spd",
    };
    const renameStat = (s) => (s && STAT_NAME_RENAME[s]) || s;
    state.nikkes.forEach((n) => {
        if (n.gear) {
            SLOTS.forEach((s) => {
                if (n.gear[s] && Array.isArray(n.gear[s].lines)) {
                    n.gear[s].lines.forEach((l) => {
                        if (l.stat) l.stat = renameStat(l.stat);
                    });
                }
            });
        }
        if (Array.isArray(n.priorities)) {
            n.priorities.forEach((p) => {
                if (p.line) p.line = renameStat(p.line);
            });
        }
    });
    // Migrate custom weight keys too, if the user customised any.
    if (state.customWeights) {
        const renameKeys = (obj) => {
            if (!obj || typeof obj !== "object") return;
            for (const [oldK, newK] of Object.entries(STAT_NAME_RENAME)) {
                if (obj[oldK] !== undefined && obj[newK] === undefined) {
                    obj[newK] = obj[oldK];
                    delete obj[oldK];
                }
            }
        };
        renameKeys(state.customWeights.base);
        if (state.customWeights.weapon) {
            Object.values(state.customWeights.weapon).forEach(renameKeys);
        }
    }

    state.nikkes.forEach((n) => {
        // Leave unrecognized (not-in-database) Nikkes' weapon genuinely unknown
        // rather than backfilling a guessed "AR" default.
        if (!n.weapon && !n.unrecognized) {
            n.weapon =
                (state.customWeapons && state.customWeapons[n.name]) ||
                (NIKKE_DB_MAP.get(n.name) && NIKKE_DB_MAP.get(n.name).weapon) ||
                "AR";
        }
    });
}

// ── Backup / Restore ─────────────────────────────────────────
function exportData() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nikke_gear_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported.nikkes || !Array.isArray(imported.nikkes)) {
                alert("Invalid backup file — missing nikkes array.");
                return;
            }
            if (
                !confirm(
                    `This will replace your current data (${state.nikkes.length} Nikke${state.nikkes.length !== 1 ? "s" : ""}) with the backup data (${imported.nikkes.length} Nikke${imported.nikkes.length !== 1 ? "s" : ""}). Continue?`,
                )
            )
                return;
            state = imported;
            migrateState();
            const _sortedAfterImport = sortNikkesBySidebar(state.nikkes);
            state.selGear = _sortedAfterImport.length ? _sortedAfterImport[0].id : null;
            save();
            render();
        } catch (err) {
            alert("Failed to parse file: " + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ""; // reset so same file can be re-restored
}

// ── Scraper Import ───────────────────────────────────────────
// Maps scraper JSON format (keyed by game ID) into the app's internal format.
// Scraper stat names differ from the app's — this handles the translation.

// Core import logic, callable from both file picker and extension push.
// opts.silent = true skips the confirm dialog and shows a toast instead of alert.
function _applyScraperImport(scraperData, opts) {
    const silent = opts && opts.silent;

    if (typeof scraperData !== "object" || Array.isArray(scraperData)) {
        if (!silent) alert("Invalid scraper file — expected an object keyed by Nikke ID.");
        return;
    }

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
        const lower = scraperName.toLowerCase();
        const ci = NIKKE_DATABASE.find((n) => n.name.toLowerCase() === lower);
        if (ci) return ci.name;
        return scraperName;
    }

    const scraperEntries = Object.values(scraperData);
    const withGear = scraperEntries.filter(
        (entry) => entry.Helmet || entry.Chest || entry.Gloves || entry["Combat Boots"],
    );

    if (!silent) {
        const mode = confirm(
            `Scraper file contains ${scraperEntries.length} Nikke(s), ${withGear.length} with gear data.\n\n` +
                `OK = Import (replaces all Nikke data)\nCancel = abort import`,
        );
        if (!mode) return;
    }

    // Build a map of old nikke names → IDs so Raid/Team references survive
    const oldIdByName = {};
    state.nikkes.forEach((n) => { if (n.name && n.id) oldIdByName[n.name] = n.id; });

    // Wipe nikkes array — scraper is source of truth for Nikke data
    const freshNikkes = [];
    let added = 0,
        unrecognized = 0;
    const unrecognizedNames = [];

    for (const [gameId, entry] of Object.entries(scraperData)) {
        const resolvedName = resolveNikkeName(entry.name, gameId);
        const dbEntry = NIKKE_DATABASE.find((n) => n.name === resolvedName);
        const hasGear = entry.Helmet || entry.Chest || entry.Gloves || entry["Combat Boots"];

        const nikke = mkNikke(
            resolvedName,
            dbEntry ? dbEntry.burst1 : false,
            dbEntry ? dbEntry.burst2 : false,
            dbEntry ? dbEntry.burst3 : false,
            dbEntry ? dbEntry.element : "",
            dbEntry ? dbEntry.weapon : "",
        );

        // Preserve the old ID so Raid/Team entries still reference this nikke
        if (oldIdByName[resolvedName]) {
            nikke.id = oldIdByName[resolvedName];
        }

        if (!dbEntry) {
            nikke.unrecognized = true;
            nikke.weapon = "";
            unrecognized++;
            unrecognizedNames.push(resolvedName);
        }

        nikke.cube = entry.cube
            ? {
                  tid: entry.cube.tid,
                  name: HARMONY_CUBES[entry.cube.tid] ?? null,
              }
            : null;
        if (entry.cube && entry.cube.lv != null) {
            state.cubeLevels[entry.cube.tid] = entry.cube.lv;
        }
        nikke.doll = entry.doll
            ? {
                  tid: entry.doll.tid,
                  lv: entry.doll.lv ?? 0,
                  name: COLLECTION_DOLLS.find((d) => d.id === entry.doll.tid)?.name ?? null,
              }
            : null;
        if (entry.power != null) nikke.power = entry.power;
        if (entry.bond != null) nikke.bond = entry.bond;
        if (entry.limitBreak != null) nikke.limitBreak = entry.limitBreak;
        if (entry.cores != null) nikke.cores = entry.cores;
        if (entry.skill1 != null) nikke.skill1 = entry.skill1;
        if (entry.skill2 != null) nikke.skill2 = entry.skill2;
        if (entry.ultiSkill != null) nikke.skill3 = entry.ultiSkill;

        if (hasGear) {
            for (const [scraperSlot, appSlot] of Object.entries(SLOT_MAP)) {
                const scraperSlotData = entry[scraperSlot];
                if (!scraperSlotData) continue;
                const scraperLines = Array.isArray(scraperSlotData) ? scraperSlotData : scraperSlotData.lines;
                if (!Array.isArray(scraperLines)) continue;

                if (!Array.isArray(scraperSlotData)) {
                    nikke.gear[appSlot].lv = scraperSlotData.lv ?? 0;
                    nikke.gear[appSlot].tier = scraperSlotData.tier ?? 0;
                }

                for (let i = 0; i < 3; i++) {
                    const scraperLine = scraperLines[i];
                    if (!scraperLine) {
                        nikke.gear[appSlot].lines[i] = { stat: "", val: "", locked: false };
                    } else {
                        const mappedStat = STAT_MAP[scraperLine.stat] || scraperLine.stat;
                        let rawVal = scraperLine.value || "";
                        if (rawVal) {
                            const num = parseFloat(String(rawVal).replace("%", ""));
                            if (!isNaN(num)) rawVal = num.toFixed(2);
                        }
                        nikke.gear[appSlot].lines[i] = {
                            stat: mappedStat,
                            val: rawVal,
                            locked: false,
                        };
                    }
                }
            }
        }

        freshNikkes.push(nikke);
        added++;
    }

    // Replace nikkes array entirely — clean slate from scraper
    state.nikkes = freshNikkes;

    // Prune Team entries that reference nikkes no longer in the roster
    const validIds = new Set(state.nikkes.map((n) => n.id));
    if (state.teamRaids) {
        state.teamRaids.forEach((r) => {
            r.entries = (r.entries || []).filter((e) => validIds.has(e.nikkeId));
        });
    }

    if (!state.selGear && state.nikkes.length) state.selGear = sortNikkesBySidebar(state.nikkes)[0].id;
    if (!state.selPrio && state.nikkes.length) state.selPrio = sortNikkesBySidebar(state.nikkes)[0].id;

    save();
    render();

    let summary = `${added} Nikke(s) imported`;
    if (unrecognized) summary += ` · ${unrecognized} not in database`;
    if (silent) {
        _showExtImportToast("Extension import complete — " + summary, unrecognized > 0);
    } else {
        let msg = `Import complete!\n\n• ${added} Nikke(s) imported (full replace)`;
        if (unrecognized) {
            msg +=
                `\n• ${unrecognized} not in database (${unrecognizedNames.join(", ")})` +
                `\n\nBurst, element and weapon were left unknown — ` +
                `edit them in the Roster to fill them in.`;
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

function mkNikke(name, burst1, burst2, burst3, element, weapon) {
    const gear = {};
    SLOTS.forEach((s) => {
        gear[s] = {
            lv: 0,
            tier: 0,
            lines: [
                { stat: "", val: "", locked: false },
                { stat: "", val: "", locked: false },
                { stat: "", val: "", locked: false },
            ],
        };
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

function loadDbPriorities(nid) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    n.priorities = dbOverloadToPriorities(n.name);
    save();
    renderGear();
    renderOverview();
}

function loadAllDbPriorities() {
    if (!confirm("This will overwrite priorities for all Nikkes that have database recommendations. Continue?")) return;
    let count = 0;
    for (const n of state.nikkes) {
        const prios = dbOverloadToPriorities(n.name);
        if (prios.length > 0) {
            n.priorities = prios;
            count++;
        }
    }
    save();
    renderGear();
    renderOverview();
    alert(`Loaded priorities for ${count} Nikke(s) from database.`);
}
