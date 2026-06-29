// ============================================================
//  RENDER: TEAMS  (independent clone of the Solo Raid screen)
//  Data: state.teamRaids  (separate from state.raids)
//  Reuses shared globals: getVerdict, bondMaxFor, NIKKE_DB_MAP,
//  COLLECTION_DOLLS, TREASURE_NAMES, SLOTS, elemIcon, nikkeIcon,
//  burstDisplay, goToGearNikke, save.
// ============================================================

// Mode metadata: default team count + whether the count is fixed (no add/remove).
const TEAM_MODES = {
    solo: { label: "Solo Raid", teams: 5, fixed: true },
    union: { label: "Union Raid", teams: 3, fixed: true },
    campaign: { label: "Campaign", teams: 1, fixed: false },
};
function rosterTeamCount(raid) {
    if (raid.teamCount) return raid.teamCount;
    return TEAM_MODES[raid.mode] ? TEAM_MODES[raid.mode].teams : 5;
}
// Selected mode in the "New Roster" create form (reset each time the form opens).
let _newRosterMode = "solo";
function setNewRosterMode(mode) {
    _newRosterMode = mode;
    const wrap = document.getElementById("new-roster-mode");
    if (wrap) wrap.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    const bossRow = document.getElementById("solo-boss-row");
    if (bossRow) bossRow.style.display = mode === "solo" ? "" : "none";
    const nameRow = document.getElementById("new-roster-name-row");
    if (nameRow) nameRow.style.display = mode === "solo" ? "none" : "";
    const bossSelect = document.getElementById("solo-boss-select");
    if (bossSelect) bossSelect.value = "";
}


function renderTeams() {
    const el = document.getElementById("teams");
    if (!el) return;
    const sortedRaids = [...state.teamRaids].reverse();
    const raidList =
        sortedRaids
            .map((r) => {
                const modeLabel = TEAM_MODES[r.mode] ? TEAM_MODES[r.mode].label : "Solo Raid";
                return `<div class="nikke-item ${state.selTeamRaid === r.id ? "active" : ""}" onclick="selTeamRaid('${r.id}')">
      ${r.name}
      <div class="nikke-item-sub">${modeLabel}</div>
    </div>`;
            })
            .join("") || '<div style="font-size:14px;color:#475569;padding:6px">No raids created</div>';

    el.innerHTML = `<div class="two-col">
    <div class="nikke-list">
      ${raidList}
      <button class="add-line-btn" onclick="showAddTeamRaidForm()" style="margin-top:8px">+ New Roster</button>
      <div id="add-team-raid-form" class="form-panel" style="max-width:220px">
        <div class="form-row" id="new-roster-name-row" style="display:none"><input class="form-input" id="team-raid-name-input" placeholder="Roster name"/></div>
        <div class="form-row" id="solo-boss-row">
          <select class="form-input" id="solo-boss-select">
            <option value="">Select boss</option>
            ${SOLO_RAID_BOSSES.map((b) => `<option value="${b.season}">S${b.season} · ${b.name}</option>`).join("")}
          </select>
        </div>
        <div class="form-row"><div class="roster-mode-toggle" id="new-roster-mode">
          <button type="button" class="active" data-mode="solo" onclick="setNewRosterMode('solo')">Solo Raid</button>
          <button type="button" data-mode="union" onclick="setNewRosterMode('union')">Union Raid</button>
          <button type="button" data-mode="campaign" onclick="setNewRosterMode('campaign')">Campaign</button>
        </div></div>
        <div class="btn-row"><button class="btn btn-primary" onclick="addTeamRaid()" style="font-size:13px;padding:4px 10px">Add</button></div>
      </div>
    </div>
    <div id="team-main">${state.selTeamRaid ? "" : '<div class="empty-state">← Select or create a raid</div>'}</div>
  </div>`;

    if (state.selTeamRaid) {
        const raid = state.teamRaids.find((r) => r.id === state.selTeamRaid);
        if (raid) renderTeamRaidMain(raid);
    }
}

// ── Raid CRUD ────────────────────────────────────────────────
function selTeamRaid(id) {
    state.selTeamRaid = id;
    state.teamRaidGap = null;
    renderTeams();
}

function showAddTeamRaidForm() {
    const f = document.getElementById("add-team-raid-form");
    if (f) f.classList.add("show");
    setNewRosterMode("solo");
    const nameInput = document.getElementById("team-raid-name-input");
    if (nameInput) nameInput.value = "";
}

function addTeamRaid() {
    const mode = _newRosterMode || "solo";
    let name = "", bossSeason = null;
    if (mode === "solo") {
        const bossSel = document.getElementById("solo-boss-select");
        if (!bossSel || !bossSel.value) return;
        const season = parseInt(bossSel.value);
        const boss = SOLO_RAID_BOSSES.find((b) => b.season === season);
        if (!boss) return;
        name = `S${boss.season} · ${boss.name}`;
        bossSeason = season;
    } else {
        name = (document.getElementById("team-raid-name-input")?.value || "").trim();
        if (!name) return;
    }
    const teamCount = TEAM_MODES[mode] ? TEAM_MODES[mode].teams : 5;
    const raid = { id: "tr" + Date.now(), name, mode, teamCount, entries: [], teamNames: {}, bossSeason };
    state.teamRaids.push(raid);
    state.selTeamRaid = raid.id;
    save();
    renderTeams();
}

function deleteTeamRaid(id) {
    if (!confirm("Delete this raid?")) return;
    state.teamRaids = state.teamRaids.filter((r) => r.id !== id);
    if (state.selTeamRaid === id) state.selTeamRaid = null;
    save();
    renderTeams();
}

function addCampaignTeam(raidId) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid || raid.mode !== "campaign") return;
    raid.teamCount = rosterTeamCount(raid) + 1;
    save();
    renderTeamRaidMain(raid);
}

function deleteCampaignTeam(raidId, teamNum) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid || raid.mode !== "campaign" || teamNum <= 1) return;
    if (!confirm("Delete Team " + teamNum + "?")) return;
    // Drop this team's entries, then shift higher teams down to stay contiguous.
    raid.entries = raid.entries.filter((e) => e.team !== teamNum);
    raid.entries.forEach((e) => {
        if (e.team > teamNum) e.team -= 1;
    });
    // Shift team names the same way.
    const names = raid.teamNames || {};
    const newNames = {};
    Object.keys(names).forEach((k) => {
        const t = parseInt(k);
        if (t < teamNum) newNames[t] = names[k];
        else if (t > teamNum) newNames[t - 1] = names[k];
    });
    raid.teamNames = newNames;
    raid.teamCount = rosterTeamCount(raid) - 1;
    save();
    renderTeamRaidMain(raid);
}

function setTeamRaidView(mode) {
    state.teamRaidView = mode;
    state.teamRaidGap = null;
    const raid = state.teamRaids.find((r) => r.id === state.selTeamRaid);
    if (raid) renderTeamRaidMain(raid);
}

function showEditTeamRaid() {
    const form = document.getElementById("team-raid-edit-form");
    if (form) form.style.display = "";
}
function hideEditTeamRaid() {
    const form = document.getElementById("team-raid-edit-form");
    if (form) form.style.display = "none";
}
function saveEditTeamRaid(id) {
    const raid = state.teamRaids.find((r) => r.id === id);
    if (!raid) return;
    if (raid.mode === "solo") {
        const sel = document.getElementById("team-raid-edit-boss");
        if (sel && sel.value) {
            const season = parseInt(sel.value);
            const boss = SOLO_RAID_BOSSES.find((b) => b.season === season);
            if (boss) { raid.bossSeason = season; raid.name = `S${boss.season} · ${boss.name}`; }
        }
    } else {
        const name = (document.getElementById("team-raid-edit-name")?.value || "").trim();
        if (name) raid.name = name;
    }
    save();
    renderTeams();
}

// ── Main panel (header + active view) ────────────────────────
function renderTeamRaidMain(raid) {
    const area = document.getElementById("team-main");
    if (!area) return;
    const modeLabel = TEAM_MODES[raid.mode] ? TEAM_MODES[raid.mode].label : "Solo Raid";
    const boss = (raid.mode === "solo" && raid.bossSeason != null)
        ? SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason) : null;
    const weaknessHtml = boss ? ` ${elemIcon(boss.weakness, 22)} <span style="font-size:12px;color:#94a3b8">Weak</span>` : "";
    const raidDisplayName = `${raid.name}${weaknessHtml} <span class="roster-mode-badge">${modeLabel}</span>`;
    const totalDmg = raid.entries.reduce((s, e) => s + (e.damage || 0), 0);

    const bodyHtml = renderTeamSlots(raid);

    area.innerHTML = `
    <div class="team-main-header">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="team-raid-title">${raidDisplayName}</span>
        <button class="btn-sm" onclick="showEditTeamRaid()" title="Edit raid" style="font-size:12px;padding:2px 6px;min-width:auto">✎</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;color:#64748b">Total <strong style="color:#f1f5f9">${totalDmg ? totalDmg.toLocaleString() + "M" : "—"}</strong></span>
        <button class="del-btn" onclick="deleteTeamRaid('${raid.id}')" title="Delete raid">✕ Delete</button>
      </div>
    </div>
    <div id="team-raid-edit-form" style="display:none;margin-bottom:10px;padding:10px;background:#151c2b;border:1px solid #1e2535;border-radius:8px">
      <div style="display:flex;gap:6px;align-items:flex-start">
        ${raid.mode === "solo"
            ? `<select class="form-input" id="team-raid-edit-boss" style="flex:1;font-size:14px;padding:4px 8px">
                <option value="">Select boss</option>
                ${SOLO_RAID_BOSSES.map((b) => `<option value="${b.season}"${raid.bossSeason === b.season ? " selected" : ""}>S${b.season} · ${b.name}</option>`).join("")}
               </select>`
            : `<input class="form-input" id="team-raid-edit-name" value="${raid.name.replace(/"/g, "&quot;")}" placeholder="Roster name" style="flex:1;font-size:14px;padding:4px 8px"/>`
        }
        <div style="display:flex;gap:4px;padding-top:1px">
          <button class="btn btn-primary" onclick="saveEditTeamRaid('${raid.id}')" style="font-size:13px;padding:4px 10px">Save</button>
          <button class="btn-sm" onclick="hideEditTeamRaid()" style="font-size:13px;padding:4px 8px">Cancel</button>
        </div>
      </div>
    </div>
    ${bodyHtml}`;
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

function _buildTeamLaneHtml(raid, tnum, members, total, maxTeam, maxEntry, isCampaign) {
    const teamColor = (pct) => (pct >= 80 ? "#4ade80" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#f87171");
    const pct = (total / maxTeam) * 100;
    const tColor = total === 0 ? "#64748b" : teamColor(pct);
    const slots = [];
    for (let i = 0; i < 5; i++) {
        slots.push(renderTeamSlot(raid, tnum, i, members[i] || null, maxEntry));
    }
    const delTeamBtn =
        isCampaign && tnum > 1
            ? `<button class="team-del-btn" onclick="deleteCampaignTeam('${raid.id}',${tnum})" title="Delete team">✕</button>`
            : "";
    let elemWarningHtml = "";
    if (raid.mode === "solo" && raid.bossSeason != null) {
        const _ewBoss = SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason);
        if (_ewBoss && _ewBoss.weakness) {
            const _ewNikkes = members.map((e) => state.nikkes.find((x) => x.id === e.nikkeId)).filter(Boolean);
            if (_ewNikkes.length > 0 && !_ewNikkes.some((n) => n.element === _ewBoss.weakness)) {
                elemWarningHtml = `<div class="team-elem-warning">⚠ No ${elemIcon(_ewBoss.weakness)} ${_ewBoss.weakness} · Boss Weak</div>`;
            }
        }
    }
    let burstWarningHtml = "";
    const _bwNikkes = members.map((e) => state.nikkes.find((x) => x.id === e.nikkeId)).filter(Boolean);
    if (_bwNikkes.length === 5) {
        const getBurstCat = (n) => (n.burst1 && n.burst2 && n.burst3) || n.burst3 ? 3 : n.burst2 ? 2 : n.burst1 ? 1 : null;
        const b1 = _bwNikkes.filter((n) => getBurstCat(n) === 1).length;
        const b2 = _bwNikkes.filter((n) => getBurstCat(n) === 2).length;
        const b3 = _bwNikkes.filter((n) => getBurstCat(n) === 3).length;
        const missing = [];
        if (b1 < 1) missing.push("Burst I");
        if (b2 < 1) missing.push("Burst II");
        if (b3 < 2) missing.push("Burst III");
        if (missing.length) burstWarningHtml = `<div class="team-elem-warning">⚠ Missing ${missing.join(" · ")}</div>`;
    }
    const readinessHtml = renderTeamReadinessInline(raid, tnum, members);
    return `<div class="team-lane" id="team-lane-${raid.id}-${tnum}">
    <div class="team-lane-header">
      <span class="team-label" id="team-name-${raid.id}-${tnum}">${getTeamName(raid, tnum)}</span>
      <button class="btn-sm" onclick="startEditTeamName('${raid.id}',${tnum})" title="Rename team" style="font-size:12px;padding:2px 6px;min-width:auto">✎</button>
      <span class="team-total" style="color:${tColor}">${total ? total.toLocaleString() + "M" : ""}</span>
      ${delTeamBtn}
    </div>
    <div class="team-slots">${slots.join("")}</div>
    ${elemWarningHtml}
    ${burstWarningHtml}
    ${readinessHtml}
  </div>`;
}

function renderTeamSlots(raid) {
    const isCampaign = raid.mode === "campaign";
    const { teamNums, teams, teamTotals, maxTeam, maxEntry } = _raidLaneMetrics(raid);
    const lanes = teamNums
        .map((t, ti) => _buildTeamLaneHtml(raid, t, teams[t], teamTotals[ti], maxTeam, maxEntry, isCampaign))
        .join("");
    const addTeamBtn = isCampaign
        ? `<button class="add-line-btn" style="margin-top:9px" onclick="addCampaignTeam('${raid.id}')">+ Add Team</button>`
        : "";
    return `<div class="team-lanes">${lanes}</div>
      ${addTeamBtn}
      ${renderTeamSlotPickerOverlay()}`;
}

function _rerenderTeamLane(raid, tnum) {
    const el = document.getElementById(`team-lane-${raid.id}-${tnum}`);
    if (!el) { renderTeamRaidMain(raid); return; }
    const isCampaign = raid.mode === "campaign";
    const { teamNums, teams, teamTotals, maxTeam, maxEntry } = _raidLaneMetrics(raid);
    const ti = teamNums.indexOf(tnum);
    el.outerHTML = _buildTeamLaneHtml(raid, tnum, teams[tnum] || [], teamTotals[ti] || 0, maxTeam, maxEntry, isCampaign);
}

function _rerenderTeamReadiness(raid, tnum) {
    const el = document.getElementById(`team-readiness-${raid.id}-${tnum}`);
    if (!el) { renderTeamRaidMain(raid); return; }
    const members = raid.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === tnum);
    el.outerHTML = renderTeamReadinessInline(raid, tnum, members);
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
    const pct = maxEntry > 0 ? ((entry.damage || 0) / maxEntry) * 100 : 0;
    const dmgColor = !entry.damage ? "#5d6779" : pct >= 80 ? "#4ade80" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#f87171";
    return `<div class="team-slot team-slot-filled">
      ${n ? nikkeIcon(name, 34) : ""}
      <div class="team-slot-info">
        <span class="team-slot-name">${elem} ${name}</span>
        <div class="team-slot-dmg-row">
          <input class="team-slot-dmg-input" type="text" inputmode="numeric" value="${entry.damage || ""}" placeholder="0" style="color:${dmgColor}"
                 onclick="event.stopPropagation()"
                 onblur="commitTeamDmgInput(this,'${raid.id}',${entry.origIdx})"
                 onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){this.dataset.cancel='1';this.blur();}"/>
          <span class="team-slot-dmg-suffix">M Dmg</span>
        </div>
      </div>
      <button class="team-slot-remove" onclick="event.stopPropagation();removeTeamSlot('${raid.id}',${entry.origIdx})" title="Remove">&times;</button>
    </div>`;
}

function renderTeamSlotPickerOverlay() {
    return `<div class="team-slot-picker-overlay" id="team-slot-picker-overlay" onclick="if(event.target===this)closeTeamSlotPicker()">
      <div class="team-slot-picker-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:14px;font-weight:600;color:#f1f5f9">Pick a Nikke</span>
          <button class="del-btn" onclick="closeTeamSlotPicker()" style="font-size:16px">✕</button>
        </div>
        <input class="form-input" id="team-slot-picker-search" placeholder="Search..." oninput="filterTeamSlotPicker()" style="margin-bottom:8px"/>
        <div id="team-slot-picker-list" class="team-slot-picker-list"></div>
      </div>
    </div>`;
}

// ── Slot picker ──────────────────────────────────────────────
let _teamSlotPickerState = { raidId: null, team: null, slot: null };

function openTeamSlotPicker(raidId, teamNum, slotIdx) {
    _teamSlotPickerState = { raidId, team: teamNum, slot: slotIdx };
    const overlay = document.getElementById("team-slot-picker-overlay");
    if (overlay) {
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
    if (overlay) overlay.classList.remove("show");
    _teamSlotPickerState = { raidId: null, team: null, slot: null };
}

function filterTeamSlotPicker() {
    const search = document.getElementById("team-slot-picker-search");
    const list = document.getElementById("team-slot-picker-list");
    if (!list) return;
    const q = search ? search.value.toLowerCase() : "";
    const raid = state.teamRaids.find((r) => r.id === _teamSlotPickerState.raidId);
    if (!raid) {
        list.innerHTML = "";
        return;
    }
    const assignedIds = new Set(raid.entries.filter((e) => e.team && e.team > 0).map((e) => e.nikkeId));
    const available = state.nikkes
        .filter((n) => !assignedIds.has(n.id) && n.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name));
    list.innerHTML =
        available
            .map((n) => {
                const elem = n.element ? elemIcon(n.element) : "";
                return `<div class="team-slot-picker-item" onclick="pickTeamSlotNikke('${n.id}')">
      ${nikkeIcon(n.name, 28)}
      <span>${n.name}</span>
      <span style="font-size:12px;color:#64748b;margin-left:auto">${elem} ${burstDisplay(n)}</span>
    </div>`;
            })
            .join("") || '<div style="padding:8px;color:#475569;font-size:13px">No available Nikkes</div>';
}

function pickTeamSlotNikke(nikkeId) {
    const { raidId, team } = _teamSlotPickerState;
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    raid.entries.push({ nikkeId, damage: 0, team });
    save();
    closeTeamSlotPicker();
    _rerenderTeamLane(raid, team);
}

function removeTeamSlot(raidId, entryIdx) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    const tnum = raid.entries[entryIdx]?.team;
    raid.entries.splice(entryIdx, 1);
    save();
    if (tnum) _rerenderTeamLane(raid, tnum); else renderTeamRaidMain(raid);
}

// ── Inline damage editing ────────────────────────────────────
function startEditTeamDmg(span, raidId, entryIdx, currentVal) {
    const input = document.createElement("input");
    input.className = "team-slot-dmg-input";
    input.type = "text";
    input.inputMode = "numeric";
    input.value = currentVal || "";
    input.placeholder = "0";
    input.onblur = () => commitTeamDmg(input, raidId, entryIdx);
    input.onkeydown = (event) => {
        if (event.key === "Enter") input.blur();
        if (event.key === "Escape") {
            input.dataset.cancel = "1";
            input.blur();
        }
    };
    span.replaceWith(input);
    input.focus();
    input.select();
}

function commitTeamDmg(input, raidId, entryIdx) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    if (input.dataset.cancel === "1") {
        renderTeamRaidMain(raid);
        return;
    }
    const val = parseInt((input.value || "").replace(/[^0-9]/g, "")) || 0;
    if (!raid.entries[entryIdx]) return;
    raid.entries[entryIdx].damage = val;
    save();
    renderTeamRaidMain(raid);
}

function commitTeamDmgInput(input, raidId, entryIdx) {
    if (input.dataset.cancel === "1") { input.dataset.cancel = ""; return; }
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid || !raid.entries[entryIdx]) return;
    const val = parseInt((input.value || "").replace(/[^0-9]/g, "")) || 0;
    if (raid.entries[entryIdx].damage === val) return;
    raid.entries[entryIdx].damage = val;
    save();
    renderTeamRaidMain(raid);
}

// ── Team names ───────────────────────────────────────────────
function getTeamName(raid, teamNum) {
    return (raid.teamNames && raid.teamNames[teamNum]) || "Team " + teamNum;
}

function startEditTeamName(raidId, teamNum) {
    const span = document.getElementById("team-name-" + raidId + "-" + teamNum);
    if (!span) return;
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    const input = document.createElement("input");
    input.className = "team-label-input";
    input.type = "text";
    input.value = getTeamName(raid, teamNum);
    input.onblur = () => commitTeamName(input, raidId, teamNum);
    input.onkeydown = (event) => {
        if (event.key === "Enter") input.blur();
        if (event.key === "Escape") { input.dataset.cancel = "1"; input.blur(); }
    };
    span.replaceWith(input);
    input.focus();
    input.select();
}

function commitTeamName(input, raidId, teamNum) {
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    if (input.dataset.cancel === "1") { renderTeamRaidMain(raid); return; }
    const val = input.value.trim();
    if (!raid.teamNames) raid.teamNames = {};
    raid.teamNames[teamNum] = (val && val !== "Team " + teamNum) ? val : "";
    save();
    renderTeamRaidMain(raid);
}

// ── Inline readiness (rendered below each team's slots) ─────
function renderTeamReadinessInline(raid, tnum, members) {
    if (!members.length) return `<div id="team-readiness-${raid.id}-${tnum}"></div>`;
    const details = { gear: [], skills: [], dolls: [], bond: [] };
    members.forEach((e) => {
        const n = state.nikkes.find((x) => x.id === e.nikkeId);
        if (!n) return;
        const g = getTeamRaidGaps(n);
        const base = { nikkeId: n.id, name: n.name, elem: n.element ? elemIcon(n.element) : "" };
        if (g.gearCount) details.gear.push({ ...base, detail: `${g.gearCount} slot${g.gearCount > 1 ? "s" : ""} · ${g.badSlots.join(", ")}` });
        if (g.skillGaps.length) details.skills.push({ ...base, detail: g.skillGaps.map((s) => `${s.label} ${s.cur}→${s.rec}`).join(", ") });
        if (g.dollGap) details.dolls.push({ ...base, detail: `Needs ${g.dollLabel}` });
        if (g.bondGap) details.bond.push({ ...base, detail: g.bondDetail });
    });
    const CATS = [
        { key: "gear", label: "Gear" },
        { key: "skills", label: "Skills" },
        { key: "dolls", label: "Dolls" },
        { key: "bond", label: "Bond" },
    ];
    const selKey = state.teamRaidGap || "";
    const counts = { gear: details.gear.length, skills: details.skills.length, dolls: details.dolls.length, bond: details.bond.length };
    const chips = CATS.map((cd) => {
        const count = counts[cd.key];
        const active = selKey === tnum + ":" + cd.key;
        const cls = `team-gap-chip${count ? "" : " empty"}${active ? " active" : ""}`;
        const onclick = count ? ` onclick="selTeamGap('${tnum}:${cd.key}')"` : "";
        return `<button class="${cls}"${onclick}>${cd.label} <span class="team-gap-count">${count}</span></button>`;
    }).join("");
    const showCat = selKey.startsWith(tnum + ":") ? selKey.split(":")[1] : "";
    const list = showCat ? details[showCat] : [];
    let listHtml = "";
    if (showCat && list.length) {
        const catLabel = CATS.find((c) => c.key === showCat).label;
        listHtml = `<div class="team-gap-list">
          <div class="team-gap-list-label">${catLabel} · ${list.length} Nikke${list.length !== 1 ? "s" : ""} lacking</div>
          ${list.map((m) => `<button class="team-gap-item" onclick="goToGearNikke('${m.nikkeId}')">
            ${nikkeIcon(m.name, 28)}
            <span class="team-gap-item-name">${m.elem} ${m.name}</span>
            <span class="team-gap-item-detail">${m.detail}</span>
          </button>`).join("")}
        </div>`;
    }
    return `<div id="team-readiness-${raid.id}-${tnum}"><div class="team-gap-chips">${chips}</div>${listHtml}</div>`;
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
    // Skills
    const skillGaps = [];
    const db = NIKKE_DB_MAP.get(n.name);
    if (db && db.build && db.build.skill && db.build.skill.pve && db.build.skill.pve.rec) {
        const rec = db.build.skill.pve.rec;
        const cur = [n.skill1 ?? 0, n.skill2 ?? 0, n.skill3 ?? 0];
        const labels = ["S1", "S2", "Burst"];
        [rec.s1, rec.s2, rec.s3].forEach((target, i) => {
            if (target != null && cur[i] < target) skillGaps.push({ label: labels[i], cur: cur[i], rec: target });
        });
    }
    // Dolls
    let dollGap = false,
        dollLabel = "";
    if (db) {
        const isTreasure = TREASURE_NAMES.has(n.name);
        if (isTreasure) {
            const recDoll = COLLECTION_DOLLS.find((d) => d.treasure === n.name);
            const done = !!(n.doll && recDoll && n.doll.tid === recDoll.id);
            if (!done && recDoll) {
                dollGap = true;
                dollLabel = `[${recDoll.rarity}] ${recDoll.name}`;
            }
        } else {
            const recDoll = COLLECTION_DOLLS.find((d) => d.rarity === "SR" && d.weapon === db.weapon);
            const eq = n.doll ? COLLECTION_DOLLS.find((d) => d.id === n.doll.tid) : null;
            const done = !!(eq && eq.rarity === "SR" && n.doll.lv === 15);
            if (!done && recDoll) {
                dollGap = true;
                dollLabel = "[SR] Lv15";
            }
        }
    }
    // Bond
    let bondGap = false,
        bondDetail = "";
    const bondMax = bondMaxFor(n);
    if (bondMax != null) {
        const curBond = n.bond ?? 0;
        if (curBond < bondMax) {
            bondGap = true;
            bondDetail = `Bond ${curBond}/${bondMax}`;
        }
    }
    return {
        gearCount: badSlots.length,
        badSlots,
        skillGaps,
        dollGap,
        dollLabel,
        bondGap,
        bondDetail,
    };
}

function renderTeamReadiness(raid) {
    const count = rosterTeamCount(raid);
    const teamNums = Array.from({ length: count }, (_, i) => i + 1);
    const teams = {};
    teamNums.forEach((t) => (teams[t] = []));
    raid.entries.forEach((e) => {
        if (e.team && teams[e.team]) teams[e.team].push(e);
    });
    const selKey = state.teamRaidGap || "";
    const CATS = [
        { key: "gear", label: "Gear" },
        { key: "skills", label: "Skills" },
        { key: "dolls", label: "Dolls" },
        { key: "bond", label: "Bond" },
    ];

    const cards = teamNums
        .map((tnum) => {
            const members = teams[tnum];
            const details = { gear: [], skills: [], dolls: [], bond: [] };
            members.forEach((e) => {
                const n = state.nikkes.find((x) => x.id === e.nikkeId);
                if (!n) return;
                const g = getTeamRaidGaps(n);
                const base = { nikkeId: n.id, name: n.name, elem: n.element ? elemIcon(n.element) : "" };
                if (g.gearCount) details.gear.push({ ...base, detail: `${g.gearCount} slot${g.gearCount > 1 ? "s" : ""} · ${g.badSlots.join(", ")}` });
                if (g.skillGaps.length) details.skills.push({ ...base, detail: g.skillGaps.map((s) => `${s.label} ${s.cur}→${s.rec}`).join(", ") });
                if (g.dollGap) details.dolls.push({ ...base, detail: `Needs ${g.dollLabel}` });
                if (g.bondGap) details.bond.push({ ...base, detail: g.bondDetail });
            });
            const memberCount = members.length || 1;
            const counts = { gear: details.gear.length, skills: details.skills.length, dolls: details.dolls.length, bond: details.bond.length };
            const totalGaps = counts.gear + counts.skills + counts.dolls + counts.bond;
            const ready = Math.max(0, Math.round(100 - (totalGaps / (memberCount * 4)) * 100));
            const rc = ready >= 75 ? "#4ade80" : ready >= 45 ? "#fbbf24" : "#f87171";

            const chips = CATS.map((cd) => {
                const count = counts[cd.key];
                const active = selKey === tnum + ":" + cd.key;
                const cls = `team-gap-chip${count ? "" : " empty"}${active ? " active" : ""}`;
                const onclick = count ? ` onclick="selTeamGap('${tnum}:${cd.key}')"` : "";
                return `<button class="${cls}"${onclick}>${cd.label} <span class="team-gap-count">${count}</span></button>`;
            }).join("");

            const showCat = selKey.indexOf(tnum + ":") === 0 ? selKey.split(":")[1] : "";
            const list = showCat ? details[showCat] : [];
            let listHtml = "";
            if (showCat && list.length) {
                const catLabel = CATS.find((c) => c.key === showCat).label;
                listHtml = `<div class="team-gap-list">
          <div class="team-gap-list-label">${catLabel} · ${list.length} Nikke${list.length !== 1 ? "s" : ""} lacking</div>
          ${list
              .map(
                  (m) => `<button class="team-gap-item" onclick="goToGearNikke('${m.nikkeId}')">
            ${nikkeIcon(m.name, 28)}
            <span class="team-gap-item-name">${m.elem} ${m.name}</span>
            <span class="team-gap-item-detail">${m.detail}</span>
          </button>`,
              )
              .join("")}
        </div>`;
            }

            return `<div class="team-readiness-card">
        <div class="team-readiness-header">
          <span class="team-label">${getTeamName(raid, tnum)}</span>
          <div class="team-readiness-bar"><div class="team-readiness-fill" style="width:${members.length ? ready : 0}%;background:${rc}"></div></div>
          <span class="team-readiness-pct" style="color:${members.length ? rc : "#5d6779"}">${members.length ? ready + "%" : "—"}</span>
        </div>
        <div class="team-gap-chips">${chips}</div>
        ${listHtml}
      </div>`;
        })
        .join("");

    return `<div class="team-readiness-list">${cards}</div>`;
}

function selTeamGap(key) {
    const prevKey = state.teamRaidGap;
    state.teamRaidGap = prevKey === key ? null : key;
    const raid = state.teamRaids.find((r) => r.id === state.selTeamRaid);
    if (!raid) return;
    const affected = new Set();
    if (prevKey) affected.add(parseInt(prevKey.split(":")[0]));
    if (state.teamRaidGap) affected.add(parseInt(state.teamRaidGap.split(":")[0]));
    affected.forEach((tnum) => _rerenderTeamReadiness(raid, tnum));
}
