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
// Whether the roster list is collapsed. Only has a visual effect on mobile
// (≤768px) — on desktop the list is always shown via CSS. Auto-collapses when a
// roster is selected so the team lanes take focus on small screens.
let _rosterListCollapsed = false;
function toggleRosterList() {
    _rosterListCollapsed = !_rosterListCollapsed;
    const sb = document.querySelector("#teams .nikke-sidebar");
    if (!sb) return;
    sb.classList.toggle("roster-collapsed", _rosterListCollapsed);
    const tog = sb.querySelector(".roster-list-toggle");
    if (tog) tog.setAttribute("aria-expanded", String(!_rosterListCollapsed));
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
    const nameRow = document.getElementById("new-roster-name-row");
    if (nameRow) nameRow.style.display = mode === "solo" ? "none" : "";
    const bossSelect = document.getElementById("solo-boss-select");
    if (bossSelect) bossSelect.value = "";
    // Switching mode is a fresh start — drop any stale validation highlights.
    clearRosterFieldError(document.getElementById("solo-boss-select"));
    clearRosterFieldError(document.getElementById("team-raid-name-input"));
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
      <span id="roster-name-${r.id}">${r.name}</span>
      <div class="nikke-item-sub">${modeLabel}</div>
    </div>`;
            })
            .join("") || '<div style="font-size:14px;color:#475569;padding:6px">No rosters created</div>';

    el.innerHTML = `<div class="two-col">
    <div class="nikke-sidebar${_rosterListCollapsed ? " roster-collapsed" : ""}">
      <button type="button" class="roster-list-toggle" onclick="toggleRosterList()" aria-expanded="${!_rosterListCollapsed}">
        <span class="roster-list-chevron">›</span>
        <span>Rosters</span>
        <span class="roster-list-count">${state.teamRaids.length}</span>
      </button>
      <div class="roster-list-collapsible">
        <button class="add-line-btn" onclick="showAddTeamRaidForm()" style="width:100%">+ New Roster</button>
        <div id="add-team-raid-form" class="form-panel" style="max-width:100%">
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
          <div class="btn-row"><button class="btn" onclick="hideAddTeamRaidForm()" style="font-size:13px;padding:4px 10px">Cancel</button><button class="btn btn-roster-add" onclick="addTeamRaid()" style="font-size:13px;padding:4px 10px">Add</button></div>
        </div>
        <div class="nikke-list">
          ${raidList}
        </div>
      </div>
    </div>
    <div id="team-main">${state.selTeamRaid ? "" : '<div class="empty-state">← Select or create a roster</div>'}</div>
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
    _rosterListCollapsed = true; // mobile: hide the list so the picked roster's lanes show
    renderTeams();
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
        bossSeason = null;
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
    } else {
        const nameInput = document.getElementById("team-raid-name-input");
        name = (nameInput?.value || "").trim();
        if (!name) {
            flagRosterFieldError(nameInput);
            return;
        }
    }
    const teamCount = TEAM_MODES[mode] ? TEAM_MODES[mode].teams : 5;
    const raid = { id: "tr" + Date.now(), name, mode, teamCount, entries: [], teamNames: {}, bossSeason };
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

function startEditRaidName(raidId) {
    const span = document.getElementById("raid-title-" + raidId);
    if (!span) return;
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (!raid) return;
    if (raid.mode === "solo") {
        const select = document.createElement("select");
        select.className = "team-raid-title-input";
        select.style.fontSize = "15px";
        SOLO_RAID_BOSSES.forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b.season;
            opt.textContent = `S${b.season} · ${b.name}`;
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
            _reconcileTeamReadiness(raid, tnum);
        });
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

    const bodyHtml = renderTeamSlots(raid);

    area.innerHTML = `
    <div class="team-main-header">
      <div style="display:flex;align-items:flex-start;gap:8px">
        <div>
          <span class="team-raid-title" id="raid-title-${raid.id}">${raid.name}</span>
          ${raidSubtitle}
        </div>
        <button class="btn-sm" onclick="startEditRaidName('${raid.id}')" title="Edit raid" style="font-size:12px;padding:2px 6px;min-width:auto;margin-top:4px">✎</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span id="raid-total-${raid.id}" style="font-size:13px;color:#64748b">Total <strong style="color:#f1f5f9">${totalDmg ? totalDmg.toLocaleString() + "m" : "—"}</strong></span>
        <button class="del-btn" onclick="deleteTeamRaid('${raid.id}')" title="Delete raid">✕ Delete</button>
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

// Element + burst coverage warnings for a team lane header. Depends only on the
// team's composition, so it can be recomputed in place when a nikke is added or
// removed without rebuilding the slot cards.
function _teamWarningsHtml(raid, tnum, members) {
    const teamWeakness = raid.mode === "union" ? getTeamWeakness(raid, tnum) : null;
    let elemWarningHtml = "";
    if (raid.mode === "solo" && raid.bossSeason != null) {
        const _ewBoss = SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason);
        if (_ewBoss && _ewBoss.weakness) {
            const _ewNikkes = members.map((e) => state.nikkes.find((x) => x.id === e.nikkeId)).filter(Boolean);
            if (_ewNikkes.length > 0 && !_ewNikkes.some((n) => n.element === _ewBoss.weakness)) {
                elemWarningHtml = `<div class="team-elem-warning">⚠ Missing ${elemIcon(_ewBoss.weakness)}</div>`;
            }
        }
    } else if (raid.mode === "union" && teamWeakness) {
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
    const readinessHtml = renderTeamReadinessInline(raid, tnum, members);
    return `<div class="team-lane" id="team-lane-${raid.id}-${tnum}">
    <div class="team-lane-header">
      <div class="team-name-group" id="team-name-group-${raid.id}-${tnum}">${renderTeamNameGroupStatic(raid, tnum)}</div>
      <span class="team-warnings" id="team-warnings-${raid.id}-${tnum}" style="display:contents">${_teamWarningsHtml(raid, tnum, members)}</span>
      <span class="team-total" id="team-total-${raid.id}-${tnum}" style="color:${tColor};margin-left:auto">${total ? total.toLocaleString() + "m" : ""}</span>
      ${delTeamBtn}
    </div>
    <div id="team-dmgbar-${raid.id}-${tnum}">${renderTeamDmgBar(raid, tnum, members)}</div>
    <div class="team-slots">${slots.join("")}</div>
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
    if (!el) {
        renderTeamRaidMain(raid);
        return;
    }
    const isCampaign = raid.mode === "campaign";
    const { teamNums, teams, teamTotals, maxTeam, maxEntry } = _raidLaneMetrics(raid);
    const ti = teamNums.indexOf(tnum);
    el.outerHTML = _buildTeamLaneHtml(
        raid,
        tnum,
        teams[tnum] || [],
        teamTotals[ti] || 0,
        maxTeam,
        maxEntry,
        isCampaign,
    );
}

// Rebuild a team's readiness section from the canonical renderer, then transplant
// the already-loaded icon nodes from the previous rows into the matching new rows
// (keyed by nikkeId) so their <img> elements are moved, not recreated. This lets
// rows be added/removed/reordered and values change (when a nikke is added or
// removed) without the surviving rows' icons flickering.
function _reconcileTeamReadiness(raid, tnum) {
    const liveEl = document.getElementById(`team-readiness-${raid.id}-${tnum}`);
    if (!liveEl) { renderTeamRaidMain(raid); return; }
    const members = raid.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === tnum);
    const fresh = _htmlToNode(renderTeamReadinessInline(raid, tnum, members));
    if (!fresh) { liveEl.replaceChildren(); return; }
    const oldIcons = new Map();
    liveEl.querySelectorAll(".team-gap-item[data-nikke-id]").forEach((row) => {
        if (row.firstElementChild && !oldIcons.has(row.dataset.nikkeId)) {
            oldIcons.set(row.dataset.nikkeId, row.firstElementChild);
        }
    });
    fresh.querySelectorAll(".team-gap-item[data-nikke-id]").forEach((row) => {
        const oldIcon = oldIcons.get(row.dataset.nikkeId);
        if (oldIcon && row.firstElementChild) row.replaceChild(oldIcon, row.firstElementChild);
    });
    liveEl.replaceChildren(...fresh.childNodes);
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
        <div class="team-slot-dmg-row">
          <input class="team-slot-dmg-input" type="text" inputmode="numeric" value="${(entry.damage || 0).toLocaleString()}"
                 onclick="event.stopPropagation()"
                 onfocus="this.value=this.value.replace(/,/g,'');if(this.value==='0')this.value=''"
                 oninput="this.value=this.value.replace(/[^0-9]/g,'')"
                 onblur="commitTeamDmgInput(this,'${raid.id}',${entry.origIdx})"
                 onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){this.dataset.cancel='1';this.blur();}"/>
          <span class="team-slot-dmg-suffix">m Dmg</span>
        </div>
      </div>
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
let _teamSlotPickerState = { raidId: null, team: null, slot: null, entryIdx: null };

function openTeamSlotPicker(raidId, teamNum, slotIdx) {
    _teamSlotPickerState = { raidId, team: teamNum, slot: slotIdx, entryIdx: null };
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

function openTeamSlotPickerEdit(raidId, teamNum, entryIdx) {
    _teamSlotPickerState = { raidId, team: teamNum, slot: null, entryIdx };
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
    const assignedIds = new Set(raid.entries.filter((e) => e.team && e.team > 0).map((e) => e.nikkeId));
    if (currentNikkeId) assignedIds.delete(currentNikkeId);
    const available = state.nikkes
        .filter((n) => !assignedIds.has(n.id) && n.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name));
    const removeBtn =
        entryIdx != null
            ? `<div class="team-slot-picker-item team-slot-picker-remove" onclick="removeTeamSlotFromPicker()">
      <span style="font-size:16px;line-height:1">✕</span>
      <span>Remove from team</span>
    </div>`
            : "";
    list.innerHTML =
        removeBtn +
        (available
            .map((n) => {
                const elem = n.element ? elemIcon(n.element) : "";
                return `<div class="team-slot-picker-item" onclick="pickTeamSlotNikke('${n.id}')">
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
    if (!tnum) { renderTeamRaidMain(raid); return; }
    // The splice shifted the index of every later entry, so re-sync the slot
    // handlers on the OTHER lanes too (icon-preserving); only the changed team's
    // warnings/bar/readiness/totals need rebuilding.
    const { teamNums } = _raidLaneMetrics(raid);
    teamNums.forEach((t) => { if (t !== tnum) _resyncTeamSlotIdx(raid, t); });
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
    if (raidTotalEl) raidTotalEl.innerHTML = `Total <strong style="color:#f1f5f9">${raidTotal ? raidTotal.toLocaleString() + "m" : "—"}</strong>`;
}

// Surgically update only the damage-dependent displays without touching nikke
// icons, names, or warnings (none of which depend on damage). The gear-upgrade
// bar and the Potential/Eff table are weighted by each nikke's own damage, so
// only the changed team needs those refreshed.
function _updateTeamDmgDisplays(raid, changedTeam) {
    _updateAllTeamTotals(raid);
    const { teams } = _raidLaneMetrics(raid);
    const barEl = document.getElementById(`team-dmgbar-${raid.id}-${changedTeam}`);
    if (barEl) barEl.innerHTML = renderTeamDmgBar(raid, changedTeam, teams[changedTeam] || []);
    _updateTeamGearVals(raid, changedTeam);
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
    if (!laneEl) { renderTeamRaidMain(raid); return; }
    const slotsEl = laneEl.querySelector(".team-slots");
    if (!slotsEl) { _rerenderTeamLane(raid, tnum); return; }
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
// removed: the slot cards (icon-preserving), coverage warnings, gear-upgrade
// bar, readiness gaps, and all team totals/colors.
function _updateTeamLaneComposition(raid, tnum) {
    _reconcileTeamSlots(raid, tnum);
    const members = raid.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === tnum);
    const warnEl = document.getElementById(`team-warnings-${raid.id}-${tnum}`);
    if (warnEl) warnEl.innerHTML = _teamWarningsHtml(raid, tnum, members);
    const barEl = document.getElementById(`team-dmgbar-${raid.id}-${tnum}`);
    if (barEl) barEl.innerHTML = renderTeamDmgBar(raid, tnum, members);
    _reconcileTeamReadiness(raid, tnum);
    _updateAllTeamTotals(raid);
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
    const weakness = raid.mode === "union" ? getTeamWeakness(raid, tnum) : null;
    const weaknessBadge = weakness
        ? ` <span class="team-weakness-badge"> · ${elemIcon(weakness, 16)} <span class="team-weakness-text">${weakness} Weak</span></span>`
        : "";
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
    input.value = getTeamName(raid, teamNum);
    group.appendChild(input);

    let weaknessSelect = null;
    if (raid.mode === "union") {
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
            const val = input.value.trim();
            if (!r.teamNames) r.teamNames = {};
            r.teamNames[teamNum] = val && val !== "Team " + teamNum ? val : "";
            if (r.mode === "union" && weaknessSelect) {
                if (!r.teamWeakness) r.teamWeakness = {};
                r.teamWeakness[teamNum] = weaknessSelect.value || null;
            }
            save();
            // Weakness also drives the element-coverage warning; refresh it in
            // place so the slot cards (and their icons) aren't re-rendered.
            if (r.mode === "union") {
                const members = r.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === teamNum);
                const warnEl = document.getElementById(`team-warnings-${raidId}-${teamNum}`);
                if (warnEl) warnEl.innerHTML = _teamWarningsHtml(r, teamNum, members);
            }
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

// ── Team element weakness (union raids) ─────────────────────
function getTeamWeakness(raid, teamNum) {
    return (raid.teamWeakness && raid.teamWeakness[teamNum]) || null;
}

// ── Inline readiness (rendered below each team's slots) ─────

// Per-team readiness gap details. gainPct/potentialM/bestEff are the only
// damage-dependent fields (updated in place by _updateTeamGearVals); everything
// else derives from gear/skill/doll/bond state and is unaffected by damage.
function _computeTeamReadinessDetails(raid, members) {
    const details = { gear: [], skills: [], dolls: [], bond: [] };
    const boss = raid.mode === "solo" && raid.bossSeason != null
        ? SOLO_RAID_BOSSES.find((b) => b.season === raid.bossSeason)
        : null;
    members.forEach((e) => {
        const n = state.nikkes.find((x) => x.id === e.nikkeId);
        if (!n) return;
        const savedElementalBoss = state.elementalBoss;
        if (boss && boss.weakness && n.element !== boss.weakness) state.elementalBoss = false;
        const g = getTeamRaidGaps(n);
        const gainPct = getNikkeTotalGainPct(n);
        let bestEff = 0, bestSlot = "";
        if (e.damage) {
            SLOTS.forEach((slot) => {
                const sv = getVerdict(n, slot);
                if (!sv || sv.cls === "v-keep") return;
                let rocks = 0, dpsGain = 0;
                if (sv.options) {
                    const rec = sv.options.find((o) => o.recommended) || sv.options[0];
                    rocks = rec.rocks;
                    dpsGain = rec.dpsGain || 0;
                } else {
                    rocks = sv.rocks;
                    dpsGain = sv.dpsGain || 0;
                }
                if (rocks > 0 && dpsGain > 0) {
                    const eff = (dpsGain / 100) * e.damage / rocks;
                    if (eff > bestEff) { bestEff = eff; bestSlot = slot; }
                }
            });
        }
        state.elementalBoss = savedElementalBoss;
        const base = { nikkeId: n.id, name: n.name, elem: n.element ? elemIcon(n.element) : "" };
        if (g.gearCount) {
            const gearDots = `<span class="gear-dots-mini">${SLOTS.map((s) => `<span class="${dotStatus(n, s)}" title="${s}"></span>`).join("")}</span>`;
            details.gear.push({
                ...base,
                gearDots,
                gainPct,
                potentialM: e.damage > 0 && gainPct > 0 ? (gainPct / 100) * e.damage : null,
                bestEff,
                bestSlot,
            });
        }
        if (g.skillGaps.length)
            details.skills.push({ ...base, detail: g.skillGaps.map((s) => `${s.label} ${s.cur}→${s.rec}`).join(", ") });
        if (g.dollGap) details.dolls.push({ ...base, detail: `Needs ${g.dollLabel}` });
        if (g.bondGap) details.bond.push({ ...base, detail: g.bondDetail });
    });
    return details;
}

// Sort key for a gear row under the current column selection.
function _teamGearSortVal(m) {
    return _teamGearSort.col === "pct" ? (m.gainPct || 0)
        : _teamGearSort.col === "eff" ? (m.bestEff || 0)
        : (m.potentialM || 0);
}

// HTML for the Potential cell — shared by the initial render and the in-place
// damage update so both paths produce identical markup.
function _teamGearPotentialHtml(m) {
    return m.potentialM != null && m.potentialM > 0
        ? `<span style="color:#f1f5f9;font-weight:600">+${m.potentialM.toFixed(1)}m</span> <span style="font-size:11px;color:#f1f5f9">(+${m.gainPct.toFixed(1)}%)</span>`
        : m.gainPct > 0
        ? `<span style="color:#f1f5f9">+${m.gainPct.toFixed(1)}%</span>`
        : "—";
}

// Eff cell text for a gear row.
function _teamGearEffText(m) {
    return m.bestEff > 0 ? m.bestEff.toFixed(2) + "m/rock" : "—";
}

function renderTeamReadinessInline(raid, tnum, members) {
    if (!members.length) return `<div id="team-readiness-${raid.id}-${tnum}"></div>`;
    const details = _computeTeamReadinessDetails(raid, members);
    const CATS = [
        { key: "gear", label: "Gear" },
        { key: "skills", label: "Skills" },
        { key: "dolls", label: "Dolls" },
        { key: "bond", label: "Bond" },
    ];
    const selKey = state.teamRaidGap || "";
    const counts = {
        gear: details.gear.length,
        skills: details.skills.length,
        dolls: details.dolls.length,
        bond: details.bond.length,
    };
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
        if (showCat === "gear") {
            const sorted = [...list].sort((a, b) => {
                const d = _teamGearSortVal(b) - _teamGearSortVal(a);
                return _teamGearSort.dir === "desc" ? d : -d;
            });
            const arrow = (col) => _teamGearSort.col === col ? (_teamGearSort.dir === "desc" ? " ▼" : " ▲") : "";
            const DMGW = "120px";
            const EFFW = "66px";
            const DOTW = "34px";
            listHtml = `<div class="team-gap-list">
              <div style="display:flex;align-items:center;gap:18px;padding:2px 11px 4px">
                <span style="width:28px;flex-shrink:0"></span>
                <span style="flex:1"></span>
                <button class="team-gear-sort-btn${_teamGearSort.col === "dmg" ? " active" : ""}" style="width:${DMGW};flex-shrink:0" onclick="sortTeamGear('dmg','${raid.id}',${tnum})">Potential${arrow("dmg")}</button>
                <button class="team-gear-sort-btn${_teamGearSort.col === "eff" ? " active" : ""}" style="width:${EFFW};flex-shrink:0" onclick="sortTeamGear('eff','${raid.id}',${tnum})">Eff${arrow("eff")}</button>
                <span style="width:${DOTW};flex-shrink:0"></span>
              </div>
              ${sorted.map((m) => `<button class="team-gap-item" data-nikke-id="${m.nikkeId}" style="gap:18px" onclick="goToGearNikke('${m.nikkeId}')">
                ${nikkeIcon(m.name, 28)}
                <span class="team-gap-item-name" style="flex:1;min-width:0">${m.elem} ${m.name}</span>
                <span class="team-gear-potential" style="width:${DMGW};flex-shrink:0;text-align:right;font-size:12px;color:#f1f5f9">${_teamGearPotentialHtml(m)}</span>
                <span class="team-gear-eff" style="width:${EFFW};flex-shrink:0;text-align:right;font-size:12px;color:${m.bestEff > 0 ? "#f1f5f9" : "#475569"}" title="${m.bestSlot}">${_teamGearEffText(m)}</span>
                <span style="width:${DOTW};flex-shrink:0">${m.gearDots}</span>
              </button>`).join("")}
            </div>`;
        } else {
            listHtml = `<div class="team-gap-list">
              ${list
                  .map(
                      (m) => `<button class="team-gap-item" data-nikke-id="${m.nikkeId}" onclick="goToGearNikke('${m.nikkeId}')">
                ${nikkeIcon(m.name, 28)}
                <span class="team-gap-item-name">${m.elem} ${m.name}</span>
                <span class="team-gap-item-detail">${m.detail}</span>
              </button>`,
                  )
                  .join("")}
            </div>`;
        }
    }
    return `<div id="team-readiness-${raid.id}-${tnum}"><div class="team-gap-chips">${chips}</div>${listHtml}</div>`;
}

// Update the gear tab's damage-weighted Potential/Eff cells and row order in
// place, reusing the existing icon DOM so nothing flickers. Only the Gear tab
// has damage-dependent values, so when another tab (or none) is open there is
// nothing to do. Gear-gap membership is gear-state driven and can't change on a
// damage edit, so every row is guaranteed to already exist.
function _updateTeamGearVals(raid, tnum) {
    if (state.teamRaidGap !== tnum + ":gear") return;
    const readinessEl = document.getElementById(`team-readiness-${raid.id}-${tnum}`);
    if (!readinessEl) return;
    const listEl = readinessEl.querySelector(".team-gap-list");
    if (!listEl) return;
    const members = raid.entries.map((e, i) => ({ ...e, origIdx: i })).filter((e) => e.team === tnum);
    const gear = _computeTeamReadinessDetails(raid, members).gear;
    const rowByK = new Map();
    listEl.querySelectorAll(".team-gap-item[data-nikke-id]").forEach((row) => rowByK.set(row.dataset.nikkeId, row));
    gear.forEach((m) => {
        const row = rowByK.get(String(m.nikkeId));
        if (!row) return;
        const potEl = row.querySelector(".team-gear-potential");
        if (potEl) potEl.innerHTML = _teamGearPotentialHtml(m);
        const effEl = row.querySelector(".team-gear-eff");
        if (effEl) {
            effEl.textContent = _teamGearEffText(m);
            effEl.style.color = m.bestEff > 0 ? "#f1f5f9" : "#475569";
            effEl.title = m.bestSlot || "";
        }
    });
    // Re-sort by moving the existing row nodes (appendChild moves, never clones)
    // so the nikke icons are preserved and don't reload.
    [...gear]
        .sort((a, b) => {
            const d = _teamGearSortVal(b) - _teamGearSortVal(a);
            return _teamGearSort.dir === "desc" ? d : -d;
        })
        .forEach((m) => {
            const row = rowByK.get(String(m.nikkeId));
            if (row) listEl.appendChild(row);
        });
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

function renderTeamDmgBar(raid, tnum, members) {
    if (!members.length) return "";
    const data = members.map((e) => {
        const n = state.nikkes.find((x) => x.id === e.nikkeId);
        if (!n) return null;
        return { gainPct: getNikkeTotalGainPct(n), damage: e.damage || 0 };
    }).filter(Boolean);
    if (!data.length) return "";
    const teamTotal = data.reduce((s, d) => s + d.damage, 0);
    const hasEnteredDamage = teamTotal > 0;
    let upgradeSummary;
    if (hasEnteredDamage) {
        upgradeSummary = data.reduce((s, d) => s + d.gainPct * (d.damage / teamTotal), 0);
    } else {
        upgradeSummary = data.reduce((s, d) => s + d.gainPct, 0) / data.length;
    }
    if (upgradeSummary < 0.05) return "";
    return `<div style="display:flex;align-items:center;gap:8px;padding:3px 8px 4px;font-size:12px;color:#64748b">
        <span>Gear upgrade potential: avg <strong style="color:#4ade80">+${upgradeSummary.toFixed(1)}%</strong></span>
    </div>`;
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
                if (g.gearCount)
                    details.gear.push({
                        ...base,
                        detail: `<span class="gear-dots-mini">${SLOTS.map((s) => `<span class="${dotStatus(n, s)}" title="${s}"></span>`).join("")}</span>`,
                    });
                if (g.skillGaps.length)
                    details.skills.push({
                        ...base,
                        detail: g.skillGaps.map((s) => `${s.label} ${s.cur}→${s.rec}`).join(", "),
                    });
                if (g.dollGap) details.dolls.push({ ...base, detail: `Needs ${g.dollLabel}` });
                if (g.bondGap) details.bond.push({ ...base, detail: g.bondDetail });
            });
            const memberCount = members.length || 1;
            const counts = {
                gear: details.gear.length,
                skills: details.skills.length,
                dolls: details.dolls.length,
                bond: details.bond.length,
            };
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
    affected.forEach((tnum) => _reconcileTeamReadiness(raid, tnum));
}

let _teamGearSort = { col: "dmg", dir: "desc" };

function sortTeamGear(col, raidId, tnum) {
    if (_teamGearSort.col === col) {
        _teamGearSort.dir = _teamGearSort.dir === "desc" ? "asc" : "desc";
    } else {
        _teamGearSort = { col, dir: "desc" };
    }
    const raid = state.teamRaids.find((r) => r.id === raidId);
    if (raid) _reconcileTeamReadiness(raid, tnum);
}
