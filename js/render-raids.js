// ============================================================
//  RENDER: SOLO RAIDS
// ============================================================

function renderRaids() {
    const el = document.getElementById("raids");
    const sortedRaids = [...state.raids].reverse();
    const raidList =
        sortedRaids
            .map((r) => {
                const displayName = `${r.season ? "Season " + r.season + " · " : ""}${r.name}${r.element ? " — " + elemIcon(r.element) + " " + r.element : ""}`;
                return `<div class="nikke-item ${state.selRaidEdit === r.id ? "active" : ""}" onclick="selRaidEdit('${r.id}')">
      ${displayName}
      <div class="nikke-item-sub">${r.entries.length} Nikke${r.entries.length !== 1 ? "s" : ""}</div>
    </div>`;
            })
            .join("") || '<div style="font-size:14px;color:#475569;padding:6px">No raids created</div>';

    el.innerHTML = `<div class="two-col">
    <div class="nikke-list">
      ${raidList}
      <button class="add-line-btn" onclick="showAddRaidForm()" style="margin-top:8px">+ New Raid</button>
      <div id="add-raid-form" class="form-panel" style="max-width:170px">
        <div class="form-row"><input class="form-input" id="raid-season-input" placeholder="Season #" type="number" min="1" style="font-size:14px"/></div>
        <div class="form-row"><input class="form-input" id="raid-name-input" placeholder="Boss name"/></div>
        <div class="form-row"><select class="form-input" id="raid-element-input" style="font-size:14px">
          <option value="">No weakness</option>
          <option value="Fire">Fire</option>
          <option value="Water">Water</option>
          <option value="Wind">Wind</option>
          <option value="Electric">Electric</option>
          <option value="Iron">Iron</option>
        </select></div>
        <div class="btn-row"><button class="btn btn-primary" onclick="addRaid()" style="font-size:13px;padding:4px 10px">Add</button></div>
      </div>
    </div>
    <div id="raid-main">${state.selRaidEdit ? "" : '<div class="empty-state">← Select or create a raid</div>'}</div>
  </div>`;

    if (state.selRaidEdit) {
        const raid = state.raids.find((r) => r.id === state.selRaidEdit);
        if (raid) renderRaidMain(raid);
    }
}

function showAddRaidForm() {
    document.getElementById("add-raid-form").classList.add("show");
    document.getElementById("raid-name-input").focus();
}

function addRaid() {
    const name = document.getElementById("raid-name-input").value.trim();
    if (!name) return;
    const seasonInput = document.getElementById("raid-season-input");
    const season = seasonInput ? parseInt(seasonInput.value) || "" : "";
    const elemSel = document.getElementById("raid-element-input");
    const element = elemSel ? elemSel.value : "";
    const raid = { id: "r" + Date.now(), name, season, element, entries: [] };
    state.raids.push(raid);
    state.selRaidEdit = raid.id;
    save();
    renderRaids();
}

function selRaidEdit(id) {
    state.selRaidEdit = id;
    renderRaids();
}

function deleteRaid(id) {
    if (!confirm("Delete this raid?")) return;
    state.raids = state.raids.filter((r) => r.id !== id);
    if (state.selRaidEdit === id) state.selRaidEdit = null;
    if (state.selRaid === id) state.selRaid = null;
    save();
    renderRaids();
    renderOverview();
}

function showEditRaid(id) {
    const form = document.getElementById("raid-edit-form");
    if (form) form.style.display = "";
}

function hideEditRaid() {
    const form = document.getElementById("raid-edit-form");
    if (form) form.style.display = "none";
}

function saveEditRaid(id) {
    const raid = state.raids.find((r) => r.id === id);
    if (!raid) return;
    const name = document.getElementById("raid-edit-name").value.trim();
    const season = parseInt(document.getElementById("raid-edit-season").value) || "";
    const element = document.getElementById("raid-edit-element").value;
    if (name) raid.name = name;
    raid.season = season;
    raid.element = element;
    save();
    renderRaids();
    renderOverview();
    renderRaidMain(raid);
}

function renderRaidMain(raid) {
    const area = document.getElementById("raid-main");
    const raidDisplayName = `${raid.season ? "Season " + raid.season + " · " : ""}${raid.name}${raid.element ? " — " + elemIcon(raid.element) + " " + raid.element + " Weak" : ""}`;
    const viewMode = state.raidViewMode || "teams"; // 'teams' or 'recommend'

    // Sort unassigned entries by damage
    const sortMode = state.raidSortMode || "damage";

    // Group entries by team
    const teams = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    raid.entries.forEach((e, i) => {
        const t = e.team || 0;
        teams[t] = teams[t] || [];
        teams[t].push({ ...e, origIdx: i });
    });

    // Sort unassigned by damage or name
    if (sortMode === "damage") {
        teams[0].sort((a, b) => (b.damage || 0) - (a.damage || 0));
    }

    const totalDmg = raid.entries.reduce((s, e) => s + (e.damage || 0), 0);

    // View toggle
    const viewToggle = `<div style="display:flex;gap:4px">
    <button class="btn-sm${viewMode === "recommend" ? " active-sort" : ""}" onclick="setRaidView('recommend')" style="font-size:12px;padding:2px 8px">Recommendations</button>
    <button class="btn-sm${viewMode === "teams" ? " active-sort" : ""}" onclick="setRaidView('teams')" style="font-size:12px;padding:2px 8px">Teams</button>
  </div>`;

    let bodyHtml = "";

    if (viewMode === "teams") {
        // ── TEAMS VIEW: 5 dedicated slots per team ──
        const maxEntryDmg = Math.max(...raid.entries.map((e) => e.damage || 0), 1);

        function renderSlot(teamNum, slotIdx, entry) {
            if (!entry) {
                // Empty slot — show picker
                return `<div class="raid-slot raid-slot-empty" data-team="${teamNum}" data-slot="${slotIdx}">
        <button class="raid-slot-add-btn" onclick="openRaidSlotPicker('${raid.id}',${teamNum},${slotIdx})" title="Add Nikke">+</button>
      </div>`;
            }
            const n = state.nikkes.find((x) => x.id === entry.nikkeId);
            const name = n ? n.name : "(removed)";
            const dmg = entry.damage ? `${Number(entry.damage).toLocaleString()}M` : "";
            const elem = n && n.element ? elemIcon(n.element) : "";
            const pct = maxEntryDmg > 0 ? ((entry.damage || 0) / maxEntryDmg) * 100 : 0;
            const dmgColor = !entry.damage ? "#64748b" : pct >= 80 ? "#4ade80" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#f87171";
            return `<div class="raid-slot raid-slot-filled">
        ${n ? nikkeIcon(name, 38) : ""}
        <div class="raid-chip-info">
          <span class="raid-chip-name">${name}</span>
          <div class="raid-chip-meta">${elem}<span class="raid-chip-dmg-label" style="color:${dmgColor}">${dmg || "—"}</span><button class="raid-chip-edit-btn" onclick="event.stopPropagation();startEditChipDmg(this,'${raid.id}',${entry.origIdx},${entry.damage || 0})" title="Edit damage">▪</button></div>
        </div>
        <button class="raid-chip-remove" onclick="event.stopPropagation();removeRaidTeamSlot('${raid.id}',${entry.origIdx})" title="Remove">&times;</button>
      </div>`;
        }

        const teamTotals = [1, 2, 3, 4, 5].map((t) =>
            (teams[t] || []).reduce((s, e) => s + (e.damage || 0), 0),
        );
        const maxTeamDmg = Math.max(...teamTotals, 1);

        const teamLanes = [1, 2, 3, 4, 5]
            .map((t, ti) => {
                const members = teams[t] || [];
                const total = teamTotals[ti];
                const pct = maxTeamDmg > 0 ? (total / maxTeamDmg) * 100 : 0;
                const dmgColor = total === 0 ? "#64748b" : pct >= 80 ? "#4ade80" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#f87171";
                // Build 5 slots (filled + empty)
                const slots = [];
                for (let i = 0; i < 5; i++) {
                    slots.push(renderSlot(t, i, members[i] || null));
                }
                const note = (raid.teamNotes && raid.teamNotes[t]) || "";
                return `<div class="raid-team-lane" data-team="${t}" data-raid-id="${raid.id}">
        <div class="raid-team-header">
          <span class="raid-team-label">Team ${t}</span>
          <span class="raid-team-total" style="color:${dmgColor}">${total ? total.toLocaleString() + "M" : "—"}</span>
          <div class="raid-note-wrap">
<input class="raid-team-note" type="text" placeholder="Notes..." value="${note.replace(/"/g, "&quot;")}"
  onblur="updateTeamNote('${raid.id}',${t},this.value)"
  onkeydown="if(event.key==='Enter')this.blur()"/>
<button class="raid-note-clear" onclick="clearTeamNote('${raid.id}',${t})" title="Clear note">&times;</button>
          </div>
        </div>
        <div class="raid-team-slots">${slots.join("")}</div>
      </div>`;
            })
            .join("");

        bodyHtml = `
      <div class="info-note" style="margin-bottom:10px">Click <strong>+</strong> to assign a Nikke to a slot. Enter damage in millions (e.g. 48 = 48M).</div>
      <div class="raid-teams-grid">${teamLanes}</div>`;

        // Slot picker modal (hidden by default, shown by openRaidSlotPicker)
        bodyHtml += `<div class="raid-slot-picker-overlay" id="raid-slot-picker-overlay" onclick="if(event.target===this)closeRaidSlotPicker()">
      <div class="raid-slot-picker-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:14px;font-weight:600;color:#f1f5f9">Pick a Nikke</span>
          <button class="del-btn" onclick="closeRaidSlotPicker()" style="font-size:16px">✕</button>
        </div>
        <input class="form-input" id="raid-slot-picker-search" placeholder="Search..." oninput="filterRaidSlotPicker()" style="margin-bottom:8px"/>
        <div id="raid-slot-picker-list" class="raid-slot-picker-list"></div>
      </div>
    </div>`;
    } else {
        // ── RECOMMENDATIONS VIEW: show all team-assigned Nikkes with their stats & recommendations ──
        const teamEntries = raid.entries.filter((e) => e.team && e.team > 0);
        const withIdx = teamEntries.map((e) => {
            const origIdx = raid.entries.indexOf(e);
            return { ...e, origIdx };
        });

        // Pre-compute sortable values for each entry
        const recData = withIdx.map((e) => {
            const n = state.nikkes.find((x) => x.id === e.nikkeId);

            // Temporarily adjust elemental boss setting for this raid's element
            const savedElementalBoss = state.elementalBoss;
            if (n && raid.element && n.element !== raid.element) state.elementalBoss = false;

            const gainPct = n ? getNikkeTotalGainPct(n) : 0;
            const potentialM = (e.damage && gainPct > 0) ? (gainPct / 100) * e.damage : 0;

            // Rock Efficiency (damage per rock)
            let bestEff = 0;
            let bestSlot = "";
            if (n && e.damage) {
                SLOTS.forEach((slot) => {
                    const v = getVerdict(n, slot);
                    if (!v || v.cls === "v-keep") return;
                    let rocks = 0, dpsGain = 0;
                    if (v.options) {
                        const rec = v.options.find((o) => o.recommended) || v.options[0];
                        rocks = rec.rocks;
                        dpsGain = rec.dpsGain || 0;
                    } else {
                        rocks = v.rocks;
                        dpsGain = v.dpsGain || 0;
                    }
                    if (rocks > 0 && dpsGain > 0) {
                        const eff = (dpsGain / 100) * e.damage / rocks;
                        if (eff > bestEff) { bestEff = eff; bestSlot = slot; }
                    }
                });
            }
            state.elementalBoss = savedElementalBoss;

            return { ...e, n, gainPct, potentialM, bestEff, bestSlot };
        });

        // Sorting
        const recSort = state.raidRecSort || "team";
        const recSortAsc = state.raidRecSortAsc ?? false;
        const dir = recSortAsc ? 1 : -1;
        if (recSort === "damage") {
            recData.sort((a, b) => dir * ((a.damage || 0) - (b.damage || 0)));
        } else if (recSort === "potential") {
            recData.sort((a, b) => dir * (a.potentialM - b.potentialM));
        } else if (recSort === "rockeff") {
            recData.sort((a, b) => dir * (a.bestEff - b.bestEff));
        } else {
            // Default: sort by team, then damage within team
            recData.sort((a, b) => {
                if (a.team !== b.team) return a.team - b.team;
                return (b.damage || 0) - (a.damage || 0);
            });
        }

        const maxDmg = recData.length ? Math.max(...recData.map((e) => e.damage || 0), 1) : 1;
        const sortArrow = (col) => (recSort === col ? (recSortAsc ? " ▲" : " ▼") : "");

        const rows = recData
            .map((e, rank) => {
                const n = e.n;
                if (!n) return "";
                const name = n.name;
                const elem = n.element ? elemIcon(n.element) : "";
                const db = NIKKE_DB_MAP.get(n.name);
                const teamBadge = `<span class="raid-team-badge">T${e.team}</span>`;

                // Damage
                const dmgDisplay = e.damage ? `${Number(e.damage).toLocaleString()}M` : "—";
                const pct = maxDmg > 0 ? ((e.damage || 0) / maxDmg) * 100 : 0;
                const dmgColor = !e.damage ? "#64748b" : pct >= 80 ? "#4ade80" : pct >= 50 ? "#60a5fa" : pct >= 25 ? "#fbbf24" : "#f87171";

                // Potential
                let potentialCell;
                if (!e.damage || e.gainPct <= 0) {
                    potentialCell = e.gainPct > 0 ? `<span style="color:#60a5fa">+${e.gainPct.toFixed(1)}%</span>` : '<span style="color:#475569">—</span>';
                } else {
                    potentialCell = `<span style="color:#4ade80;font-weight:600">+${e.potentialM.toFixed(1)}M</span> <span style="font-size:11px;color:#60a5fa">(+${e.gainPct.toFixed(1)}%)</span>`;
                }

                // Rock Efficiency
                let rockEffCell = '<span style="color:#475569">—</span>';
                if (e.bestEff > 0) {
                    const effColor = e.bestEff >= 1 ? "#4ade80" : e.bestEff >= 0.3 ? "#fbbf24" : "#f87171";
                    rockEffCell = `<span style="color:${effColor};font-weight:600" title="Best slot: ${e.bestSlot}">${e.bestEff.toFixed(2)}M/rock</span>`;
                }

                // Skills recommendation — separate columns for S1, S2, Burst
                let skillCells = ['<span style="color:#475569">—</span>', '<span style="color:#475569">—</span>', '<span style="color:#475569">—</span>'];
                if (db && db.build && db.build.skill && db.build.skill.pve && db.build.skill.pve.rec) {
                    const rec = db.build.skill.pve.rec;
                    const cur = [n.skill1 ?? 0, n.skill2 ?? 0, n.skill3 ?? 0];
                    const recVals = [rec.s1, rec.s2, rec.s3];
                    skillCells = recVals.map((target, i) => {
                        if (target == null) return '<span style="color:#475569">—</span>';
                        if (cur[i] >= target) return '<span style="color:#4ade80">✓</span>';
                        return `<span style="color:#f59e0b">${cur[i]}→${target}</span>`;
                    });
                }

                // Dolls recommendation
                let dollCell = '<span style="color:#475569">—</span>';
                if (db) {
                    const isTreasure = TREASURE_NAMES.has(n.name);
                    let recDoll, done;
                    if (isTreasure) {
                        recDoll = COLLECTION_DOLLS.find((d) => d.treasure === n.name);
                        done = !!(n.doll && recDoll && n.doll.tid === recDoll.id);
                    } else {
                        recDoll = COLLECTION_DOLLS.find((d) => d.rarity === "SR" && d.weapon === db.weapon);
                        const eq = n.doll ? COLLECTION_DOLLS.find((d) => d.id === n.doll.tid) : null;
                        done = !!(eq && eq.rarity === "SR" && n.doll.lv === 15);
                    }
                    if (done) {
                        dollCell = '<span style="color:#4ade80">✓</span>';
                    } else if (recDoll) {
                        const curLabel = n.doll ? (() => { const d = COLLECTION_DOLLS.find((x) => x.id === n.doll.tid); return d ? `[${d.rarity}] Lv${n.doll.lv ?? 0}` : "None"; })() : "None";
                        const recLabel = isTreasure ? `[${recDoll.rarity}] ${recDoll.name}` : `[SR] Lv15`;
                        dollCell = `<span style="color:#f59e0b" title="Current: ${curLabel}">${recLabel}</span>`;
                    }
                }

                // Bond
                let bondCell = '<span style="color:#475569">—</span>';
                const bondMax = bondMaxFor(n);
                if (bondMax != null) {
                    const curBond = n.bond ?? 0;
                    if (curBond >= bondMax) {
                        bondCell = `<span style="color:#4ade80">✓ ${curBond}</span>`;
                    } else {
                        bondCell = `<span style="color:#f59e0b;font-weight:600">${curBond}<span style="color:#475569">/${bondMax}</span></span>`;
                    }
                }

                // Gear Level recommendation — separate columns for Helmet, Torso, Arms
                const gearSlots = ["Helmet", "Torso", "Arms"];
                const gearCells = gearSlots.map((slot) => {
                    const g = n.gear && n.gear[slot];
                    if (!g) return '<span style="color:#475569">—</span>';
                    const tier = g.tier || 0;
                    const lv = g.lv || 0;
                    if (tier >= 10 && lv >= 5) {
                        return '<span style="color:#4ade80">✓</span>';
                    } else if (tier >= 10) {
                        return `<span style="color:#f59e0b">Lv${lv}→5</span>`;
                    } else {
                        return `<span style="color:#f59e0b">T${tier || "?"}→T10</span>`;
                    }
                });

                return `<tr class="rank-row" onclick="goToGearNikke('${e.nikkeId}')" style="cursor:pointer" title="View in Gear Tracker">
        <td style="font-size:13px;color:#475569;width:24px">${rank + 1}</td>
        <td style="width:36px;text-align:center">${teamBadge}</td>
        <td style="font-weight:500"><div style="display:flex;align-items:center;gap:6px">${nikkeIcon(name, 28)}${elem}<span>${name}</span></div></td>
        <td style="color:${dmgColor};font-weight:600;text-align:right">${dmgDisplay}</td>
        <td style="text-align:right">${potentialCell}</td>
        <td style="text-align:right">${rockEffCell}</td>
        <td style="text-align:center">${skillCells[0]}</td>
        <td style="text-align:center">${skillCells[1]}</td>
        <td style="text-align:center">${skillCells[2]}</td>
        <td style="text-align:center">${dollCell}</td>
        <td style="text-align:center">${bondCell}</td>
        <td style="text-align:center">${gearCells[0]}</td>
        <td style="text-align:center">${gearCells[1]}</td>
        <td style="text-align:center">${gearCells[2]}</td>
      </tr>`;
            })
            .join("");

        if (recData.length) {
            bodyHtml = `
      <div class="info-note" style="margin-bottom:10px">Showing recommendations for all Nikkes assigned to teams. Click a row to open in Gear Tracker.</div>
      <table class="attr-table" style="width:100%">
        <tr><th>#</th><th>Tm</th><th>Nikke</th><th class="sort-header" style="text-align:right" onclick="setRaidRecSort('damage')">Damage${sortArrow("damage")}</th><th class="sort-header" style="text-align:right" onclick="setRaidRecSort('potential')">Potential${sortArrow("potential")}</th><th class="sort-header" style="text-align:right" onclick="setRaidRecSort('rockeff')">Rock Eff${sortArrow("rockeff")}</th><th style="text-align:center">S1</th><th style="text-align:center">S2</th><th style="text-align:center">Burst</th><th style="text-align:center">Dolls</th><th style="text-align:center">Bond</th><th style="text-align:center">Helm</th><th style="text-align:center">Torso</th><th style="text-align:center">Arms</th></tr>
        ${rows}
      </table>`;
        } else {
            bodyHtml = `<div class="info-note">No Nikkes assigned to teams yet. Switch to Teams view to add Nikkes to team slots.</div>`;
        }
    }

    area.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px">
        <span id="raid-title-display" style="font-size:16px;font-weight:600;color:#f1f5f9">${raidDisplayName}</span>
        <button class="btn-sm" onclick="showEditRaid('${raid.id}')" title="Edit raid" style="font-size:12px;padding:2px 6px;min-width:auto">✎</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;color:#64748b">Total: <strong style="color:#f1f5f9">${totalDmg ? totalDmg.toLocaleString() + "M" : "—"}</strong></span>
        <button class="del-btn" onclick="deleteRaid('${raid.id}')" title="Delete raid">✕ Delete</button>
      </div>
    </div>
    <div id="raid-edit-form" style="display:none;margin-bottom:10px;padding:10px;background:#151c2b;border:1px solid #1e2535;border-radius:8px">
      <div style="display:flex;gap:6px;align-items:center">
        <input class="form-input" id="raid-edit-season" value="${raid.season || ""}" placeholder="S#" type="number" min="1" style="width:50px;font-size:14px;padding:4px 8px"/>
        <input class="form-input" id="raid-edit-name" value="${raid.name}" placeholder="Boss name" style="flex:1;font-size:14px;padding:4px 8px"/>
        <select class="form-input" id="raid-edit-element" style="font-size:14px;padding:4px 6px;width:auto">
          <option value="">No weakness</option>
          ${["Fire", "Water", "Wind", "Electric", "Iron"].map((e) => `<option value="${e}" ${raid.element === e ? "selected" : ""}>${e}</option>`).join("")}
        </select>
        <button class="btn btn-primary" onclick="saveEditRaid('${raid.id}')" style="font-size:13px;padding:4px 10px">Save</button>
        <button class="btn-sm" onclick="hideEditRaid()" style="font-size:13px;padding:4px 8px">Cancel</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      ${viewToggle}
    </div>
    ${bodyHtml}`;

    // No more drag-and-drop setup needed
}

function addRaidEntry(raidId) {
    const sel = document.getElementById("raid-add-nikke");
    if (!sel || !sel.value) return;
    const raid = state.raids.find((r) => r.id === raidId);
    raid.entries.push({ nikkeId: sel.value, damage: 0 });
    save();
    renderRaidMain(raid);
}

function removeRaidEntry(raidId, idx) {
    const raid = state.raids.find((r) => r.id === raidId);
    raid.entries.splice(idx, 1);
    save();
    renderRaidMain(raid);
}

function setRaidTeam(raidId, idx, team) {
    const raid = state.raids.find((r) => r.id === raidId);
    raid.entries[idx].team = parseInt(team) || 0;
    save();
    renderRaidMain(raid);
}

function updateTeamNote(raidId, teamNum, value) {
    const raid = state.raids.find((r) => r.id === raidId);
    if (!raid) return;
    if (!raid.teamNotes) raid.teamNotes = {};
    raid.teamNotes[teamNum] = value;
    save();
}

function clearTeamNote(raidId, teamNum) {
    const raid = state.raids.find((r) => r.id === raidId);
    if (!raid) return;
    if (!raid.teamNotes) raid.teamNotes = {};
    raid.teamNotes[teamNum] = "";
    save();
    renderRaidMain(raid);
}

function setRaidSort2(mode) {
    state.raidSortMode = mode;
    const raid = state.raids.find((r) => r.id === state.selRaidEdit);
    if (raid) renderRaidMain(raid);
}

function setRaidDmgSort(mode) {
    state.raidDmgSortMode = mode;
    const raid = state.raids.find((r) => r.id === state.selRaidEdit);
    if (raid) renderRaidMain(raid);
}

function setRaidRecSort(col) {
    if (state.raidRecSort === col) {
        state.raidRecSortAsc = !state.raidRecSortAsc;
    } else {
        state.raidRecSort = col;
        state.raidRecSortAsc = false; // default descending
    }
    const raid = state.raids.find((r) => r.id === state.selRaidEdit);
    if (raid) renderRaidMain(raid);
}

function setRaidView(mode) {
    state.raidViewMode = mode;
    const raid = state.raids.find((r) => r.id === state.selRaidEdit);
    if (raid) renderRaidMain(raid);
}

function startEditChipDmg(btn, raidId, entryIdx, currentVal) {
    const meta = btn.closest(".raid-chip-meta");
    meta.innerHTML = `<input class="raid-chip-dmg-input" type="text" inputmode="numeric" value="${currentVal || ""}" placeholder="0"
    onblur="commitChipDmg(this,'${raidId}',${entryIdx})"
    onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){this.dataset.cancel='1';this.blur();}"/>`;
    const input = meta.querySelector("input");
    input.focus();
    input.select();
}

function commitChipDmg(input, raidId, entryIdx) {
    if (input.dataset.cancel === "1") {
        const raid = state.raids.find((r) => r.id === raidId);
        if (raid) renderRaidMain(raid);
        return;
    }
    const val = parseInt(input.value) || 0;
    const raid = state.raids.find((r) => r.id === raidId);
    if (!raid || !raid.entries[entryIdx]) return;
    raid.entries[entryIdx].damage = val;
    save();
    renderRaidMain(raid);
}

function initRaidDragDrop(raidId) {
    const chips = document.querySelectorAll(".raid-chip[data-raid-entry]");
    const dropZones = document.querySelectorAll('.raid-team-drop[data-raid-id="' + raidId + '"]');

    chips.forEach((chip) => {
        chip.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", chip.dataset.raidEntry);
            chip.classList.add("dragging");
            // Highlight all drop zones
            dropZones.forEach((z) => z.classList.add("drag-active"));
        });
        chip.addEventListener("dragend", (e) => {
            chip.classList.remove("dragging");
            dropZones.forEach((z) => {
                z.classList.remove("drag-active");
                z.classList.remove("drag-over");
            });
        });
    });

    dropZones.forEach((zone) => {
        zone.addEventListener("dragover", (e) => {
            e.preventDefault();
            zone.classList.add("drag-over");
        });
        zone.addEventListener("dragleave", (e) => {
            zone.classList.remove("drag-over");
        });
        zone.addEventListener("drop", (e) => {
            e.preventDefault();
            zone.classList.remove("drag-over");
            const data = e.dataTransfer.getData("text/plain");
            // data format: "raidId-entryIdx"
            const parts = data.split("-");
            const entryIdx = parseInt(parts[parts.length - 1]);
            const targetTeam = parseInt(zone.dataset.team) || 0;
            const raid = state.raids.find((r) => r.id === raidId);
            if (raid && !isNaN(entryIdx) && raid.entries[entryIdx]) {
                raid.entries[entryIdx].team = targetTeam;
                save();
                renderRaidMain(raid);
            }
        });
    });
}

// ── Slot-based team picker ───────────────────────────────────
let _slotPickerState = { raidId: null, team: null, slot: null };

function openRaidSlotPicker(raidId, teamNum, slotIdx) {
    _slotPickerState = { raidId, team: teamNum, slot: slotIdx };
    const overlay = document.getElementById("raid-slot-picker-overlay");
    if (overlay) {
        overlay.classList.add("show");
        const searchInput = document.getElementById("raid-slot-picker-search");
        if (searchInput) { searchInput.value = ""; searchInput.focus(); }
        filterRaidSlotPicker();
    }
}

function closeRaidSlotPicker() {
    const overlay = document.getElementById("raid-slot-picker-overlay");
    if (overlay) overlay.classList.remove("show");
    _slotPickerState = { raidId: null, team: null, slot: null };
}

function filterRaidSlotPicker() {
    const searchInput = document.getElementById("raid-slot-picker-search");
    const list = document.getElementById("raid-slot-picker-list");
    if (!list) return;
    const q = searchInput ? searchInput.value.toLowerCase() : "";
    const raid = state.raids.find((r) => r.id === _slotPickerState.raidId);
    if (!raid) { list.innerHTML = ""; return; }
    // Get IDs already assigned to a team (team > 0) — unassigned (team 0) remain available
    const assignedToTeamIds = new Set(raid.entries.filter((e) => e.team && e.team > 0).map((e) => e.nikkeId));
    // Show all nikkes in roster, filtering out ones already assigned to a team
    const available = state.nikkes
        .filter((n) => !assignedToTeamIds.has(n.id) && n.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name));
    list.innerHTML = available.map((n) => {
        const elem = n.element ? elemIcon(n.element) : "";
        return `<div class="raid-slot-picker-item" onclick="pickRaidSlotNikke('${n.id}')">
      ${nikkeIcon(n.name, 28)}
      <span>${n.name}</span>
      <span style="font-size:12px;color:#64748b;margin-left:auto">${elem} ${burstDisplay(n)}</span>
    </div>`;
    }).join("") || '<div style="padding:8px;color:#475569;font-size:13px">No available Nikkes</div>';
}

function pickRaidSlotNikke(nikkeId) {
    const { raidId, team } = _slotPickerState;
    const raid = state.raids.find((r) => r.id === raidId);
    if (!raid) return;
    // If the nikke already has an unassigned entry (team 0), reassign it
    const existing = raid.entries.find((e) => e.nikkeId === nikkeId && (!e.team || e.team === 0));
    if (existing) {
        existing.team = team;
    } else {
        raid.entries.push({ nikkeId, damage: 0, team });
    }
    save();
    closeRaidSlotPicker();
    renderRaidMain(raid);
}

function removeRaidTeamSlot(raidId, entryIdx) {
    const raid = state.raids.find((r) => r.id === raidId);
    if (!raid) return;
    raid.entries.splice(entryIdx, 1);
    save();
    renderRaidMain(raid);
}

let _raidDmgSkipBlur = false;

function updateRaidDmg(raidId, idx, val) {
    const raid = state.raids.find((r) => r.id === raidId);
    raid.entries[idx].damage = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
    save();
}

function raidDmgOnBlur(raidId, idx, val) {
    updateRaidDmg(raidId, idx, val);
}

function raidDmgKeydown(event, raidId, idx) {
    if (event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
    }
}
