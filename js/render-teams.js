// ============================================================
//  RENDER: TEAMS
//  Data: state.teamRaids
//  Reuses shared globals: getVerdict, bondMaxFor, NIKKE_DB_MAP,
//  COLLECTION_DOLLS, TREASURE_NAMES, SLOTS, elemIcon, nikkeIcon,
//  burstDisplay, goToGearNikke, save.
// ============================================================

// Mode metadata: default team count + whether the count is fixed (no add/remove).
const TEAM_MODES = {
    solo: { label: "Solo Raid", teams: 5, fixed: true },
    union: { label: "Union Raid", teams: 3, fixed: true },
    tribe: { label: "Tribe Tower", teams: 1, fixed: false },
    campaign: { label: "Campaign", teams: 1, fixed: false },
};
function rosterTeamCount(raid) {
    if (raid.teamCount) return raid.teamCount;
    return TEAM_MODES[raid.mode] ? TEAM_MODES[raid.mode].teams : 5;
}
// Whether a roster's team count is user-adjustable (Campaign, Tribe Tower).
function isExpandableRoster(raid) {
    return !!(raid && TEAM_MODES[raid.mode] && !TEAM_MODES[raid.mode].fixed);
}

// ── Tribe Tower ──────────────────────────────────────────────
// A Tribe Tower roster is tied to one manufacturer selection ("tower"). Every
// team in the roster may only use Nikkes eligible for that tower.
const TRIBE_TOWERS = [
    { key: "Elysion", label: "Elysion" },
    { key: "Missilis", label: "Missilis" },
    { key: "Tetra", label: "Tetra" },
    { key: "PilgrimOverspec", label: "Pilgrim/Overspec" },
];
function tribeTowerLabel(key) {
    const t = TRIBE_TOWERS.find((x) => x.key === key);
    return t ? t.label : key;
}
function tribeRosterName(key) {
    return tribeTowerLabel(key) + " Tower";
}
// Eligibility: a manufacturer tower (Elysion/Missilis/Tetra) admits only Nikkes
// of that manufacturer (its overspec units already qualify). The Pilgrim/Overspec
// tower additionally admits Pilgrims and any overspec Nikke.
function nikkeEligibleForTower(nikke, tower) {
    const db = NIKKE_DB_MAP.get(nikke.name) || {};
    if (tower === "PilgrimOverspec") return db.manufacturer === "Pilgrim" || db.overspec === true;
    return db.manufacturer === tower;
}
// Selected mode in the "New Roster" create form (reset each time the form opens).
let _newRosterMode = "solo";
// Whether the roster list is collapsed. Only has a visual effect on mobile
// (≤768px), where the list renders as a centered modal popup (like the Nikkes
// tab's "Search Nikke" picker) — collapsed = popup closed. On desktop the list
// is always shown inline via CSS. Starts closed and auto-closes when a roster is
// selected so the team lanes take focus on small screens.
let _rosterListCollapsed = true;
// Whether the mobile roster sheet is animated-in (has the `.show` class). Mirrors
// the Nikkes menu's _nikkeSheetShown so re-renders while open re-apply `.show`
// without replaying the slide-up.
let _rosterSheetShown = false;
// Current roster-list search text (persisted across re-renders).
let _rosterSearch = "";
// Clear the roster list's type filter + search back to their defaults. Not
// saved — this only resets the current view.
function resetRosterFilters() {
    _rosterSearch = "";
    state.teamModeFilter = "";
}
function toggleRosterList() {
    if (_rosterListCollapsed) openRosterListPopup();
    else closeRosterListPopup();
}
// Open the mobile roster-list bottom sheet with a slide-up + backdrop fade,
// mirroring the Nikkes menu. No visible effect on desktop (list is inline).
function openRosterListPopup() {
    // Opening the popup (mobile-only) — clear the filter + search so it opens
    // fresh each time. renderTeams fully rebuilds, so the reset takes effect.
    _rosterListCollapsed = false;
    _rosterSheetShown = false; // render the sheet off-screen first, then animate in
    resetRosterFilters();
    renderTeams();
    const sb = document.querySelector("#teams .nikke-sidebar");
    if (!sb) return;
    sb.classList.remove("roster-collapsed");
    const coll = sb.querySelector(".roster-list-collapsible");
    if (coll) {
        void coll.offsetWidth; // force reflow so the slide-up transition runs
        _rosterSheetShown = true;
        coll.classList.add("show");
    }
    const tog = sb.querySelector(".roster-list-toggle");
    if (tog) tog.setAttribute("aria-expanded", "true");
    // Focus the search field for quick filtering as the sheet opens.
    const search = document.getElementById("roster-sidebar-search");
    if (search) search.focus();
}
// Explicit close for the mobile roster-list popup (backdrop tap / swipe-down /
// picking a roster). Slides the sheet down + fades the backdrop before hiding.
// No-op on desktop, where the list is always shown inline.
function closeRosterListPopup() {
    _rosterListCollapsed = true;
    _rosterSheetShown = false;
    const sb = document.querySelector("#teams .nikke-sidebar");
    if (!sb) return;
    const tog = sb.querySelector(".roster-list-toggle");
    if (tog) tog.setAttribute("aria-expanded", "false");
    const coll = sb.querySelector(".roster-list-collapsible");
    if (!coll) {
        sb.classList.add("roster-collapsed");
        return;
    }
    const panel = coll.querySelector(".nikke-list-panel");
    if (panel) {
        panel.classList.remove("dragging");
        panel.style.transform = ""; // clear any drag offset; let CSS slide it down
    }
    coll.classList.remove("show"); // triggers the slide-down + backdrop fade
    setTimeout(() => {
        // Finish hiding only if it's still meant to be closed.
        if (_rosterListCollapsed) sb.classList.add("roster-collapsed");
    }, 340);
}
// Filter the roster list by type (Solo / Union / Tribe / Campaign). Persisted in
// state and rebuilds the list, like the Nikkes tab's dropdown filters.
function setTeamModeFilter(val) {
    state.teamModeFilter = val;
    save();
    renderTeams();
}
// Filter the roster list by name (mobile popup search) — toggles item
// visibility only, mirroring the Nikkes tab's list search.
function filterRosterList() {
    const input = document.getElementById("roster-sidebar-search");
    if (!input) return;
    _rosterSearch = input.value.toLowerCase();
    const items = document.querySelectorAll("#teams .nikke-list .nikke-item");
    let anyVisible = false;
    items.forEach((el) => {
        const visible = (el.dataset.name || "").includes(_rosterSearch);
        el.style.display = visible ? "" : "none";
        if (visible) anyVisible = true;
    });
    const list = document.querySelector("#teams .nikke-list");
    if (!list) return;
    let emptyMsg = list.querySelector(".roster-list-search-empty");
    if (items.length > 0 && !anyVisible) {
        if (!emptyMsg) {
            emptyMsg = document.createElement("div");
            emptyMsg.className = "roster-list-search-empty";
            emptyMsg.style.cssText = "font-size:14px;color:#475569;padding:6px";
            emptyMsg.textContent = "No rosters matching search";
            list.appendChild(emptyMsg);
        } else {
            emptyMsg.style.display = "";
        }
    } else if (emptyMsg) {
        emptyMsg.style.display = "none";
    }
}
// Clear the "missing required field" highlight (and its self-removing listeners)
// from a New Roster form field.
function clearRosterFieldError(el) {
    if (!el) return;
    el.classList.remove("input-error");
    if (el._rosterErrClear) {
        el.removeEventListener("input", el._rosterErrClear);
        el.removeEventListener("change", el._rosterErrClear);
        el._rosterErrClear = null;
    }
}
// Flag a required New Roster field the user left blank: red highlight, focus it,
// and auto-clear the highlight as soon as they fill it in.
function flagRosterFieldError(el) {
    if (!el) return;
    el.classList.add("input-error");
    el.focus();
    if (el._rosterErrClear) {
        el.removeEventListener("input", el._rosterErrClear);
        el.removeEventListener("change", el._rosterErrClear);
    }
    const clear = () => clearRosterFieldError(el);
    el._rosterErrClear = clear;
    el.addEventListener("input", clear);
    el.addEventListener("change", clear);
}

function setNewRosterMode(mode) {
    _newRosterMode = mode;
    const wrap = document.getElementById("new-roster-mode");
    if (wrap) wrap.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    const bossRow = document.getElementById("solo-boss-row");
    if (bossRow) bossRow.style.display = mode === "solo" ? "" : "none";
    const towerRow = document.getElementById("tribe-tower-row");
    if (towerRow) towerRow.style.display = mode === "tribe" ? "" : "none";
    const nameRow = document.getElementById("new-roster-name-row");
    // Solo and Tribe Tower auto-name from their dropdowns; only Union/Campaign type a name.
    if (nameRow) nameRow.style.display = mode === "union" || mode === "campaign" ? "" : "none";
    const bossSelect = document.getElementById("solo-boss-select");
    if (bossSelect) bossSelect.value = "";
    const towerSelect = document.getElementById("tribe-tower-select");
    if (towerSelect) towerSelect.value = "";
    // Switching mode is a fresh start — drop any stale validation highlights.
    clearRosterFieldError(document.getElementById("solo-boss-select"));
    clearRosterFieldError(document.getElementById("tribe-tower-select"));
    clearRosterFieldError(document.getElementById("team-raid-name-input"));
}

function renderTeams() {
    const el = document.getElementById("teams");
    if (!el) return;
    // Roster-type filter (All / Solo / Union / Tribe / Campaign). A roster with a
    // missing/unknown mode is treated as Solo, matching its default label.
    const rosterMode = (r) => (TEAM_MODES[r.mode] ? r.mode : "solo");
    let sortedRaids = [...state.teamRaids].reverse();
    if (state.teamModeFilter) sortedRaids = sortedRaids.filter((r) => rosterMode(r) === state.teamModeFilter);
    const raidList =
        sortedRaids
            .map((r) => {
                const modeLabel = TEAM_MODES[r.mode] ? TEAM_MODES[r.mode].label : "Solo Raid";
                const dn = r.name.toLowerCase().replace(/"/g, "&quot;");
                return `<div class="nikke-item ${state.selTeamRaid === r.id ? "active" : ""}" data-name="${dn}" onclick="selTeamRaid('${r.id}')">
      <span id="roster-name-${r.id}">${r.name}</span>
      <div class="nikke-item-sub">${modeLabel}</div>
    </div>`;
            })
            .join("") ||
        `<div style="font-size:14px;color:#475569;padding:6px">${state.teamModeFilter ? "No rosters matching filter" : "No rosters created"}</div>`;
    const modeFilterOpts = Object.entries(TEAM_MODES)
        .map(
            ([key, m]) =>
                `<option value="${key}" ${state.teamModeFilter === key ? "selected" : ""}>${m.label}</option>`,
        )
        .join("");

    el.innerHTML = `<div class="two-col">
    <div class="nikke-sidebar${_rosterListCollapsed ? " roster-collapsed" : ""}">
      <button type="button" class="roster-list-toggle is-popout" onclick="toggleRosterList()" aria-haspopup="dialog" aria-expanded="${!_rosterListCollapsed}">
        <svg class="nikke-list-toggle-icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <span>Rosters</span>
        <span class="roster-list-count">${state.teamRaids.length}</span>
      </button>
      <div class="roster-list-collapsible${!_rosterListCollapsed && _rosterSheetShown ? " show" : ""}" onclick="if(event.target===this)closeRosterListPopup()">
        <div class="nikke-list-panel">
          <div class="sheet-drag-zone"><div class="sheet-drag-handle" aria-hidden="true"></div></div>
          <input id="roster-sidebar-search" class="form-input" placeholder="Search roster..." value="${_rosterSearch.replace(/"/g, "&quot;")}" oninput="filterRosterList()" style="font-size:13px;padding:4px 8px;width:100%"/>
          <div style="display:flex;flex-direction:column;gap:2px">
            <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Type</span>
            <select style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setTeamModeFilter(this.value)">
              <option value="">All</option>${modeFilterOpts}
            </select>
          </div>
          <button class="add-line-btn" onclick="showAddTeamRaidForm()" style="margin-top:12px;width:100%">+ New Roster</button>
          <div class="nikke-list">
            ${raidList}
          </div>
        </div>
      </div>
    </div>
    <div id="team-main">${state.selTeamRaid ? "" : '<div class="empty-state">← Select or create a roster</div>'}</div>
  </div>
  <!-- New Roster overlay: kept OUTSIDE .two-col so the sticky sidebar's stacking
       context doesn't trap this fixed modal beneath the main panel's cards. -->
  <div id="add-team-raid-form" class="team-slot-picker-overlay" onclick="if(event.target===this)hideAddTeamRaidForm()">
    <div class="team-slot-picker-modal" style="width:min(360px, calc(100vw - 32px));overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span class="form-panel-title" style="margin-bottom:0">New Roster</span>
        <button class="del-btn" onclick="hideAddTeamRaidForm()" style="font-size:16px">✕</button>
      </div>
      <div class="form-row" id="new-roster-name-row" style="display:none"><input class="form-input" id="team-raid-name-input" placeholder="Roster name"/></div>
      <div class="form-row" id="solo-boss-row">
        <select class="form-input" id="solo-boss-select">
          <option value="">Select boss</option>
          ${[...SOLO_RAID_BOSSES].reverse().map((b) => `<option value="${b.season}">S${b.season} · ${b.name} (${b.weakness} Weak)</option>`).join("")}
        </select>
      </div>
      <div class="form-row" id="tribe-tower-row" style="display:none">
        <select class="form-input" id="tribe-tower-select">
          <option value="">Select tower</option>
          ${TRIBE_TOWERS.map((t) => `<option value="${t.key}">${t.label}</option>`).join("")}
        </select>
      </div>
      <div class="form-row"><div class="roster-mode-toggle" id="new-roster-mode">
        <button type="button" class="active" data-mode="solo" onclick="setNewRosterMode('solo')">Solo Raid</button>
        <button type="button" data-mode="union" onclick="setNewRosterMode('union')">Union Raid</button>
        <button type="button" data-mode="tribe" onclick="setNewRosterMode('tribe')">Tribe Tower</button>
        <button type="button" data-mode="campaign" onclick="setNewRosterMode('campaign')">Campaign</button>
      </div></div>
      <div class="btn-row"><button class="btn" onclick="hideAddTeamRaidForm()" style="font-size:13px;padding:4px 10px">Cancel</button><button class="btn btn-roster-add" onclick="addTeamRaid()" style="font-size:13px;padding:4px 10px">Add</button></div>
    </div>
  </div>`;

    // Re-apply the roster search filter after a full re-render rebuilds the list.
    if (_rosterSearch) filterRosterList();

    if (state.selTeamRaid) {
        const raid = state.teamRaids.find((r) => r.id === state.selTeamRaid);
        if (raid) renderTeamRaidMain(raid);
    }
}

// ── Raid CRUD ────────────────────────────────────────────────
function selTeamRaid(id) {
    state.selTeamRaid = id;
    state.teamRaidGap = null;
    _rosterGapTeam = 1; // gap tabs default to Team 1 for the newly-picked roster
    // Mobile: slide the roster sheet closed so the picked roster's lanes show.
    closeRosterListPopup();
    // Update the active highlight in place — a full rebuild would cut the close
    // animation short (mirrors the Nikkes list's selGearNikke).
    document.querySelectorAll("#teams .nikke-list .nikke-item").forEach((elm) => {
        elm.classList.toggle("active", (elm.getAttribute("onclick") || "").includes("'" + id + "'"));
    });
    const raid = state.teamRaids.find((r) => r.id === id);
    if (raid) renderTeamRaidMain(raid);
    // Jump to the top so the picked roster's lanes start at their header.
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAddTeamRaidForm() {
    const f = document.getElementById("add-team-raid-form");
    if (!f) return;
    if (f.classList.contains("show")) {
        hideAddTeamRaidForm();
        return;
    }
    f.classList.add("show");
    setNewRosterMode("solo");
    const nameInput = document.getElementById("team-raid-name-input");
    if (nameInput) nameInput.value = "";
}

function hideAddTeamRaidForm() {
    const f = document.getElementById("add-team-raid-form");
    if (f) f.classList.remove("show");
    // drop any validation highlights left on the form's fields
    clearRosterFieldError(document.getElementById("solo-boss-select"));
    clearRosterFieldError(document.getElementById("team-raid-name-input"));
}

function addTeamRaid() {
    const mode = _newRosterMode || "solo";
    let name = "",
        bossSeason = null,
        tower = null;
    if (mode === "solo") {
        const bossSel = document.getElementById("solo-boss-select");
        if (!bossSel || !bossSel.value) {
            flagRosterFieldError(bossSel);
            return;
        }
        const season = parseInt(bossSel.value);
        const boss = SOLO_RAID_BOSSES.find((b) => b.season === season);
        if (!boss) {
            flagRosterFieldError(bossSel);
            return;
        }
        name = `S${boss.season} · ${boss.name}`;
        bossSeason = season;
    } else if (mode === "tribe") {
        const towerSel = document.getElementById("tribe-tower-select");
        if (!towerSel || !towerSel.value) {
            flagRosterFieldError(towerSel);
            return;
        }
        tower = towerSel.value;
        name = tribeRosterName(tower);
    } else {
        const nameInput = document.getElementById("team-raid-name-input");
        name = (nameInput?.value || "").trim();
        if (!name) {
            flagRosterFieldError(nameInput);
            return;
        }
    }
    const teamCount = TEAM_MODES[mode] ? TEAM_MODES[mode].teams : 5;
    const raid = { id: "tr" + Date.now(), name, mode, teamCount, entries: [], teamNames: {}, bossSeason, tower };
    state.teamRaids.push(raid);
    state.selTeamRaid = raid.id;
    _rosterListCollapsed = true; // mobile: focus the newly created roster's lanes
    save();
    renderTeams();
}

function deleteTeamRaid(id) {
    if (!confirm("Delete this raid?")) return;
    state.teamRaids = state.teamRaids.filter((r) => r.id !== id);
    if (state.selTeamRaid === id) {
        state.selTeamRaid = null;
        _rosterListCollapsed = false; // mobile: re-open the list so another can be picked
    }
    save();
    renderTeams();
}

function addRosterTeam(raidId) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!isExpandableRoster(raid)) return;
    raid.teamCount = rosterTeamCount(raid) + 1;
    save();
    // Append just the one new (empty) lane instead of re-rendering the whole
    // panel, so existing lanes' Nikke icons aren't recreated (no flicker).
    const lanesEl = document.querySelector('#team-tab-panels .roster-tab-panel[data-view="teams"] .team-lanes');
    if (!lanesEl) {
        renderTeamRaidMain(raid);
        return;
    }
    const { maxTeam, maxEntry } = _raidLaneMetrics(raid);
    // A new empty team has 0 damage, so it doesn't change any other lane's total.
    lanesEl.insertAdjacentHTML("beforeend", _buildTeamLaneHtml(raid, raid.teamCount, [], 0, maxTeam, maxEntry, true));
    // New team adds a gap-tab pill (but no gaps); refresh the hidden panels + counts.
    refreshRosterGapPanels(raid);
    updateRosterTabCounts(raid);
}

function deleteRosterTeam(raidId, teamNum) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!isExpandableRoster(raid) || teamNum <= 1) return;
    if (!confirm("Delete Team " + teamNum + "?")) return;
    const oldCount = rosterTeamCount(raid);
    // Drop this team's entries, then shift higher teams down to stay contiguous.
    raid.entries = raid.entries.filter((e) => e.team !== teamNum);
    raid.entries.forEach((e) => {
        if (e.team > teamNum) e.team -= 1;
    });
    // Shift the higher teams' names + weaknesses down the same way.
    const shiftKeys = (obj) => {
        if (!obj) return obj;
        const out = {};
        Object.keys(obj).forEach((k) => {
            const t = parseInt(k);
            if (t < teamNum) out[t] = obj[k];
            else if (t > teamNum) out[t - 1] = obj[k];
        });
        return out;
    };
    raid.teamNames = shiftKeys(raid.teamNames) || {};
    if (raid.teamWeakness) raid.teamWeakness = shiftKeys(raid.teamWeakness);
    if (raid.teamNotes) raid.teamNotes = shiftKeys(raid.teamNotes);
    raid.teamCount = oldCount - 1;
    save();

    // Remove only the deleted lane and relabel the lanes below it in place, so
    // their slot icons are reused (no reload/flicker) rather than rebuilt.
    const lanesEl = document.querySelector('#team-tab-panels .roster-tab-panel[data-view="teams"] .team-lanes');
    if (!lanesEl) {
        renderTeamRaidMain(raid);
        return;
    }
    const delEl = document.getElementById(`team-lane-${raid.id}-${teamNum}`);
    if (delEl) delEl.remove();
    // Ascending order so each renumber targets an id already vacated.
    for (let oldT = teamNum + 1; oldT <= oldCount; oldT++) _relabelTeamLane(raid, oldT, oldT - 1);
    _updateAllTeamTotals(raid); // team removal can shift the max, recolouring totals
    refreshRosterGapPanels(raid);
    updateRosterTabCounts(raid);
}

// Renumber an existing team lane's DOM (id, child ids, handlers, labels) from
// oldT to newT WITHOUT rebuilding its slot cards — the Nikke <img> nodes are
// left in place so they don't reload. Used when deleting a team shifts the lanes
// below it down by one.
function _relabelTeamLane(raid, oldT, newT) {
    const el = document.getElementById(`team-lane-${raid.id}-${oldT}`);
    if (!el) return;
    el.id = `team-lane-${raid.id}-${newT}`;
    const members = raid.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === newT);
    const ng = el.querySelector(".team-name-group");
    if (ng) {
        ng.id = `team-name-group-${raid.id}-${newT}`;
        ng.innerHTML = renderTeamNameGroupStatic(raid, newT);
    }
    const warn = el.querySelector(".team-warnings");
    if (warn) {
        warn.id = `team-warnings-${raid.id}-${newT}`;
        warn.innerHTML = _teamWarningsHtml(raid, newT, members);
    }
    const tot = el.querySelector(".team-total");
    if (tot) tot.id = `team-total-${raid.id}-${newT}`; // value/colour set by _updateAllTeamTotals
    const del = el.querySelector(".team-del-btn");
    if (del) del.setAttribute("onclick", `deleteRosterTeam('${raid.id}',${newT})`);
    // Filled slots render in member order first, then empties — reassign each
    // slot's team number and (splice-shifted) entry index without touching icons.
    el.querySelectorAll(".team-slots > .team-slot").forEach((slotEl, i) => {
        if (i < members.length) _applySlotEntryIdx(slotEl, raid.id, newT, members[i].origIdx);
        else slotEl.setAttribute("onclick", `openTeamSlotPicker('${raid.id}',${newT},${i})`);
    });
    // Relabel the per-team notes section
    const notesSection = el.querySelector(".team-notes-section");
    if (notesSection) {
        notesSection.id = `team-notes-section-${raid.id}-${newT}`;
        const notesToggle = notesSection.querySelector(".team-notes-toggle");
        if (notesToggle) notesToggle.setAttribute("onclick", `toggleTeamNotes('${raid.id}',${newT})`);
        const notesTa = notesSection.querySelector(".team-notes-textarea");
        if (notesTa) {
            notesTa.id = `team-notes-textarea-${raid.id}-${newT}`;
            notesTa.setAttribute("onblur", `saveTeamNotes('${raid.id}',${newT})`);
            notesTa.value = getTeamNotes(raid, newT);
        }
    }
}

function startEditRaidName(raidId) {
    const span = document.getElementById("raid-title-" + raidId);
    if (!span) return;
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    if (raid.mode === "solo") {
        const select = document.createElement("select");
        select.className = "team-raid-title-input";
        select.style.fontSize = "15px";
        [...SOLO_RAID_BOSSES].reverse().forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b.season;
            opt.textContent = `S${b.season} · ${b.name} (${b.weakness} Weak)`;
            opt.selected = raid.bossSeason === b.season;
            select.appendChild(opt);
        });
        select.onblur = () => commitRaidName(select, raidId);
        select.onkeydown = (e) => {
            if (e.key === "Enter") select.blur();
            if (e.key === "Escape") {
                select.dataset.cancel = "1";
                select.blur();
            }
        };
        span.replaceWith(select);
        select.focus();
    } else {
        const input = document.createElement("input");
        input.className = "team-raid-title-input";
        input.type = "text";
        input.value = raid.name;
        input.onblur = () => commitRaidName(input, raidId);
        input.onkeydown = (e) => {
            if (e.key === "Enter") input.blur();
            if (e.key === "Escape") {
                input.dataset.cancel = "1";
                input.blur();
            }
        };
        span.replaceWith(input);
        input.focus();
        input.select();
    }
}

function commitRaidName(input, raidId) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    // Swap the inline editor back to the static title span (no panel rebuild).
    const restoreTitle = () => {
        const span = document.createElement("span");
        span.className = "team-raid-title";
        span.id = "raid-title-" + raidId;
        span.textContent = raid.name;
        input.replaceWith(span);
    };
    if (input.dataset.cancel === "1") {
        restoreTitle();
        return;
    }
    const isSolo = raid.mode === "solo";
    if (isSolo) {
        const season = parseInt(input.value);
        const boss = SOLO_RAID_BOSSES.find((b) => b.season === season);
        if (boss) {
            raid.bossSeason = season;
            raid.name = `S${boss.season} · ${boss.name}`;
        }
    } else {
        const val = input.value.trim();
        if (val) raid.name = val;
    }
    save();
    restoreTitle();
    // The roster name also appears in the sidebar list.
    const sideName = document.getElementById("roster-name-" + raidId);
    if (sideName) sideName.textContent = raid.name;
    if (isSolo) {
        // A boss change alters the weakness subtitle plus every team's coverage
        // warning and readiness (Eff/Potential) — refresh those in place. Slot
        // cards, totals and dmg bars don't depend on the boss, so they're left
        // untouched (no icon flicker).
        const boss = raid.bossSeason != null ? SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason) : null;
        const subtitleEl = document.getElementById("raid-subtitle-" + raidId);
        if (subtitleEl) {
            const modeLabel = TEAM_MODES[raid.mode] ? TEAM_MODES[raid.mode].label : "Solo Raid";
            const weaknessHtml = boss ? ` · ${elemIcon(boss.weakness, 16)} ${boss.weakness} Weak` : "";
            subtitleEl.innerHTML = `${modeLabel}${weaknessHtml}`;
        }
        _raidLaneMetrics(raid).teamNums.forEach((tnum) => {
            const members = raid.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === tnum);
            const warnEl = document.getElementById(`team-warnings-${raid.id}-${tnum}`);
            if (warnEl) warnEl.innerHTML = _teamWarningsHtml(raid, tnum, members);
        });
        // A boss change re-weights each Nikke's gear Potential/Eff — refresh the
        // (hidden) Gear panel so it's current when the user opens it.
        const gearPanel = _rosterGapPanelEl("gear");
        if (gearPanel) gearPanel.innerHTML = _renderRosterTabContent(raid, "gear");
    }
}

// ── Per-team notes ───────────────────────────────────────────
function getTeamNotes(raid, teamNum) {
    return (raid.teamNotes && raid.teamNotes[teamNum]) || "";
}

function toggleTeamNotes(raidId, teamNum) {
    const section = document.getElementById(`team-notes-section-${raidId}-${teamNum}`);
    if (!section) return;
    section.classList.toggle("open");
    if (section.classList.contains("open")) {
        const ta = document.getElementById(`team-notes-textarea-${raidId}-${teamNum}`);
        if (ta) ta.focus();
    }
}

function saveTeamNotes(raidId, teamNum) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    const ta = document.getElementById(`team-notes-textarea-${raidId}-${teamNum}`);
    if (!ta) return;
    const val = ta.value.slice(0, 2000);
    if (getTeamNotes(raid, teamNum) !== val) {
        if (!raid.teamNotes) raid.teamNotes = {};
        raid.teamNotes[teamNum] = val || "";
        save();
    }
    // Update the indicator dot
    const section = document.getElementById(`team-notes-section-${raidId}-${teamNum}`);
    if (section) {
        const indicator = section.querySelector(".team-notes-indicator");
        if (val && !indicator) {
            const btn = section.querySelector(".team-notes-toggle");
            if (btn) btn.insertAdjacentHTML("beforeend", '<span class="team-notes-indicator">●</span>');
        } else if (!val && indicator) {
            indicator.remove();
        }
    }
}

// ── Main panel (header + active view) ────────────────────────
function renderTeamRaidMain(raid) {
    const area = document.getElementById("team-main");
    if (!area) return;
    const modeLabel = TEAM_MODES[raid.mode] ? TEAM_MODES[raid.mode].label : "Solo Raid";
    const boss =
        raid.mode === "solo" && raid.bossSeason != null
            ? SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason)
            : null;
    const weaknessHtml = boss ? ` · ${elemIcon(boss.weakness, 16)} ${boss.weakness} Weak` : "";
    const raidSubtitle = `<div id="raid-subtitle-${raid.id}" style="font-size:16px;color:#94a3b8;margin-top:3px;line-height:1.3;display:flex;align-items:center;gap:4px">${modeLabel}${weaknessHtml}</div>`;
    const totalDmg = raid.entries.reduce((s, e) => s + (e.damage || 0), 0);

    area.innerHTML = `
    <div class="team-main-header">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div>
          <span class="team-raid-title" id="raid-title-${raid.id}">${raid.name}</span>
          ${raidSubtitle}
        </div>
        ${raid.mode === "tribe" ? "" : `<button class="btn-sm" onclick="startEditRaidName('${raid.id}')" title="Edit raid" style="font-size:12px;padding:2px 6px;min-width:auto;margin-top:4px">✎</button>`}
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        ${raid.mode === "solo" ? `<span id="raid-total-${raid.id}" style="font-size:13px;color:#64748b">Total <strong style="color:#f1f5f9">${totalDmg ? totalDmg.toLocaleString() + "m" : "—"}</strong></span>` : ""}
        <button class="del-btn" onclick="deleteTeamRaid('${raid.id}')" title="Delete raid">✕ Delete</button>
      </div>
    </div>
    ${renderRosterTabBar(raid)}
    ${renderRosterTabPanels(raid)}`;
}

// ── Roster-wide tabs (Teams / Gear / Skills / Dolls / Bond) ─────
// The four gap tabs aggregate every Nikke across all teams that has a gap in
// that category into a single flat, team-badged list. "Teams" is the lane view.
const ROSTER_TABS = [
    { key: "teams", label: "Teams" },
    { key: "gear", label: "Gear" },
    { key: "skills", label: "Skills" },
    { key: "dolls", label: "Dolls" },
    { key: "bond", label: "Bond" },
];

// Campaign & Tribe Tower let the same Nikke sit on multiple teams. As a result
// their gap tabs (Gear/Skills/Dolls/Bond) are viewed one team at a time via a
// pill selector (a Nikke — and its per-team damage-weighted Potential — can
// differ per team). Solo/Union keep the flat, team-badged all-teams view.
function rosterSharesNikkesAcrossTeams(raid) {
    return !!(raid && (raid.mode === "campaign" || raid.mode === "tribe"));
}
// Team currently shown on the gap tabs (reset to 1 when switching rosters).
let _rosterGapTeam = 1;
function _currentGapTeam(raid) {
    const count = rosterTeamCount(raid);
    return _rosterGapTeam >= 1 && _rosterGapTeam <= count ? _rosterGapTeam : 1;
}

function renderRosterTabBar(raid) {
    const view = state.teamRaidView || "teams";
    const counts = _gapCounts(raid);
    const tabs = ROSTER_TABS.map((t) => {
        const active = view === t.key;
        const badge = t.key !== "teams" ? ` <span class="roster-tab-count">${counts[t.key]}</span>` : "";
        return `<button class="gear-subtab roster-tab${active ? " active" : ""}" data-view="${t.key}" onclick="switchRosterTab('${t.key}')">${t.label}${badge}</button>`;
    }).join("");
    return `<div class="gear-subtab-bar roster-tab-bar" id="roster-tab-bar-${raid.id}">${tabs}</div>`;
}

// Build the single-tab body for a given view.
function _renderRosterTabContent(raid, view) {
    return view === "teams" ? renderTeamSlots(raid) : renderRosterGapTab(raid, view);
}

// All five tab panels are rendered up front and only the active one is shown.
// Swapping tabs then just toggles `display`, so the Nikke <img> nodes are never
// recreated — no icon reload/flicker. The hidden gap panels are kept current by
// refreshRosterGapPanels() whenever the roster changes (invisible work).
function renderRosterTabPanels(raid) {
    const view = state.teamRaidView || "teams";
    const panels = ROSTER_TABS.map((t) => {
        const hidden = t.key === view ? "" : ' style="display:none"';
        return `<div class="roster-tab-panel" data-view="${t.key}"${hidden}>${_renderRosterTabContent(raid, t.key)}</div>`;
    }).join("");
    return `<div id="team-tab-panels">${panels}</div>`;
}

function switchRosterTab(view) {
    state.teamRaidView = view;
    const raid = state.teamRaids.find((r) => r.id === state.selTeamRaid);
    if (!raid) return;
    document.querySelectorAll(`#roster-tab-bar-${raid.id} .roster-tab`).forEach((b) => {
        b.classList.toggle("active", b.dataset.view === view);
    });
    // Just show/hide the already-rendered panels — no innerHTML rebuild.
    document.querySelectorAll("#team-tab-panels .roster-tab-panel").forEach((p) => {
        p.style.display = p.dataset.view === view ? "" : "none";
    });
}

// The DOM node for one gap tab's panel (gear/skills/dolls/bond).
function _rosterGapPanelEl(view) {
    return document.querySelector(`#team-tab-panels .roster-tab-panel[data-view="${view}"]`);
}

// Re-render the four hidden gap panels so they reflect the current roster. Called
// after composition/damage/boss changes. When the Teams tab is active these
// panels are hidden, so rebuilding them (and reloading their icons) is invisible;
// by the time the user switches to one it's already correct and won't flicker.
function refreshRosterGapPanels(raid) {
    ["gear", "skills", "dolls", "bond"].forEach((view) => {
        const el = _rosterGapPanelEl(view);
        if (el) el.innerHTML = _renderRosterTabContent(raid, view);
    });
}

// Recompute the four gap-tab count badges in place (called after a Nikke is
// added/removed on the Teams tab, since that changes roster-wide gap counts).
function updateRosterTabCounts(raid) {
    const counts = _gapCounts(raid);
    document.querySelectorAll(`#roster-tab-bar-${raid.id} .roster-tab`).forEach((b) => {
        const c = b.querySelector(".roster-tab-count");
        if (c && counts[b.dataset.view] != null) c.textContent = counts[b.dataset.view];
    });
}

// Aggregate per-team gap details across the whole roster, tagging each row with
// its team number. Reuses the per-team detail computation.
function _computeRosterGaps(raid) {
    const { teamNums, teams } = _raidLaneMetrics(raid);
    const all = { gear: [], skills: [], dolls: [], bond: [] };
    teamNums.forEach((tnum) => {
        const members = teams[tnum] || [];
        const d = _computeTeamReadinessDetails(raid, members);
        ["gear", "skills", "dolls", "bond"].forEach((k) => {
            d[k].forEach((item) => all[k].push({ ...item, team: tnum }));
        });
    });
    return all;
}

// Gaps actually shown on the tabs: the whole roster for Solo/Union (flat, badged),
// or just the selected team for Campaign/Tribe (per-team pill selector).
function _visibleGaps(raid) {
    const gaps = _computeRosterGaps(raid);
    if (!rosterSharesNikkesAcrossTeams(raid)) return gaps;
    const sel = _currentGapTeam(raid);
    const f = { gear: [], skills: [], dolls: [], bond: [] };
    ["gear", "skills", "dolls", "bond"].forEach((k) => (f[k] = gaps[k].filter((m) => m.team === sel)));
    return f;
}
// Tab-header badge counts: unique Nikkes with a gap across the WHOLE roster
// (deduped by nikkeId, so a Nikke shared between teams counts once), regardless
// of which team the list is currently focused on. For Solo/Union there are no
// cross-team duplicates, so this equals the plain entry count.
function _gapCounts(raid) {
    const gaps = _computeRosterGaps(raid);
    const uniq = (arr) => new Set(arr.map((m) => m.nikkeId)).size;
    return { gear: uniq(gaps.gear), skills: uniq(gaps.skills), dolls: uniq(gaps.dolls), bond: uniq(gaps.bond) };
}

const ROSTER_GAP_LABEL = { gear: "gear", skills: "skill", dolls: "doll", bond: "bond" };

function renderRosterGapTab(raid, cat) {
    const perTeam = rosterSharesNikkesAcrossTeams(raid);
    const list = _visibleGaps(raid)[cat] || [];
    // Team pill selector (Campaign/Tribe with >1 team): choose which team's
    // improvements to view, since a Nikke can belong to several teams.
    let pills = "";
    if (perTeam) {
        const { teamNums } = _raidLaneMetrics(raid);
        if (teamNums.length > 1) {
            const sel = _currentGapTeam(raid);
            pills =
                `<div class="roster-gap-teamsel">` +
                teamNums
                    .map(
                        (t) =>
                            `<button class="roster-team-pill${t === sel ? " active" : ""}" onclick="selectGapTeam(${t})">${getTeamName(raid, t)}</button>`,
                    )
                    .join("") +
                `</div>`;
        }
    }
    // Team badge only in the aggregate (Solo/Union) view — redundant per-team.
    const badge = (m) => (perTeam ? "" : `<span class="roster-team-badge">T${m.team}</span>`);
    // Rec/Max skill-target toggle (Skills tab only) — same seg-toggle used on the
    // Nikkes/Overview screens, driving the shared state.skillTarget. Shown even
    // when there are no gaps, so the target can still be switched from here.
    const skillTargetBar =
        cat === "skills"
            ? `<div class="roster-skill-toggle"><span class="team-gear-sortbar-label">Skill target</span><span class="seg-toggle"><button class="${state.skillTarget === "rec" ? "seg-active" : ""}" onclick="setSkillTarget('rec')">Rec</button><button class="${state.skillTarget === "max" ? "seg-active" : ""}" onclick="setSkillTarget('max')">Max</button></span></div>`
            : "";
    const header = pills + skillTargetBar;
    if (!list.length) {
        return `<div class="roster-gap-tab">${header}<div class="empty-state" style="padding:24px">✓ No ${ROSTER_GAP_LABEL[cat]} gaps — everything looks good.</div></div>`;
    }
    if (cat === "gear") {
        const sorted = [...list].sort((a, b) => {
            const d = _teamGearSortVal(b) - _teamGearSortVal(a);
            return _teamGearSort.dir === "desc" ? d : -d;
        });
        const arrow = (col) => (_teamGearSort.col === col ? (_teamGearSort.dir === "desc" ? " ▼" : " ▲") : "");
        // Best values currently on screen — Potential-dmg and Eff colours are
        // graded relative to these.
        const maxEff = Math.max(0, ...sorted.map((x) => x.bestEff || 0));
        const maxPot = Math.max(0, ...sorted.map((x) => x.potentialM || 0));
        // Portrait-card grid (mirrors the Teams sub-tab's slot cards). The sort
        // bar spans the full grid width; each card keeps .team-gap-item +
        // data-nikke-id so sortRosterGear() can reorder the nodes in place.
        return `<div class="roster-gap-tab">${pills}<div class="team-gap-list team-gear-grid">
          <div class="team-gear-sortbar">
            <span class="team-gear-sortbar-label">Sort by</span>
            <button class="team-gear-sort-btn${_teamGearSort.col === "dmg" ? " active" : ""}" data-col="dmg" onclick="sortRosterGear('dmg')">Dmg${arrow("dmg")}</button>
            <button class="team-gear-sort-btn${_teamGearSort.col === "pct" ? " active" : ""}" data-col="pct" onclick="sortRosterGear('pct')">%${arrow("pct")}</button>
            <button class="team-gear-sort-btn${_teamGearSort.col === "eff" ? " active" : ""}" data-col="eff" onclick="sortRosterGear('eff')">Eff${arrow("eff")}</button>
          </div>
          ${sorted
              .map(
                  (
                      m,
                  ) => `<button class="team-gap-item team-gear-item team-gear-card" data-nikke-id="${m.nikkeId}" onclick="goToGearNikke('${m.nikkeId}')">
            ${badge(m)}
            ${nikkeIcon(m.name, 40)}
            <span class="team-gear-card-name">${m.elem}<span class="team-gear-card-nametext">${m.name}</span></span>
            <span class="team-gear-card-stats">
              <span class="team-gear-card-dmg">${_teamGearPrimaryHtml(m, maxPot, maxEff)}</span>
              <span class="team-gear-card-sub">${_teamGearSecondaryHtml(m, maxPot, maxEff)}</span>
            </span>
          </button>`,
              )
              .join("")}
        </div></div>`;
    }
    // Skills / Dolls / Bond: same horizontal card layout as the Gear tab, with
    // the gap detail as the right-aligned "stat".
    return `<div class="roster-gap-tab">${header}<div class="team-gap-list team-gear-grid">
      ${list
          .map(
              (
                  m,
              ) => `<button class="team-gap-item team-gear-item team-gear-card" data-nikke-id="${m.nikkeId}" onclick="goToGearNikke('${m.nikkeId}')">
        ${badge(m)}
        ${nikkeIcon(m.name, 40)}
        <span class="team-gear-card-name">${m.elem}<span class="team-gear-card-nametext">${m.name}</span></span>
        <span class="team-gear-card-stats">${m.detailHtml ? m.detailHtml : `<span class="team-gap-item-detail" style="color:${m.color}">${m.detail}</span>`}</span>
      </button>`,
          )
          .join("")}
    </div></div>`;
}

// Switch which team the gap tabs display (Campaign/Tribe). Rebuilds the gap
// panels (hidden ones invisibly) and the tab-bar counts for the new team.
function selectGapTeam(tnum) {
    _rosterGapTeam = tnum;
    const raid = state.teamRaids.find((r) => r.id === state.selTeamRaid);
    if (!raid) return;
    refreshRosterGapPanels(raid);
    updateRosterTabCounts(raid);
}

function sortRosterGear(col) {
    const colChanged = _teamGearSort.col !== col;
    if (_teamGearSort.col === col) {
        _teamGearSort.dir = _teamGearSort.dir === "desc" ? "asc" : "desc";
    } else {
        _teamGearSort = { col, dir: "desc" };
    }
    const raid = state.teamRaids.find((r) => r.id === state.selTeamRaid);
    const panel = _rosterGapPanelEl("gear");
    if (!raid || !panel) return;
    // When the sort column changes, the primary/secondary stat layout changes —
    // rebuild the whole panel so the selected metric is the big top number.
    if (colChanged) {
        panel.innerHTML = _renderRosterTabContent(raid, "gear");
        return;
    }
    const listEl = panel.querySelector(".team-gap-list");
    if (!listEl) {
        panel.innerHTML = _renderRosterTabContent(raid, "gear");
        return;
    }
    // Reorder the existing row nodes (appendChild moves, never clones) so the
    // Nikke icons are preserved and don't reload. Key off the visible gaps so
    // per-team rows sort by that team's own (damage-weighted) values.
    const byId = new Map(_visibleGaps(raid).gear.map((m) => [String(m.nikkeId), m]));
    const rows = [...listEl.querySelectorAll(".team-gap-item[data-nikke-id]")];
    rows.sort((a, b) => {
        const d =
            _teamGearSortVal(byId.get(b.dataset.nikkeId) || {}) - _teamGearSortVal(byId.get(a.dataset.nikkeId) || {});
        return _teamGearSort.dir === "desc" ? d : -d;
    });
    rows.forEach((r) => listEl.appendChild(r));
    // Update the sort-header buttons' active state + arrow in place.
    const arrow = (c) => (_teamGearSort.col === c ? (_teamGearSort.dir === "desc" ? " ▼" : " ▲") : "");
    const LABEL = { dmg: "Dmg", pct: "%", eff: "Eff" };
    listEl.querySelectorAll(".team-gear-sort-btn").forEach((b) => {
        const c = b.dataset.col;
        b.classList.toggle("active", _teamGearSort.col === c);
        b.textContent = (LABEL[c] || "") + arrow(c);
    });
}

// ── TEAMS VIEW: 5 lanes × 5 slots ────────────────────────────

function _raidLaneMetrics(raid) {
    const count = rosterTeamCount(raid);
    const teamNums = Array.from({ length: count }, (_, i) => i + 1);
    const teams = {};
    teamNums.forEach((t) => (teams[t] = []));
    raid.entries.forEach((e, i) => {
        if (e.team && teams[e.team]) teams[e.team].push({ ...e, origIdx: i });
    });
    const teamTotals = teamNums.map((t) => teams[t].reduce((s, e) => s + (e.damage || 0), 0));
    const maxTeam = Math.max(...teamTotals, 1);
    const maxEntry = Math.max(...raid.entries.map((e) => e.damage || 0), 1);
    return { teamNums, teams, teamTotals, maxTeam, maxEntry };
}

// Element + burst coverage warnings for a team lane header. Depends only on the
// team's composition, so it can be recomputed in place when a nikke is added or
// removed without rebuilding the slot cards.
function _teamWarningsHtml(raid, tnum, members) {
    const teamWeakness = rosterHasTeamWeakness(raid) ? getTeamWeakness(raid, tnum) : null;
    let elemWarningHtml = "";
    if (raid.mode === "solo" && raid.bossSeason != null) {
        const _ewBoss = SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason);
        if (_ewBoss && _ewBoss.weakness) {
            const _ewNikkes = members.map((e) => state.nikkes.find((x) => x.id === e.nikkeId)).filter(Boolean);
            if (_ewNikkes.length > 0 && !_ewNikkes.some((n) => n.element === _ewBoss.weakness)) {
                elemWarningHtml = `<div class="team-elem-warning">⚠ Missing ${elemIcon(_ewBoss.weakness)}</div>`;
            }
        }
    } else if (rosterHasTeamWeakness(raid) && teamWeakness) {
        const _uwNikkes = members.map((e) => state.nikkes.find((x) => x.id === e.nikkeId)).filter(Boolean);
        if (_uwNikkes.length > 0 && !_uwNikkes.some((n) => n.element === teamWeakness)) {
            elemWarningHtml = `<div class="team-elem-warning">⚠ Missing ${elemIcon(teamWeakness)}</div>`;
        }
    }
    let burstWarningHtml = "";
    const _bwNikkes = members.map((e) => state.nikkes.find((x) => x.id === e.nikkeId)).filter(Boolean);
    if (_bwNikkes.length === 5) {
        const getBurstCat = (n) =>
            (n.burst1 && n.burst2 && n.burst3) || n.burst3 ? 3 : n.burst2 ? 2 : n.burst1 ? 1 : null;
        const rapiRH = _bwNikkes.find((n) => n.name === "Rapi: Red Hood");
        const nonRRHB1 = _bwNikkes.filter((n) => n !== rapiRH && getBurstCat(n) === 1).length;
        const rapiRHCountsAsB1 = rapiRH != null && nonRRHB1 === 0;
        const b1 = _bwNikkes.filter((n) => (n === rapiRH ? rapiRHCountsAsB1 : getBurstCat(n) === 1)).length;
        const b2 = _bwNikkes.filter((n) => getBurstCat(n) === 2).length;
        const b3 = _bwNikkes.filter((n) => (n === rapiRH ? !rapiRHCountsAsB1 : getBurstCat(n) === 3)).length;
        // Re-enter Nikkes burst twice per rotation, so each one needs an extra
        // teammate of the same burst stage to cover the slot it vacates — i.e. it
        // raises that stage's required count by 1. Viper only re-enters once her
        // SSR treasure ("First Phone and Phone Book") is equipped.
        const isReEnter = (n) => {
            const db = NIKKE_DB_MAP.get(n.name) || {};
            if (!db.burstReEnter) return false;
            if (n.name === "Viper") {
                const doll = n.doll ? COLLECTION_DOLLS.find((d) => d.id === n.doll.tid) : null;
                return doll != null && doll.treasure === "Viper" && doll.rarity === "SSR";
            }
            return true;
        };
        const reB1 = _bwNikkes.filter((n) => getBurstCat(n) === 1 && isReEnter(n)).length;
        const reB2 = _bwNikkes.filter((n) => getBurstCat(n) === 2 && isReEnter(n)).length;
        const reB3 = _bwNikkes.filter((n) => getBurstCat(n) === 3 && isReEnter(n)).length;
        const missing = [];
        if (b1 < 1 + reB1) missing.push("Burst I");
        if (b2 < 1 + reB2) missing.push("Burst II");
        if (b3 < 2 + reB3) missing.push("Burst III");
        if (missing.length) burstWarningHtml = `<div class="team-elem-warning">⚠ Missing ${missing.join(" · ")}</div>`;
    }
    return elemWarningHtml + burstWarningHtml;
}

function _buildTeamLaneHtml(raid, tnum, members, total, maxTeam, maxEntry, isExpandable) {
    const teamColor = (pct) => (pct >= 80 ? "#4ade80" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#f87171");
    const pct = (total / maxTeam) * 100;
    const tColor = total === 0 ? "#64748b" : teamColor(pct);
    const slots = [];
    for (let i = 0; i < 5; i++) {
        slots.push(renderTeamSlot(raid, tnum, i, members[i] || null, maxEntry));
    }
    const delTeamBtn =
        isExpandable && tnum > 1
            ? `<button class="team-del-btn" onclick="deleteRosterTeam('${raid.id}',${tnum})" title="Delete team">✕</button>`
            : "";
    const notesVal = getTeamNotes(raid, tnum).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const notesOpen = !!getTeamNotes(raid, tnum);
    const notesHtml = `<div class="team-notes-section${notesOpen ? " open" : ""}" id="team-notes-section-${raid.id}-${tnum}">
      <button type="button" class="team-notes-toggle" onclick="toggleTeamNotes('${raid.id}',${tnum})">
        <svg class="team-notes-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Notes</span>
        ${notesVal ? '<span class="team-notes-indicator">●</span>' : ""}
      </button>
      <div class="team-notes-body">
        <textarea class="team-notes-textarea" id="team-notes-textarea-${raid.id}-${tnum}" placeholder="Add notes about this team..." maxlength="2000" onblur="saveTeamNotes('${raid.id}',${tnum})">${notesVal}</textarea>
      </div>
    </div>`;
    return `<div class="team-lane" id="team-lane-${raid.id}-${tnum}">
    <div class="team-lane-header">
      <div class="team-name-group" id="team-name-group-${raid.id}-${tnum}">${renderTeamNameGroupStatic(raid, tnum)}</div>
      <span class="team-warnings" id="team-warnings-${raid.id}-${tnum}" style="display:contents">${_teamWarningsHtml(raid, tnum, members)}</span>
      <span class="team-total" id="team-total-${raid.id}-${tnum}" style="color:${tColor};margin-left:auto">${total ? total.toLocaleString() + "m" : ""}</span>
      ${delTeamBtn}
    </div>
    <div class="team-slots">${slots.join("")}</div>
    ${notesHtml}
  </div>`;
}

function renderTeamSlots(raid) {
    const isExpandable = isExpandableRoster(raid);
    const { teamNums, teams, teamTotals, maxTeam, maxEntry } = _raidLaneMetrics(raid);
    const lanes = teamNums
        .map((t, ti) => _buildTeamLaneHtml(raid, t, teams[t], teamTotals[ti], maxTeam, maxEntry, isExpandable))
        .join("");
    const addTeamBtn = isExpandable
        ? `<button class="add-line-btn" style="margin-top:9px" onclick="addRosterTeam('${raid.id}')">+ Add Team</button>`
        : "";
    return `<div class="team-lanes">${lanes}</div>
      ${addTeamBtn}
      ${renderTeamSlotPickerOverlay()}`;
}

function _rerenderTeamLane(raid, tnum) {
    const el = document.getElementById(`team-lane-${raid.id}-${tnum}`);
    if (!el) {
        renderTeamRaidMain(raid);
        return;
    }
    const isExpandable = isExpandableRoster(raid);
    const { teamNums, teams, teamTotals, maxTeam, maxEntry } = _raidLaneMetrics(raid);
    const ti = teamNums.indexOf(tnum);
    el.outerHTML = _buildTeamLaneHtml(
        raid,
        tnum,
        teams[tnum] || [],
        teamTotals[ti] || 0,
        maxTeam,
        maxEntry,
        isExpandable,
    );
}

function renderTeamSlot(raid, teamNum, slotIdx, entry, maxEntry) {
    if (!entry) {
        return `<div class="team-slot team-slot-empty" onclick="openTeamSlotPicker('${raid.id}',${teamNum},${slotIdx})" title="Add Nikke">
      <span class="team-slot-add-btn">+</span>
    </div>`;
    }
    const n = state.nikkes.find((x) => x.id === entry.nikkeId);
    const name = n ? n.name : "(removed)";
    const elem = n && n.element ? elemIcon(n.element) : "";
    const bd = n ? burstDisplay(n) : "";
    const burstNum = bd === "All" ? "All" : bd === "III" ? 3 : bd === "II" ? 2 : bd === "I" ? 1 : null;
    const burst = burstNum ? burstIcon(burstNum) : "";
    return `<div class="team-slot team-slot-filled" data-nikke-id="${entry.nikkeId}" onclick="openTeamSlotPickerEdit('${raid.id}',${teamNum},${entry.origIdx})" title="Change Nikke">
      ${n ? nikkeIcon(name, 34) : ""}
      <div class="team-slot-info">
        <span class="team-slot-name">${name}</span>
        ${elem || burst ? `<div style="display:flex;align-items:center;gap:2px;margin-top:1px">${elem}${burst}</div>` : ""}
      </div>
      <div class="team-slot-dmg-row">
        <input class="team-slot-dmg-input" type="text" inputmode="numeric" value="${(entry.damage || 0).toLocaleString()}"
               onclick="event.stopPropagation()"
               onfocus="this.value=this.value.replace(/,/g,'');if(this.value==='0')this.value=''"
               oninput="this.value=this.value.replace(/[^0-9]/g,'')"
               onblur="commitTeamDmgInput(this,'${raid.id}',${entry.origIdx})"
               onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){this.dataset.cancel='1';this.blur();}"/>
        <span class="team-slot-dmg-suffix">m Dmg</span>
      </div>
    </div>`;
}

function renderTeamSlotPickerOverlay() {
    return `<div class="team-slot-picker-overlay" id="team-slot-picker-overlay" onclick="if(event.target===this)closeTeamSlotPicker()">
      <div class="team-slot-picker-modal">
        <div class="sheet-drag-zone"><div class="sheet-drag-handle" aria-hidden="true"></div></div>
        <input class="form-input" id="team-slot-picker-search" placeholder="Search..." oninput="filterTeamSlotPicker()" data-kbnav-list="#team-slot-picker-list" style="margin-bottom:8px"/>
        <div id="team-slot-picker-list" class="team-slot-picker-list"></div>
      </div>
    </div>`;
}

// ── Slot picker ──────────────────────────────────────────────
let _teamSlotPickerState = { raidId: null, team: null, slot: null, entryIdx: null };

function openTeamSlotPicker(raidId, teamNum, slotIdx) {
    _teamSlotPickerState = { raidId, team: teamNum, slot: slotIdx, entryIdx: null };
    const overlay = document.getElementById("team-slot-picker-overlay");
    if (overlay) {
        void overlay.offsetWidth; // commit the closed state so the slide-up runs
        overlay.classList.add("show");
        const search = document.getElementById("team-slot-picker-search");
        if (search) {
            search.value = "";
            search.focus();
        }
        filterTeamSlotPicker();
    }
}

function openTeamSlotPickerEdit(raidId, teamNum, entryIdx) {
    _teamSlotPickerState = { raidId, team: teamNum, slot: null, entryIdx };
    const overlay = document.getElementById("team-slot-picker-overlay");
    if (overlay) {
        void overlay.offsetWidth; // commit the closed state so the slide-up runs
        overlay.classList.add("show");
        const search = document.getElementById("team-slot-picker-search");
        if (search) {
            search.value = "";
            search.focus();
        }
        filterTeamSlotPicker();
    }
}

function closeTeamSlotPicker() {
    const overlay = document.getElementById("team-slot-picker-overlay");
    if (overlay) {
        const modal = overlay.querySelector(".team-slot-picker-modal");
        if (modal) {
            modal.classList.remove("dragging");
            modal.style.transform = ""; // clear any drag offset; let CSS slide it down
        }
        overlay.classList.remove("show"); // fade backdrop + slide the sheet down
    }
    _teamSlotPickerState = { raidId: null, team: null, slot: null, entryIdx: null };
}

function filterTeamSlotPicker() {
    const search = document.getElementById("team-slot-picker-search");
    const list = document.getElementById("team-slot-picker-list");
    if (!list) return;
    const q = search ? search.value.toLowerCase() : "";
    const { raidId, entryIdx } = _teamSlotPickerState;
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) {
        list.innerHTML = "";
        return;
    }
    const currentNikkeId = entryIdx != null ? raid.entries[entryIdx]?.nikkeId : null;
    // Campaign/Tribe let a Nikke sit on multiple teams, so uniqueness is scoped to
    // the picker's own team; Solo/Union keep a Nikke unique across the whole roster.
    const scopeTeam = _teamSlotPickerState.team;
    const sharesAcrossTeams = rosterSharesNikkesAcrossTeams(raid);
    const assignedIds = new Set(
        raid.entries
            .filter((e) => e.team && e.team > 0 && (!sharesAcrossTeams || e.team === scopeTeam))
            .map((e) => e.nikkeId),
    );
    if (currentNikkeId) assignedIds.delete(currentNikkeId);
    // Tribe Tower rosters only admit Nikkes eligible for the roster's tower.
    const isTribe = raid.mode === "tribe";
    const available = state.nikkes
        .filter(
            (n) =>
                !assignedIds.has(n.id) &&
                n.name.toLowerCase().includes(q) &&
                (!isTribe || nikkeEligibleForTower(n, raid.tower)),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    const removeBtn =
        entryIdx != null
            ? `<div class="team-slot-picker-item team-slot-picker-remove js-kbnav-item" tabindex="0" role="button" onclick="removeTeamSlotFromPicker()">
      <span style="font-size:16px;line-height:1">✕</span>
      <span>Remove from team</span>
    </div>`
            : "";
    list.innerHTML =
        removeBtn +
        (available
            .map((n) => {
                const elem = n.element ? elemIcon(n.element) : "";
                return `<div class="team-slot-picker-item js-kbnav-item" tabindex="0" role="button" onclick="pickTeamSlotNikke('${n.id}')">
      ${nikkeIcon(n.name, 28)}
      <span>${n.name}</span>
      <span style="font-size:12px;color:#64748b;margin-left:auto">${elem} ${burstDisplay(n)}</span>
    </div>`;
            })
            .join("") || '<div style="padding:8px;color:#475569;font-size:13px">No available Nikkes</div>');
}

function removeTeamSlotFromPicker() {
    const { raidId, entryIdx } = _teamSlotPickerState;
    closeTeamSlotPicker();
    if (raidId != null && entryIdx != null) removeTeamSlot(raidId, entryIdx);
}

function pickTeamSlotNikke(nikkeId) {
    const { raidId, team, entryIdx } = _teamSlotPickerState;
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    if (entryIdx != null) {
        const existing = raid.entries[entryIdx];
        if (existing) {
            existing.nikkeId = nikkeId;
        }
    } else {
        raid.entries.push({ nikkeId, damage: 0, team });
    }
    save();
    closeTeamSlotPicker();
    // Add appends / swap replaces in place — neither shifts other entries' index,
    // so only this team's lane needs updating, and icons of unchanged slots stay.
    _updateTeamLaneComposition(raid, team);
}

function removeTeamSlot(raidId, entryIdx) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    const tnum = raid.entries[entryIdx]?.team;
    raid.entries.splice(entryIdx, 1);
    save();
    if (!tnum) {
        renderTeamRaidMain(raid);
        return;
    }
    // The splice shifted the index of every later entry, so re-sync the slot
    // handlers on the OTHER lanes too (icon-preserving); only the changed team's
    // warnings/bar/readiness/totals need rebuilding.
    const { teamNums } = _raidLaneMetrics(raid);
    teamNums.forEach((t) => {
        if (t !== tnum) _resyncTeamSlotIdx(raid, t);
    });
    _updateTeamLaneComposition(raid, tnum);
}

// Update every team's total + color (colors are normalised against the raid-wide
// max, so one team's change can recolour the rest) and the raid total. Pure
// text/style writes — no icons touched.
function _updateAllTeamTotals(raid) {
    const { teamNums, teamTotals, maxTeam } = _raidLaneMetrics(raid);
    const teamColor = (pct) => (pct >= 80 ? "#4ade80" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#f87171");
    teamNums.forEach((tnum, ti) => {
        const total = teamTotals[ti] || 0;
        const totalEl = document.getElementById(`team-total-${raid.id}-${tnum}`);
        if (totalEl) {
            totalEl.textContent = total ? total.toLocaleString() + "m" : "";
            totalEl.style.color = total === 0 ? "#64748b" : teamColor((total / maxTeam) * 100);
        }
    });
    const raidTotal = raid.entries.reduce((s, e) => s + (e.damage || 0), 0);
    const raidTotalEl = document.getElementById(`raid-total-${raid.id}`);
    if (raidTotalEl)
        raidTotalEl.innerHTML = `Total <strong style="color:#f1f5f9">${raidTotal ? raidTotal.toLocaleString() + "m" : "—"}</strong>`;
}

// Surgically update only the damage-dependent displays without touching nikke
// icons, names, or warnings (none of which depend on damage). Damage feeds the
// per-team/raid totals and the Gear tab's Potential/Eff values, so refresh those.
// The Gear panel is hidden while damage is edited (inputs live on the Teams tab),
// so rebuilding it is invisible.
function _updateTeamDmgDisplays(raid, changedTeam) {
    _updateAllTeamTotals(raid);
    const gearPanel = _rosterGapPanelEl("gear");
    if (gearPanel) gearPanel.innerHTML = _renderRosterTabContent(raid, "gear");
}

// Parse a single-element HTML string into a detached DOM node.
function _htmlToNode(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    return tpl.content.firstElementChild;
}

// Rewrite a filled slot's entry-index references (used by the edit picker and
// the damage input) after a splice shifts raid.entries. Icon/name/damage are
// unchanged, so the node itself is reused — only these handlers move.
function _applySlotEntryIdx(slotEl, raidId, teamNum, origIdx) {
    slotEl.setAttribute("onclick", `openTeamSlotPickerEdit('${raidId}',${teamNum},${origIdx})`);
    const input = slotEl.querySelector(".team-slot-dmg-input");
    if (input) input.setAttribute("onblur", `commitTeamDmgInput(this,'${raidId}',${origIdx})`);
}

// Lightweight handler resync for a lane whose composition did NOT change but
// whose entry indices shifted (e.g. a removal in another team spliced the shared
// entries array). Filled slots render in member order, so the i-th filled slot
// maps to members[i]. No nodes move, so no icons flicker.
function _resyncTeamSlotIdx(raid, tnum) {
    const laneEl = document.getElementById(`team-lane-${raid.id}-${tnum}`);
    if (!laneEl) return;
    const { teams } = _raidLaneMetrics(raid);
    const members = teams[tnum] || [];
    const filled = laneEl.querySelectorAll(".team-slots .team-slot-filled");
    members.forEach((entry, i) => {
        if (filled[i]) _applySlotEntryIdx(filled[i], raid.id, tnum, entry.origIdx);
    });
}

// Reconcile a team's 5 slot cards to the current roster by KEY (nikkeId),
// reusing the existing DOM node for any nikke that is still present so its
// <img> icon is never recreated (no flicker). Only genuinely new/changed slots
// build fresh nodes; surviving nikkes whose entry index shifted just get their
// handlers rewritten in place.
function _reconcileTeamSlots(raid, tnum) {
    const laneEl = document.getElementById(`team-lane-${raid.id}-${tnum}`);
    if (!laneEl) {
        renderTeamRaidMain(raid);
        return;
    }
    const slotsEl = laneEl.querySelector(".team-slots");
    if (!slotsEl) {
        _rerenderTeamLane(raid, tnum);
        return;
    }
    const { teams, maxEntry } = _raidLaneMetrics(raid);
    const members = teams[tnum] || [];
    const filledByNikke = new Map();
    slotsEl.querySelectorAll(".team-slot-filled[data-nikke-id]").forEach((el) => {
        if (!filledByNikke.has(el.dataset.nikkeId)) filledByNikke.set(el.dataset.nikkeId, el);
    });
    const emptyPool = Array.from(slotsEl.querySelectorAll(".team-slot-empty"));
    const result = [];
    for (let i = 0; i < 5; i++) {
        const entry = members[i] || null;
        if (entry) {
            const reuse = filledByNikke.get(String(entry.nikkeId));
            if (reuse) {
                filledByNikke.delete(String(entry.nikkeId));
                _applySlotEntryIdx(reuse, raid.id, tnum, entry.origIdx);
                result.push(reuse);
            } else {
                result.push(_htmlToNode(renderTeamSlot(raid, tnum, i, entry, maxEntry)));
            }
        } else {
            const reuse = emptyPool.pop();
            if (reuse) {
                reuse.setAttribute("onclick", `openTeamSlotPicker('${raid.id}',${tnum},${i})`);
                result.push(reuse);
            } else {
                result.push(_htmlToNode(renderTeamSlot(raid, tnum, i, null, maxEntry)));
            }
        }
    }
    // replaceChildren MOVES the reused nodes into place and drops the rest —
    // surviving icons keep their live <img> element.
    slotsEl.replaceChildren(...result);
}

// Refresh the composition-dependent parts of a lane after a nikke is added or
// removed: the slot cards (icon-preserving), coverage warnings, all team
// totals/colors, and the roster-wide gap-tab counts.
function _updateTeamLaneComposition(raid, tnum) {
    _reconcileTeamSlots(raid, tnum);
    const members = raid.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === tnum);
    const warnEl = document.getElementById(`team-warnings-${raid.id}-${tnum}`);
    if (warnEl) warnEl.innerHTML = _teamWarningsHtml(raid, tnum, members);
    _updateAllTeamTotals(raid);
    // Adding/removing a Nikke changes the roster-wide gap tabs and their counts;
    // refresh the (hidden) gap panels and tab-bar badges so they stay current.
    updateRosterTabCounts(raid);
    refreshRosterGapPanels(raid);
}

function commitTeamDmgInput(input, raidId, entryIdx) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (input.dataset.cancel === "1") {
        input.dataset.cancel = "";
        input.value = ((raid && raid.entries[entryIdx]?.damage) || 0).toLocaleString();
        return;
    }
    if (!raid || !raid.entries[entryIdx]) return;
    const val = parseInt((input.value || "").replace(/[^0-9]/g, "")) || 0;
    // Blur re-formats with thousands separators (focus strips them for editing).
    input.value = val.toLocaleString();
    if (raid.entries[entryIdx].damage === val) return;
    raid.entries[entryIdx].damage = val;
    save();
    _updateTeamDmgDisplays(raid, raid.entries[entryIdx].team);
}

// ── Team names ───────────────────────────────────────────────
function getTeamName(raid, teamNum) {
    return (raid.teamNames && raid.teamNames[teamNum]) || "Team " + teamNum;
}

function renderTeamNameGroupStatic(raid, tnum) {
    const name = getTeamName(raid, tnum);
    const hasWeaknessMode = rosterHasTeamWeakness(raid);
    const weakness = hasWeaknessMode ? getTeamWeakness(raid, tnum) : null;
    let weaknessBadge = "";
    if (weakness) {
        weaknessBadge = ` <span class="team-weakness-badge"> · ${elemIcon(weakness, 16)} <span class="team-weakness-text">${weakness} Weak</span></span>`;
    } else if (hasWeaknessMode) {
        // Per-team-weakness roster with none chosen yet — prompt the user.
        weaknessBadge = ` <span class="team-weakness-badge team-weakness-none"> · <span class="team-weakness-text">No Weakness</span></span>`;
    }
    return `<span class="team-label">${name}</span>${weaknessBadge}<button class="btn-sm" onclick="startEditTeamName('${raid.id}',${tnum})" title="Rename team" style="font-size:12px;padding:2px 6px;min-width:auto">✎</button>`;
}

function startEditTeamName(raidId, teamNum) {
    const group = document.getElementById("team-name-group-" + raidId + "-" + teamNum);
    if (!group || group.querySelector("input.team-label-input")) return;
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;

    group.innerHTML = "";

    const input = document.createElement("input");
    input.className = "team-label-input";
    input.type = "text";
    input.maxLength = 50;
    input.value = getTeamName(raid, teamNum);
    // Wrap the input so a live "current/max" character counter can sit at its
    // right edge (input has padding-right to keep typed text clear of it).
    const inputWrap = document.createElement("div");
    inputWrap.className = "team-label-input-wrap";
    const counter = document.createElement("span");
    counter.className = "team-label-counter";
    const updateCounter = () => (counter.textContent = `${input.value.length}/50`);
    updateCounter();
    input.addEventListener("input", updateCounter);
    inputWrap.appendChild(input);
    inputWrap.appendChild(counter);
    group.appendChild(inputWrap);

    let weaknessSelect = null;
    if (rosterHasTeamWeakness(raid)) {
        weaknessSelect = document.createElement("select");
        weaknessSelect.className = "team-weakness-select";
        weaknessSelect.appendChild(new Option("No Weakness", ""));
        const cur = getTeamWeakness(raid, teamNum);
        NIKKE_ELEMENTS.forEach((e) => {
            const opt = new Option(e, e);
            if (cur === e) opt.selected = true;
            weaknessSelect.appendChild(opt);
        });
        group.appendChild(weaknessSelect);
    }

    let committed = false;
    function doCommit(cancel) {
        if (committed) return;
        committed = true;
        const r = state.teamRaids.find((x) => x.id === raidId);
        if (!r) return;
        if (!cancel) {
            const val = input.value.trim().slice(0, 50);
            if (!r.teamNames) r.teamNames = {};
            r.teamNames[teamNum] = val && val !== "Team " + teamNum ? val : "";
            if (rosterHasTeamWeakness(r) && weaknessSelect) {
                if (!r.teamWeakness) r.teamWeakness = {};
                r.teamWeakness[teamNum] = weaknessSelect.value || null;
            }
            save();
            // Weakness also drives the element-coverage warning; refresh it in
            // place so the slot cards (and their icons) aren't re-rendered.
            if (rosterHasTeamWeakness(r)) {
                const members = r.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === teamNum);
                const warnEl = document.getElementById(`team-warnings-${raidId}-${teamNum}`);
                if (warnEl) warnEl.innerHTML = _teamWarningsHtml(r, teamNum, members);
            }
            // The team name also appears on the gap-tab pills; refresh those hidden
            // panels in the background so the renamed pill is correct on switch.
            refreshRosterGapPanels(r);
        }
        // Both commit and cancel just swap the inline editor back to the static
        // name group — no full lane rebuild.
        const g = document.getElementById("team-name-group-" + raidId + "-" + teamNum);
        if (g) g.innerHTML = renderTeamNameGroupStatic(r, teamNum);
    }

    group.addEventListener("focusout", function onFocusOut(e) {
        if (!group.contains(e.relatedTarget)) {
            group.removeEventListener("focusout", onFocusOut);
            doCommit(false);
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doCommit(false);
        if (e.key === "Escape") doCommit(true);
    });

    input.focus();
    input.select();
}

// ── Team element weakness (per-team, non-Solo rosters) ──────
// Solo rosters use a single boss weakness; every other mode (Union, Tribe Tower,
// Campaign) lets each team set its own weakness element for coverage warnings.
function rosterHasTeamWeakness(raid) {
    return !!(raid && raid.mode !== "solo");
}
function getTeamWeakness(raid, teamNum) {
    return (raid.teamWeakness && raid.teamWeakness[teamNum]) || null;
}

// ── Inline readiness (rendered below each team's slots) ─────

// Per-team readiness gap details, aggregated across the roster by
// _computeRosterGaps. gainPct/potentialM/bestEff are the damage-dependent fields;
// everything else derives from gear/skill/doll/bond state.
function _computeTeamReadinessDetails(raid, members) {
    const details = { gear: [], skills: [], dolls: [], bond: [] };
    const boss =
        raid.mode === "solo" && raid.bossSeason != null
            ? SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason)
            : null;
    members.forEach((e) => {
        const n = state.nikkes.find((x) => x.id === e.nikkeId);
        if (!n) return;
        const savedElementalBoss = state.elementalBoss;
        if (boss && boss.weakness && n.element !== boss.weakness) state.elementalBoss = false;
        const g = getTeamRaidGaps(n);
        const gainPct = getNikkeTotalGainPct(n);
        let bestEff = 0,
            bestSlot = "";
        if (e.damage) {
            SLOTS.forEach((slot) => {
                const sv = getVerdict(n, slot);
                if (!sv || sv.cls === "v-keep") return;
                let rocks = 0,
                    dpsGain = 0;
                if (sv.options) {
                    const rec = sv.options.find((o) => o.recommended) || sv.options[0];
                    rocks = rec.rocks;
                    dpsGain = rec.dpsGain || 0;
                } else {
                    rocks = sv.rocks;
                    dpsGain = sv.dpsGain || 0;
                }
                if (rocks > 0 && dpsGain > 0) {
                    const eff = ((dpsGain / 100) * e.damage) / rocks;
                    if (eff > bestEff) {
                        bestEff = eff;
                        bestSlot = slot;
                    }
                }
            });
        }
        state.elementalBoss = savedElementalBoss;
        const base = { nikkeId: n.id, name: n.name, elem: n.element ? elemIcon(n.element) : "" };
        if (g.gearCount) {
            details.gear.push({
                ...base,
                gainPct,
                potentialM: e.damage > 0 && gainPct > 0 ? (gainPct / 100) * e.damage : null,
                bestEff,
                bestSlot,
            });
        }
        if (g.skillGaps.length) {
            // Mirror the Nikkes-screen skill fields: large "cur/rec" per skill with
            // the current value coloured (yellow below target, green once met).
            const segs = g.skillGaps
                .map((s) => {
                    const c = (s.cur ?? 0) >= s.rec ? "#4ade80" : "#fcd34d";
                    return `<span class="team-gap-skill"><span class="team-gap-skill-lbl">${s.label}</span><span style="color:${c}">${s.cur}</span><span class="team-gap-skill-max">/${s.rec}</span></span>`;
                })
                .join(`<span class="team-gap-skill-sep">·</span>`);
            details.skills.push({ ...base, detailHtml: `<span class="team-gap-skills">${segs}</span>` });
        }
        if (g.dollGap) details.dolls.push({ ...base, detail: g.dollDetail, color: _dollSevColor(g.dollSev) });
        if (g.bondGap) {
            // Mirror the Nikkes-screen bond field: large "cur/max" with the current
            // value in yellow while below max (green once maxed, though gaps never are).
            const bondColor = g.bondCur >= g.bondMax ? "#4ade80" : "#fcd34d";
            details.bond.push({
                ...base,
                detailHtml: `<span class="team-gap-bond"><span style="color:${bondColor}">${g.bondCur}</span><span class="team-gap-bond-max">/${g.bondMax}</span></span>`,
            });
        }
    });
    return details;
}

// Sort key for a gear row under the current column selection.
function _teamGearSortVal(m) {
    return _teamGearSort.col === "pct"
        ? m.gainPct || 0
        : _teamGearSort.col === "eff"
          ? m.bestEff || 0
          : m.potentialM || 0;
}

// Green/yellow/red thresholds for how worthwhile a gear upgrade is, using the
// app's standard status trio. Potential is judged by total damage-gain % still
// on the table (scale-independent). Eff (m/rock) scales with player power, so
// it's judged RELATIVELY — each row's share of the best efficiency on screen —
// rather than by flat marks. Tune these to taste.
const GEAR_POTENTIAL_PCT_GREEN = 10; // ≥10% total gain available → worth it
const GEAR_POTENTIAL_PCT_YELLOW = 4; // 4–10% → marginal; <4% → not worth much
// Relative thresholds (share of the best value on screen) shared by the
// Potential-damage and Eff columns, since both scale with the player's power.
const GEAR_REL_GREEN_FRAC = 0.5; // ≥50% of the best on screen → green
const GEAR_REL_YELLOW_FRAC = 0.2; // 20–50% → yellow; below → red

// Map a value to the green/yellow/red status colours used across the app.
function _gearWorthColor(val, green, yellow) {
    if (val >= green) return "#4ade80";
    if (val >= yellow) return "#fbbf24";
    return "#f87171";
}

// Potential damage-gain cell (+Xm). Coloured RELATIVELY — this row's gain as a
// share of the best potential damage gain on screen (maxPot) — because absolute
// damage scales with the player's power. Blank until damage has been entered.
function _teamGearDmgHtml(m, maxPot) {
    if (!(m.potentialM > 0)) return `<span style="color:#475569">—</span>`;
    const c =
        maxPot > 0 ? _gearWorthColor(m.potentialM / maxPot, GEAR_REL_GREEN_FRAC, GEAR_REL_YELLOW_FRAC) : "#4ade80";
    return `<span style="color:${c}">+${m.potentialM.toFixed(1)}m</span>`;
}

// Potential percent-gain cell (+X.X%). Coloured by absolute % breakpoints —
// scale-independent, so it shows how much room the gear still has regardless of
// player power (present even before damage is entered).
function _teamGearPctHtml(m) {
    if (!(m.gainPct > 0)) return `<span style="color:#475569">—</span>`;
    const c = _gearWorthColor(m.gainPct, GEAR_POTENTIAL_PCT_GREEN, GEAR_POTENTIAL_PCT_YELLOW);
    return `<span style="color:${c}">+${m.gainPct.toFixed(1)}%</span>`;
}

// Eff cell text for a gear row.
function _teamGearEffText(m) {
    return m.bestEff > 0 ? m.bestEff.toFixed(2) + "m/rock" : "—";
}

// Primary (big) stat for gear cards — the currently selected sort column.
function _teamGearPrimaryHtml(m, maxPot, maxEff) {
    const col = _teamGearSort.col;
    if (col === "pct") return _teamGearPctHtml(m);
    if (col === "eff") return `<span style="color:${_teamGearEffColor(m, maxEff)}" title="Best slot: ${m.bestSlot}">${_teamGearEffText(m)}</span>`;
    return _teamGearDmgHtml(m, maxPot);
}

// Secondary (small sub-line) stat for gear cards — the two non-selected columns.
function _teamGearSecondaryHtml(m, maxPot, maxEff) {
    const col = _teamGearSort.col;
    if (col === "pct") {
        return `${_teamGearDmgHtml(m, maxPot)}<span class="team-gear-card-eff" style="color:${_teamGearEffColor(m, maxEff)}" title="Best slot: ${m.bestSlot}">${_teamGearEffText(m)}</span>`;
    }
    if (col === "eff") {
        return `${_teamGearDmgHtml(m, maxPot)}${_teamGearPctHtml(m)}`;
    }
    // default: dmg is primary, show pct + eff as secondary
    return `${_teamGearPctHtml(m)}<span class="team-gear-card-eff" style="color:${_teamGearEffColor(m, maxEff)}" title="Best slot: ${m.bestSlot}">${_teamGearEffText(m)}</span>`;
}

// Colour for the Eff cell — dimmed when there's no upgrade, otherwise judged by
// this row's m/rock as a share of the best m/rock currently on screen (maxEff),
// so the scale tracks the player's power instead of using flat marks.
function _teamGearEffColor(m, maxEff) {
    if (!(m.bestEff > 0)) return "#475569";
    if (!(maxEff > 0)) return "#4ade80";
    return _gearWorthColor(m.bestEff / maxEff, GEAR_REL_GREEN_FRAC, GEAR_REL_YELLOW_FRAC);
}

// ── Dolls gap severity colour ────────────────────────────────
// The Dolls tab only lists Nikkes with a gap, so the colour shows HOW FAR each
// one is from the recommendation via a 3-state severity: 2 = none equipped (red),
// 1 = wrong/under-levelled (yellow), 0 = nearly maxed (green). Skills and Bond
// instead use the Nikkes-screen "cur/max" style — see their details below.
function _dollSevColor(sev) {
    return sev >= 2 ? "#f87171" : sev >= 1 ? "#fbbf24" : "#4ade80";
}

// ── READINESS VIEW ───────────────────────────────────────────
// Mirrors the gap logic used by the Solo Raids Recommendations view, packaged per-Nikke.
function getTeamRaidGaps(n) {
    // Gear: slots whose verdict is not "keep"
    const badSlots = [];
    SLOTS.forEach((slot) => {
        const v = getVerdict(n, slot);
        if (v && v.cls !== "v-keep") badSlots.push(slot);
    });
    // Skills. Targets follow the Rec/Max toggle (state.skillTarget) via the shared
    // skillTargetVals helper, so this tab matches the Nikkes/Overview screens.
    const skillGaps = [];
    const db = NIKKE_DB_MAP.get(n.name);
    const skillTgt = db && db.build && db.build.skill && db.build.skill.pve ? skillTargetVals(db.build.skill.pve) : null;
    if (skillTgt) {
        const cur = [n.skill1 ?? 0, n.skill2 ?? 0, n.skill3 ?? 0];
        const labels = ["S1", "S2", "Burst"];
        [skillTgt.s1, skillTgt.s2, skillTgt.s3].forEach((target, i) => {
            if (target != null && cur[i] < target) skillGaps.push({ label: labels[i], cur: cur[i], rec: target });
        });
    }
    // Dolls. dollSev grades how far off the recommendation is (2 = none
    // equipped → red, 1 = wrong/under-levelled → yellow, 0 = nearly maxed → green).
    // dollDetail is a plain-language action that matches the actual state.
    let dollGap = false,
        dollDetail = "",
        dollSev = 0;
    if (db) {
        const isTreasure = TREASURE_NAMES.has(n.name);
        if (isTreasure) {
            const recDoll = COLLECTION_DOLLS.find((d) => d.treasure === n.name);
            const done = !!(n.doll && recDoll && n.doll.tid === recDoll.id);
            if (!done && recDoll) {
                dollGap = true;
                dollDetail = `Equip ${recDoll.name}`;
                // No level component for treasures — either the specific doll is
                // equipped (done) or it isn't. Some doll on = yellow, none = red.
                dollSev = n.doll ? 1 : 2;
            }
        } else {
            const recDoll = COLLECTION_DOLLS.find((d) => d.rarity === "SR" && d.weapon === db.weapon);
            const eq = n.doll ? COLLECTION_DOLLS.find((d) => d.id === n.doll.tid) : null;
            const done = !!(eq && eq.rarity === "SR" && n.doll.lv === 15);
            if (!done && recDoll) {
                dollGap = true;
                const hasSR = !!(eq && eq.rarity === "SR");
                const eqLv = eq ? (n.doll.lv ?? 0) : 0;
                if (!hasSR) {
                    // Wrong rarity or nothing on → still needs the right doll.
                    dollDetail = "Equip an SR doll";
                    dollSev = n.doll ? 1 : 2; // wrong doll on = yellow, none = red
                } else {
                    // Right SR doll, just short of max level.
                    dollDetail = "Level SR doll to 15";
                    dollSev = eqLv >= 13 ? 0 : 1; // nearly Lv15 = green, else yellow
                }
            }
        }
    }
    // Bond
    let bondGap = false,
        bondCur = 0,
        bondMaxVal = 0;
    const bondMax = bondMaxFor(n);
    if (bondMax != null) {
        const curBond = n.bond ?? 0;
        if (curBond < bondMax) {
            bondGap = true;
            bondCur = curBond;
            bondMaxVal = bondMax;
        }
    }
    return {
        gearCount: badSlots.length,
        badSlots,
        skillGaps,
        dollGap,
        dollDetail,
        dollSev,
        bondGap,
        bondCur,
        bondMax: bondMaxVal,
    };
}

function calcNikkeGearDmgData(n) {
    if (typeof DamageCalc === "undefined") return { currentBoostPct: 0, upgradePct: 0 };
    const currentLines = [];
    SLOTS.forEach((slot) => {
        const gear = n.gear && n.gear[slot];
        if (!gear || !gear.lines) return;
        gear.lines.forEach((l) => {
            if (l.stat && l.val) currentLines.push({ stat: l.stat, val: parseFloat(l.val) });
        });
    });
    const context = { weapon: n.weapon || "AR", elementAdvantage: true };
    const currentAnalysis = DamageCalc.analyzeGearImpact(currentLines, context);
    const upgradedLines = currentLines.map((l) => {
        const stat = normStat(l.stat);
        const prio = (n.priorities || []).find((p) => normStat(p.line) === stat);
        if (!prio || (prio.tier !== "Essential" && prio.tier !== "Ideal")) return l;
        const targetTier = parseInt(prio.targetTier) || 11;
        const curTier = getTier(stat, l.val);
        if (curTier && curTier >= targetTier) return l;
        return { stat: l.stat, val: expectedValAtTarget(stat, targetTier) };
    });
    const cmp = DamageCalc.compareSetups(currentLines, upgradedLines, context);
    return {
        currentBoostPct: currentAnalysis.totalBoostPercent,
        upgradePct: Math.max(0, cmp.diffPercent),
    };
}

let _teamGearSort = { col: "pct", dir: "desc" };
