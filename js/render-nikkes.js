// ============================================================
//  RENDER: GEAR TRACKER
// ============================================================

let _gearSidebarCache = "";
let _gearSidebarSearch = "";
// Whether the Nikke list is collapsed. Only has a visual effect on mobile
// (≤768px) — on desktop the list is always shown via CSS. Auto-collapses when a
// Nikke is selected so the detail panel takes focus on small screens.
let _nikkeListCollapsed = false;
function toggleNikkeList() {
    _nikkeListCollapsed = !_nikkeListCollapsed;
    const sb = document.getElementById("gear-sidebar-inner");
    if (!sb) return;
    sb.classList.toggle("nikke-list-collapsed", _nikkeListCollapsed);
    const tog = sb.querySelector(".roster-list-toggle");
    if (tog) tog.setAttribute("aria-expanded", String(!_nikkeListCollapsed));
}
// Active sub-tab within a Nikke's detail panel: "gear" or "priorities"
let _gearSubTab = "gear";

function filterGearSidebarList() {
    const input = document.getElementById("nikke-sidebar-search");
    if (!input) return;
    _gearSidebarSearch = input.value.toLowerCase();
    const items = document.querySelectorAll("#gear .nikke-list .nikke-item");
    let anyVisible = false;
    items.forEach((el) => {
        const visible = el.dataset.name.includes(_gearSidebarSearch);
        el.style.display = visible ? "flex" : "none";
        if (visible) anyVisible = true;
    });
    const list = document.querySelector("#gear .nikke-list");
    if (!list) return;
    let emptyMsg = list.querySelector(".nikke-list-search-empty");
    if (items.length > 0 && !anyVisible) {
        if (!emptyMsg) {
            emptyMsg = document.createElement("div");
            emptyMsg.className = "nikke-list-search-empty";
            emptyMsg.style.cssText = "font-size:14px;color:#475569;padding:6px";
            emptyMsg.textContent = "No Nikkes matching filters";
            list.appendChild(emptyMsg);
        } else {
            emptyMsg.style.display = "";
        }
    } else if (emptyMsg) {
        emptyMsg.style.display = "none";
    }
}

function sortNikkesBySidebar(nikkes) {
    const by = state.gearSidebarSort || "power";
    const asc = (state.gearSidebarSortDir || "desc") === "asc";
    return [...nikkes].sort((a, b) => {
        let diff = 0;
        if (by === "alpha") {
            diff = a.name.localeCompare(b.name);
            if (diff !== 0) return asc ? diff : -diff;
            return (b.power ?? -1) - (a.power ?? -1);
        } else if (by === "power") {
            diff = (a.power ?? -1) - (b.power ?? -1);
        } else if (by === "lb") {
            diff = (a.limitBreak ?? 0) + (a.cores ?? 0) - ((b.limitBreak ?? 0) + (b.cores ?? 0));
        } else if (by === "bond") {
            diff = (a.bond ?? -1) - (b.bond ?? -1);
        }
        if (diff !== 0) return asc ? diff : -diff;
        return (b.power ?? -1) - (a.power ?? -1);
    });
}

function renderGear() {
    const el = document.getElementById("gear");
    let filtered = state.nikkes.slice();
    if (state.gearElementFilter) filtered = filtered.filter((n) => n.element === state.gearElementFilter);
    if (state.gearBurstFilter) {
        const _bk = { I: "burst1", II: "burst2", III: "burst3" }[state.gearBurstFilter];
        if (_bk) filtered = filtered.filter((n) => n[_bk]);
    }
    if (state.gearManufacturerFilter)
        filtered = filtered.filter(
            (n) => (NIKKE_DB_MAP.get(n.name) || {}).manufacturer === state.gearManufacturerFilter,
        );
    if (state.gearWeaponFilter)
        filtered = filtered.filter(
            (n) => (n.weapon || (NIKKE_DB_MAP.get(n.name) || {}).weapon) === state.gearWeaponFilter,
        );
    filtered = sortNikkesBySidebar(filtered);
    const list =
        filtered
            .map((n) => {
                // One dot per gear slot, coloured by that slot's gear status (done/partial/warn/none)
                const dots = SLOTS.map(
                    (s) => `<span class="${dotStatus(n, s)}" title="${s}" data-slot="${s}"></span>`,
                ).join("");
                const badge = n.unrecognized
                    ? `<span class="nikke-badge" title="Not in database — burst, element and weapon are unknown. Edit in the Roster to fill them in.">not in DB</span>`
                    : "";
                return `<div class="nikke-item ${state.selGear === n.id ? "active" : ""}" data-id="${n.id}" data-name="${n.name.toLowerCase()}" onclick="selGearNikke('${n.id}')" style="display:flex;align-items:center;gap:8px">
      ${nikkeIcon(n.name, 34)}<div style="min-width:0"><div>${n.name}${badge}</div><div class="nikke-item-sub" style="display:flex;align-items:center;gap:6px"><span class="gear-dots-mini">${dots}</span>${elemIcon(n.element, 14)}</div></div>
    </div>`;
            })
            .join("") ||
        `<div style="font-size:14px;color:#475569;padding:6px">${state.gearElementFilter || state.gearBurstFilter || state.gearManufacturerFilter || state.gearWeaponFilter ? "No Nikkes matching filters" : "No Nikkes added"}</div>`;

    // Build filter options from fixed game constants
    const elemOpts = NIKKE_ELEMENTS.map(
        (e) => `<option value="${e}" ${state.gearElementFilter === e ? "selected" : ""}>${e}</option>`,
    ).join("");
    const mfrOpts = NIKKE_MANUFACTURERS.map(
        (m) => `<option value="${m}" ${state.gearManufacturerFilter === m ? "selected" : ""}>${m}</option>`,
    ).join("");
    const weaponOpts = Object.keys(NIKKE_WEAPONS)
        .map((code) => `<option value="${code}" ${state.gearWeaponFilter === code ? "selected" : ""}>${code}</option>`)
        .join("");
    const sortDir = state.gearSidebarSortDir || "desc";
    const sortBy = state.gearSidebarSort || "power";
    const filterHtml = `<div style="margin-bottom:6px">
    <input id="nikke-sidebar-search" class="form-input" placeholder="Search Nikke..." value="${_gearSidebarSearch.replace(/"/g, "&quot;")}" oninput="filterGearSidebarList()" style="font-size:13px;padding:4px 8px;width:100%"/>
  </div>
  <div style="display:flex;gap:4px;margin-bottom:6px">
    <select style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;flex:1" onchange="setGearSidebarSort(this.value)">
      <option value="power" ${sortBy === "power" ? "selected" : ""}>Power</option>
      <option value="alpha" ${sortBy === "alpha" ? "selected" : ""}>Alphabetical</option>
      <option value="lb" ${sortBy === "lb" ? "selected" : ""}>Limit Break</option>
      <option value="bond" ${sortBy === "bond" ? "selected" : ""}>Bond</option>
    </select>
    <button onclick="toggleGearSidebarSortDir()" title="Toggle sort direction" style="font-size:16px;padding:2px 7px;background:#0f1117;color:#94a3b8;border:1px solid #2d3f5e;border-radius:5px;cursor:pointer;flex-shrink:0;line-height:1;transition:color 0.1s,background 0.1s" onmouseover="this.style.background='#1a2235';this.style.color='#e2e8f0'" onmouseout="this.style.background='#0f1117';this.style.color='#94a3b8'">${sortDir === "asc" ? "↑" : "↓"}</button>
  </div>
  <div style="display:flex;gap:4px;margin-bottom:6px">
    <div style="display:flex;flex-direction:column;gap:2px;flex:1">
      <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Element</span>
      <select style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearElementFilter(this.value)">
        <option value="">All</option>${elemOpts}
      </select>
    </div>
    <div style="display:flex;flex-direction:column;gap:2px;flex:1">
      <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Burst</span>
      <select style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearBurstFilter(this.value)">
        <option value="">All</option>
        <option value="I" ${state.gearBurstFilter === "I" ? "selected" : ""}>I</option>
        <option value="II" ${state.gearBurstFilter === "II" ? "selected" : ""}>II</option>
        <option value="III" ${state.gearBurstFilter === "III" ? "selected" : ""}>III</option>
      </select>
    </div>
  </div>
  <div style="display:flex;gap:4px;margin-bottom:6px">
    <div style="display:flex;flex-direction:column;gap:2px;flex:1">
      <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Manufacturer</span>
      <select style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearManufacturerFilter(this.value)">
        <option value="">All</option>${mfrOpts}
      </select>
    </div>
    <div style="display:flex;flex-direction:column;gap:2px;flex:1">
      <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Weapon</span>
      <select style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearWeaponFilter(this.value)">
        <option value="">All</option>${weaponOpts}
      </select>
    </div>
  </div>`;

    const sidebarKey = `${state.gearElementFilter}|${state.gearBurstFilter}|${state.gearManufacturerFilter}|${state.gearWeaponFilter}|${sortBy}|${sortDir}|${filtered.map((n) => n.id + dotStatus(n, "Helmet") + dotStatus(n, "Torso") + dotStatus(n, "Arms") + dotStatus(n, "Legs")).join(",")}|${state.selGear}`;

    if (sidebarKey !== _gearSidebarCache || !el.innerHTML) {
        _gearSidebarCache = sidebarKey;

        // Add Nikke button (opens the modal popup built below)
        const addHtml = `<button class="add-line-btn" onclick="showGearAddForm()" style="margin-top:6px;width:100%">+ Add Nikke</button>`;

        const toggleBtn = `<button type="button" class="roster-list-toggle" onclick="toggleNikkeList()" aria-expanded="${!_nikkeListCollapsed}">
          <span class="roster-list-chevron">›</span>
          <span>Nikkes</span>
          <span class="roster-list-count">${filtered.length}</span>
        </button>`;
        const collapsibleHtml = `<div class="nikke-list-collapsible">${filterHtml}${addHtml}<div class="nikke-list">${list}</div></div>`;
        const sidebarEl = document.getElementById("gear-sidebar-inner");
        if (!sidebarEl) {
            el.innerHTML = `<div class="two-col">
      <div class="nikke-sidebar${_nikkeListCollapsed ? " nikke-list-collapsed" : ""}" id="gear-sidebar-inner">${toggleBtn}${collapsibleHtml}</div>
      <div id="gear-main">${state.selGear ? "" : '<div class="empty-state">← Select a Nikke</div>'}</div>
    </div>${renderGearAddOverlay()}`;
        } else {
            sidebarEl.innerHTML = toggleBtn + collapsibleHtml;
            sidebarEl.classList.toggle("nikke-list-collapsed", _nikkeListCollapsed);
        }
        if (_gearSidebarSearch) filterGearSidebarList();
    }

    if (state.selGear) {
        const n = state.nikkes.find((x) => x.id === state.selGear);
        if (n) renderGearMain(n);
    }
}

// Surgically refresh just the 4 gear dots for one Nikke in the sidebar list,
// without re-rendering any other list item. Used after editing gear lines.
function updateGearDots(nikke) {
    const dotsEl = document.querySelector(`#gear .nikke-item[data-id="${nikke.id}"] .gear-dots-mini`);
    if (!dotsEl) return;
    SLOTS.forEach((s) => {
        const dot = dotsEl.querySelector(`[data-slot="${s}"]`);
        if (dot) dot.className = dotStatus(nikke, s);
    });
}

function setGearBurstFilter(val) {
    state.gearBurstFilter = val;
    save();
    renderGear();
}

function setGearSidebarSort(val) {
    state.gearSidebarSort = val;
    state.gearSidebarSortDir = val === "alpha" ? "asc" : "desc";
    save();
    renderGear();
}

function toggleGearSidebarSortDir() {
    state.gearSidebarSortDir = state.gearSidebarSortDir === "asc" ? "desc" : "asc";
    save();
    renderGear();
}

// Popup picker for adding a Nikke — styled like the Teams slot picker.
function renderGearAddOverlay() {
    return `<div class="team-slot-picker-overlay" id="gear-add-overlay" onclick="if(event.target===this)hideGearAddForm()">
      <div class="team-slot-picker-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:14px;font-weight:600;color:#f1f5f9">Add a Nikke</span>
          <button class="del-btn" onclick="hideGearAddForm()" style="font-size:16px">✕</button>
        </div>
        <input class="form-input" id="gear-nn-search" placeholder="Search..." oninput="filterGearNikkeList()" style="margin-bottom:8px"/>
        <div id="gear-nn-list" class="team-slot-picker-list"></div>
      </div>
    </div>`;
}

function showGearAddForm() {
    const overlay = document.getElementById("gear-add-overlay");
    if (!overlay) return;
    overlay.classList.add("show");
    const search = document.getElementById("gear-nn-search");
    if (search) {
        search.value = "";
        search.focus();
    }
    filterGearNikkeList();
}
function hideGearAddForm() {
    const overlay = document.getElementById("gear-add-overlay");
    if (overlay) overlay.classList.remove("show");
}

function filterGearNikkeList() {
    const search = document.getElementById("gear-nn-search");
    const list = document.getElementById("gear-nn-list");
    if (!list) return;
    const q = search ? search.value.toLowerCase() : "";
    const addedNames = new Set(state.nikkes.map((n) => n.name));
    const available = NIKKE_DATABASE.filter((n) => !addedNames.has(n.name) && n.name.toLowerCase().includes(q));
    list.innerHTML =
        available
            .map((n) => {
                const elem = n.element ? elemIcon(n.element) : "";
                const bd = burstDisplay(n);
                const burstNum = bd === "All" ? "All" : bd === "III" ? 3 : bd === "II" ? 2 : bd === "I" ? 1 : null;
                const burst = burstNum ? burstIcon(burstNum) : "";
                return `<div class="team-slot-picker-item" onclick="pickGearAddNikke('${n.name.replace(/'/g, "\\'")}')">
      ${nikkeIcon(n.name, 28)}
      <span>${n.name}</span>
      <span style="display:flex;align-items:center;gap:4px;margin-left:auto">${elem} ${burst}</span>
    </div>`;
            })
            .join("") || '<div style="padding:8px;color:#475569;font-size:13px">No available Nikkes</div>';
}

function pickGearAddNikke(name) {
    const entry = NIKKE_DATABASE.find((n) => n.name === name);
    if (!entry) return;
    const nikke = mkNikke(entry.name, entry.burst1, entry.burst2, entry.burst3, entry.element);
    state.nikkes.push(nikke);
    state.selGear = nikke.id;
    try {
        localStorage.setItem("nikke_selGear", nikke.id);
    } catch (e) {}
    hideGearAddForm();
    save();
    render();
}

function setGearElementFilter(val) {
    state.gearElementFilter = val;
    save();
    renderGear();
}

function setGearManufacturerFilter(val) {
    state.gearManufacturerFilter = val;
    save();
    renderGear();
}

function setGearWeaponFilter(val) {
    state.gearWeaponFilter = val;
    save();
    renderGear();
}

function selGearNikke(id) {
    if (state.selGear === id) return;
    state.selGear = id;
    _nikkeListCollapsed = true; // mobile: hide the list so the picked Nikke's detail shows
    try {
        localStorage.setItem("nikke_selGear", id);
    } catch (e) {}
    const sb = document.getElementById("gear-sidebar-inner");
    if (sb) {
        sb.classList.add("nikke-list-collapsed");
        const tog = sb.querySelector(".roster-list-toggle");
        if (tog) tog.setAttribute("aria-expanded", "false");
    }
    // Just update active class without re-rendering sidebar
    document.querySelectorAll("#gear .nikke-list .nikke-item").forEach((el) => {
        const isActive = el.getAttribute("onclick")?.includes(id);
        el.classList.toggle("active", isActive);
    });
    // Only re-render the main content area
    const n = state.nikkes.find((x) => x.id === id);
    if (n) renderGearMain(n);
}

// Toggle between the "Gear" and "Priorities" sub-tabs in the Nikke detail panel.
// Just flips visibility — no re-render — so the active tab is preserved on redraw.
function switchGearSubTab(tab) {
    _gearSubTab = tab === "priorities" ? "priorities" : "gear";
    document.querySelectorAll("#gear .gear-subtab").forEach((b) => {
        b.classList.toggle("active", b.dataset.subtab === _gearSubTab);
    });
    const g = document.getElementById("gear-subtab-gear");
    const p = document.getElementById("gear-subtab-priorities");
    if (g) g.style.display = _gearSubTab === "gear" ? "" : "none";
    if (p) p.style.display = _gearSubTab === "priorities" ? "" : "none";
}

function renderGearMain(nikke) {
    const area = document.getElementById("gear-main");
    const totals = attrTotals(nikke);

    // Attribute totals — every substat currently on gear (plus any prioritised line); nothing filtered out
    const trackedStats = [
        ...new Set([...Object.keys(totals), ...nikke.priorities.filter((p) => p.line).map((p) => p.line)]),
    ];

    // Order: ideal → passable → trash/unset, then alphabetical within each group
    const attrRole = (s) => {
        const c = classifyLine(s, nikke);
        return c === "ideal" ? 0 : c === "passable" ? 1 : 2;
    };
    const sortedStats = trackedStats.slice().sort((a, b) => attrRole(a) - attrRole(b) || a.localeCompare(b));

    const attrRows = sortedStats
        .map((stat) => {
            const cls = classifyLine(stat, nikke);
            const statCls = cls === "ideal" ? "is-ideal" : cls === "passable" ? "is-passable" : "is-trash";
            const tot = totals[stat] || 0;
            // Lines column = how many lines for this stat are currently on the nikke's gear
            const lineCount = SLOTS.reduce(
                (n, s) => n + nikke.gear[s].lines.filter((l) => l.stat === stat && l.val).length,
                0,
            );
            // Match the priority the same way classifyLine does (handles stat-name
            // aliases like "Elemental Damage" vs "Elemental Dmg")
            const prio = nikke.priorities.find((p) => normStat(p.line) === normStat(stat));
            // Target's line count comes from the Line Priorities tab (count), not current gear
            const prioCount = prio ? parseInt(prio.count) || 1 : 0;
            const tgtTier = prio ? parseInt(prio.targetTier) || 11 : 11;
            const tgtVal = TIER_TABLE[stat] ? TIER_TABLE[stat][tgtTier - 1] : null;
            const unit = IS_PCT.has(stat) ? "%" : "";
            // Target = priority line count × value at target tier; "—" only when no priority entry
            const tgtTotal = prio && tgtVal !== null ? prioCount * tgtVal : null;

            // Status = Target − current. Not a line priority → Trash (red);
            // below target → remaining gap (yellow); at/above target → green ✓
            let statusCell, totState;
            if (!prio) {
                statusCell = `<span class="at-pill at-pill-trash">✗ Trash</span>`;
                totState = tot > 0 ? "is-trash" : "is-zero";
            } else if (tgtTotal !== null && tot >= tgtTotal) {
                statusCell = `<span class="at-pill at-pill-met">✓ Met</span>`;
                totState = "is-met";
            } else {
                const gap = (tgtTotal !== null ? tgtTotal : 0) - tot;
                statusCell = `<span class="at-pill at-pill-below">↓ ${gap.toFixed(2)}${unit}</span>`;
                totState = tot > 0 ? "is-below" : "is-zero";
            }
            const totCls = "at-num at-total " + totState;
            return `<div class="at-row">
      <span class="at-stat ${statCls}">${stat}</span>
      <span class="at-num">${lineCount || "—"}</span>
      <span class="${totCls}">${tot > 0 ? tot.toFixed(2) + unit : "—"}</span>
      <span class="at-num at-goal" title="${tgtTotal !== null ? prioCount + " priority line(s) × T" + tgtTier + " value (" + tgtVal + "%)" : "No line priority set for this stat"}">${tgtTotal !== null ? tgtTotal.toFixed(2) + unit : "—"}</span>
      <span class="at-status">${statusCell}</span>
    </div>`;
        })
        .join("");

    const attrTable = trackedStats.length
        ? `
    <div class="attr-summary">
      <div class="at-head">
        <span class="attr-summary-title">Attribute Totals</span>
      </div>
      <div class="at-colhead">
        <span>Stat</span><span>Lines</span><span>Total</span><span>Target</span><span>Status</span>
      </div>
      ${attrRows}
    </div>`
        : "";

    // Gear slot cards
    const slots = SLOTS.map((slot) => {
        const gear = nikke.gear[slot];
        const v = getVerdict(nikke, slot);
        const sc = scorePiece(nikke, slot);

        const badge = sc
            ? `<span style="font-size:13px;padding:2px 8px;border-radius:5px;font-weight:600;background:${v.cls === "v-keep" ? "#052e16" : v.cls === "v-ok" ? "#3f2a06" : "#3f1010"};color:${v.cls === "v-keep" ? "#4ade80" : v.cls === "v-ok" ? "#fcd34d" : "#f87171"}">${sc.good} good · ${sc.trash} trash</span>`
            : `<span style="font-size:13px;color:#334155">Not entered</span>`;

        const lineBoxes = gear.lines
            .map((line, i) => {
                const cls = line.stat ? classifyLine(line.stat, nikke) : null;
                const tier = line.stat && line.val ? getTier(line.stat, line.val) : null;
                const tb = tier ? tierBadgeInfo(tier) : null;
                const targetTier = line.stat ? getTargetTier(line.stat, nikke) : 11;
                const atTarget = line.stat && line.val ? isAtTarget(line.stat, line.val, nikke) : false;
                const aboveMin = line.stat && line.val ? isAboveMinVal(line.stat, line.val) : true;
                const prioText =
                    !cls || cls === "unset"
                        ? ""
                        : cls === "ideal"
                          ? "Ideal"
                          : cls === "passable"
                            ? "Passable"
                            : cls === "trash"
                              ? "Trash"
                              : "";
                const prioCls = prioText ? `prio-${cls}` : "";
                // A stat can't appear twice on the same piece — hide stats already used on the other lines
                const usedOnOtherLines = new Set(
                    gear.lines
                        .filter((_, li) => li !== i)
                        .map((ln) => ln.stat)
                        .filter(Boolean),
                );
                const opts = ALL_LINES.filter((l) => l === line.stat || !usedOnOtherLines.has(l))
                    .map((l) => `<option value="${l}" ${line.stat === l ? "selected" : ""}>${l}</option>`)
                    .join("");
                const unit = line.stat && IS_PCT.has(line.stat) ? "%" : "";
                const normalVal = line.val ? parseFloat(String(line.val).replace("%", "")).toFixed(2) : "";
                const tierOpts =
                    line.stat && TIER_TABLE[line.stat]
                        ? TIER_TABLE[line.stat]
                              .map((v, ti) => {
                                  const vStr = v.toFixed(2);
                                  return `<option value="${vStr}"${normalVal === vStr ? " selected" : ""}>${vStr}</option>`;
                              })
                              .join("")
                        : "";
                return `<div class="line-box" style="${line.locked ? "border-color:#166534;background:#052e16" : ""}">
        <div class="line-header">
          <span class="line-label">Line ${i + 1} - ${LINE_CHANCE_LABELS[i]}</span>
          ${prioText ? `<span class="prio-tag ${prioCls}">${prioText}</span>` : ""}
        </div>
        <div class="line-selects">
          <select onchange="updateStat('${nikke.id}','${slot}',${i},this.value)" onkeydown="gearSelectKeydown(event,'${nikke.id}','${slot}',${i})" data-gear-select="${nikke.id}-${slot}-${i}" tabindex="${i * 2 + 1}" style="flex:1;min-width:0">
<option value="">None</option>${opts}
          </select>
          <div class="line-value-row">
            <select class="value-input"
data-gear-val="${nikke.id}-${slot}-${i}"
${!line.stat ? "disabled" : ""}
tabindex="${i * 2 + 2}"
onchange="updateVal('${nikke.id}','${slot}',${i},this.value)"
style="width:64px;flex-shrink:0">
<option value="">—</option>
${tierOpts}
            </select>
            ${unit ? `<span class="value-unit">${unit}</span>` : ""}
            ${tb ? `<span class="tier-badge ${tb.cls}">${tb.label}</span>` : ""}
          </div>
        </div>
        ${line.stat && line.val && !aboveMin ? `<div class="warn-text">⚠ Below min ${MIN_VAL[line.stat]}%</div>` : ""}
        ${line.stat && line.val && aboveMin && !atTarget && isGoodLine(cls) ? `<div class="below-text">Below target T${targetTier}</div>` : ""}
        <button class="lock-btn ${line.locked ? "locked" : ""}"
          onclick="toggleLock('${nikke.id}','${slot}',${i})"
          ${!line.stat ? "disabled" : ""} tabindex="-1">
          ${line.locked ? "🔒 Locked" : "Lock"}
        </button>
      </div>`;
            })
            .join("");

        let verdictHtml = "";
        if (v) {
            // Plain numbered instruction list
            const stepList = (steps) =>
                steps && steps.length
                    ? `<div class="verdict-steps">${steps
                          .map(
                              (s, i) =>
                                  `<div class="verdict-step"><span class="step-num">${i + 1}.</span><span>${s}</span></div>`,
                          )
                          .join("")}</div>`
                    : "";
            // Damage suffix for the option rows, e.g. " · +4.4% dmg"
            const dmgTxt = (g) => (g && g > 0 ? ` · +${g.toFixed(1)}% dmg` : "");
            // Rocks + dmg estimate for the card title — no em-dash, standard weight (not bold)
            const costTxt = (rocks, g) => {
                let inner = "";
                if (rocks > 0) inner = `~${rocks} rocks${dmgTxt(g)}`;
                else if (g && g > 0) inner = `+${g.toFixed(1)}% dmg`;
                return inner ? ` <span class="verdict-cost">${inner}</span>` : "";
            };

            if (v.options && v.options.length === 1) {
                // Single surviving option → render like a plain verdict
                const opt = v.options[0];
                const title = v.action || opt.action || v.label;
                const summary = `${title}${costTxt(opt.rocks, opt.dpsGain)}`;
                verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          ${stepList(opt.simpleSteps && opt.simpleSteps.length ? opt.simpleSteps : opt.steps)}
        </details>`;
            } else if (v.options) {
                const title = v.action || v.label;
                const summary = `${title}`;
                const optionsBody = v.options
                    .map(
                        (opt) => `
<div class="verdict-option" style="${opt.recommended ? "border-left:3px solid currentColor" : ""}">
  <div class="verdict-option-title">${opt.recommended ? "★ " : ""}${opt.action || opt.title}<span class="rock-est">${opt.rocks > 0 ? `~${opt.rocks} rocks` : ""}${dmgTxt(opt.dpsGain)}</span>${opt.recommended ? '<span class="recommended-badge">Recommended</span>' : ""}</div>
  ${stepList(opt.simpleSteps && opt.simpleSteps.length ? opt.simpleSteps : opt.steps)}
</div>`,
                    )
                    .join("");
                verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          ${optionsBody}
        </details>`;
            } else {
                const title = v.action || v.label;
                const simple = v.simpleSteps && v.simpleSteps.length ? v.simpleSteps : null;
                const summary = `${title}${costTxt(v.rocks, v.dpsGain)}`;
                if (!simple) {
                    // "Done" / "Keep" states: summary only, no expander
                    verdictHtml = `<div class="verdict ${v.cls} verdict-static"><span class="verdict-title">${summary}</span></div>`;
                } else {
                    verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          ${stepList(simple)}
        </details>`;
                }
            }
        }

        const tierVal = gear.tier && gear.tier > 0 ? gear.tier : null;
        const lvVal = gear.lv != null ? gear.lv : 0;
        const tierLvEdit = `<div style="display:flex;align-items:center;gap:8px;margin-left:2px">
        <span style="display:flex;align-items:center;gap:4px;font-size:12px;color:#64748b;font-weight:400">Tier${gearStepperHtml(nikke.id, slot, "tier", tierVal, 1, 10)}</span>
        <span style="display:flex;align-items:center;gap:4px;font-size:12px;color:#64748b;font-weight:400">Lv${gearStepperHtml(nikke.id, slot, "lv", lvVal, 0, 5)}</span>
      </div>`;
        return `<div class="slot-card">
      <div class="slot-header"><div style="display:flex;align-items:center;gap:6px"><span class="slot-tag">${slot}</span>${tierLvEdit}</div><div style="display:flex;align-items:center;gap:6px">${badge}</div></div>
      <div class="lines-grid">${lineBoxes}</div>
      ${verdictHtml}
    </div>`;
    }).join("");

    // Editable Nikke stats: Power / Bond / Limit Break / Cores / Cube / Doll
    const db = NIKKE_DB_MAP.get(nikke.name) || {};
    const bondMax = bondMaxFor(nikke) ?? 0;
    const skillRec = db.build && db.build.skill && db.build.skill.pve ? skillTargetVals(db.build.skill.pve) : null;
    // Current-vs-target colour (skills, bond): green once current ≥ target, yellow while below.
    const targetColor = (cur, tgt) => (tgt == null ? null : (cur ?? 0) >= tgt ? "#4ade80" : "#fcd34d");
    const lbMax = db.rarity === "SSR" ? 3 : db.rarity === "SR" ? 2 : 0;
    const coresMax = db.rarity === "SSR" ? 7 : 0;
    const fieldLabelCss = "font-size:12px;color:#64748b;letter-spacing:.04em";
    const fieldInputCss =
        "font-size:14px;padding:4px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%";
    const trackedTids = new Set(
        Object.keys(state.cubeLevels ?? {}).filter((tid) => (state.cubeLevels ?? {})[tid] != null),
    );
    const hasUntracked = Object.keys(HARMONY_CUBES).some((tid) => !trackedTids.has(tid));
    // Recommended PVE cubes for this Nikke — used to mark options with a star and colour the field.
    const recCubes = (db.build && db.build.cube && db.build.cube.pve) || [];
    const cubeOpts = Object.entries(HARMONY_CUBES)
        .filter(([tid]) => trackedTids.has(tid))
        .map(([tid, name]) => {
            const lv = (state.cubeLevels ?? {})[tid];
            const isRec = recCubes.includes(name);
            const isSelected = nikke.cube && String(nikke.cube.tid) === tid;
            // Star recommended cubes in the dropdown, but not on the selected option — the
            // closed field mirrors its text and we want it star-free. cubeStarOn/Off (wired to
            // the select's mousedown/blur) re-adds the star to the selected option only while
            // the dropdown is open. data-rec marks which options are eligible for that.
            const star = isRec && !isSelected ? "★ " : "";
            const label = `${star}${name.replace(/ Cube$/i, "")} - Lv.${lv}`;
            return `<option value="${tid}" ${isRec ? 'data-rec="1"' : ""} ${isSelected ? "selected" : ""}>${label}</option>`;
        })
        .concat(hasUntracked ? [`<option value="__add_cube__" style="color:#60a5fa">+ Add another cube</option>`] : [])
        .join("");
    // Colour the selected cube green if it's a recommended PVE cube for this Nikke, yellow if not.
    const selCubeName = nikke.cube ? (HARMONY_CUBES[nikke.cube.tid] ?? nikke.cube.name) : null;
    const cubeColor = selCubeName ? (recCubes.includes(selCubeName) ? "#4ade80" : "#fcd34d") : null;
    const equippedDollDb = nikke.doll ? COLLECTION_DOLLS.find((d) => d.id === nikke.doll.tid) : null;
    const isTreasureDoll = equippedDollDb != null && equippedDollDb.treasure != null;
    const dollCandidates = COLLECTION_DOLLS.filter((d) => {
        if (nikke.doll && nikke.doll.tid === d.id) return true;
        if (d.treasure != null) return d.treasure === nikke.name;
        return d.weapon === db.weapon;
    });
    const dollOpts = dollCandidates
        .map(
            (d) =>
                `<option value="${d.id}" ${nikke.doll && nikke.doll.tid === d.id ? "selected" : ""}>${d.rarity}</option>`,
        )
        .join("");
    // Colour the doll rarity green when it's the highest available for this Nikke, yellow otherwise.
    const DOLL_RARITY_RANK = { R: 1, SR: 2, SSR: 3 };
    const maxDollRank = dollCandidates.reduce((m, d) => Math.max(m, DOLL_RARITY_RANK[d.rarity] ?? 0), 0);
    const dollRarityColor = equippedDollDb
        ? (DOLL_RARITY_RANK[equippedDollDb.rarity] ?? 0) >= maxDollRank
            ? "#4ade80"
            : "#fcd34d"
        : null;
    // Colour the doll level green at max (15), yellow otherwise.
    const dollLevelColor = nikke.doll && nikke.doll.lv != null ? (nikke.doll.lv >= 15 ? "#4ade80" : "#fcd34d") : null;
    const statsPanel = `
    <div class="nikke-stats-edit" style="background:#0f1320;border:1px solid #1e2535;border-radius:8px;padding:10px 12px;margin-bottom:10px">
      <div class="stats-grid-main">
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Power</span>
          <input type="text" inputmode="numeric" style="${fieldInputCss}" placeholder="—" value="${nikke.power != null ? nikke.power : ""}" onchange="updateNikkeStat('${nikke.id}','power',this.value)"/></label>
        <div style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Limit Break</span>
          ${statStepperHtml(nikke.id, "limitBreak", nikke.limitBreak, 0, lbMax, false, undefined, lbMax === 0, null, true)}</div>
        <div style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Cores</span>
          ${statStepperHtml(nikke.id, "cores", nikke.cores, 0, coresMax, false, undefined, coresMax === 0, null, true)}</div>
        <div style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Bond</span>
          ${statStepperHtml(nikke.id, "bond", nikke.bond, 0, bondMax, false, undefined, bondMax === 0, bondMax > 0 ? targetColor(nikke.bond, bondMax) : null, true)}</div>
      </div>
      <div class="stats-grid-skills">
        <span style="${fieldLabelCss}">Skill 1${skillRec ? ` <span style="color:${targetColor(nikke.skill1, skillRec.s1) || "#475569"}">· ${state.skillTarget === "rec" ? "rec" : "max"} ${skillRec.s1}</span>` : ""}</span>
        <span style="${fieldLabelCss}">Skill 2${skillRec ? ` <span style="color:${targetColor(nikke.skill2, skillRec.s2) || "#475569"}">· ${state.skillTarget === "rec" ? "rec" : "max"} ${skillRec.s2}</span>` : ""}</span>
        <span style="${fieldLabelCss}">Skill 3${skillRec ? ` <span style="color:${targetColor(nikke.skill3, skillRec.s3) || "#475569"}">· ${state.skillTarget === "rec" ? "rec" : "max"} ${skillRec.s3}</span>` : ""}</span>
        <span></span>
        ${statStepperHtml(nikke.id, "skill1", nikke.skill1, 1, 10, false, undefined, false, skillRec ? targetColor(nikke.skill1, skillRec.s1) : null)}
        ${statStepperHtml(nikke.id, "skill2", nikke.skill2, 1, 10, false, undefined, false, skillRec ? targetColor(nikke.skill2, skillRec.s2) : null)}
        ${statStepperHtml(nikke.id, "skill3", nikke.skill3, 1, 10, false, undefined, false, skillRec ? targetColor(nikke.skill3, skillRec.s3) : null)}
        <span class="seg-toggle" style="align-self:stretch"><button class="${state.skillTarget === "rec" ? "seg-active" : ""}" onclick="setSkillTarget('rec')">Rec</button><button class="${state.skillTarget === "max" ? "seg-active" : ""}" onclick="setSkillTarget('max')">Max</button></span>
      </div>
      <div class="stats-grid-accessories">
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Cube</span>
          <div style="display:flex;gap:4px">
<select style="${fieldInputCss};flex:1${cubeColor ? `;color:${cubeColor}` : ""}" onmousedown="cubeStarOn(this)" onblur="cubeStarOff(this)" onchange="updateNikkeCube('${nikke.id}',this.value)"><option value="">None</option>${cubeOpts}</select>
          </div></label>
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Doll</span>
          <div style="display:flex;gap:4px">
<select style="${fieldInputCss};width:0;flex:1 1 0;min-width:0${dollRarityColor ? `;color:${dollRarityColor}` : ""}" onchange="updateNikkeDoll('${nikke.id}',this.value)"><option value="">None</option>${dollOpts}</select>
${nikke.doll && !isTreasureDoll ? statStepperHtml(nikke.id, "doll", nikke.doll.lv, 0, 15, true, "flex:1 1 0;min-width:0", undefined, dollLevelColor) : ""}
          </div></label>
      </div>
    </div>`;

    // Look up weapon / rarity / manufacturer / class from the database
    const weaponCode = nikke.weapon || db.weapon || "";
    const weaponLabel = NIKKE_WEAPONS[weaponCode] || weaponCode;
    const metaItems = [
        nikke.element ? ["Element", nikke.element] : null,
        nikke.burst1 || nikke.burst2 || nikke.burst3 ? ["Burst", burstDisplay(nikke)] : null,
        weaponLabel ? ["Weapon", weaponLabel] : null,
        db.rarity ? ["Rarity", db.rarity] : null,
        db.manufacturer ? ["Manufacturer", db.manufacturer] : null,
        db.class ? ["Class", db.class] : null,
    ].filter(Boolean);
    const metaLine = metaItems.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:3px 14px;font-size:15px;color:#cbd5e1;margin-top:5px">' +
          metaItems.map(([k, v]) => `<span><span style="color:#64748b">${k}:</span> ${v}</span>`).join("") +
          "</div>"
        : "";

    const hdrHtml = `
    <div class="nikke-hdr" style="display:flex;align-items:flex-start;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:12px">
        ${nikkeIcon(nikke.name, 56)}
        <div>
          <div style="font-size:25px;font-weight:700;color:#f1f5f9;line-height:1.15">${nikke.name}</div>
          ${metaLine}
        </div>
      </div>
    </div>`;
    // ── Damage Calculator Section ──
    const dmgCalcHtml = renderDamageCalcPanel(nikke, totals);

    // ── Sub-tabs: Gear (attribute totals + slots + damage) vs Priorities ──
    const sub = _gearSubTab === "priorities" ? "priorities" : "gear";
    const subTabBar = `
    <div class="gear-subtab-bar">
      <button class="gear-subtab ${sub === "gear" ? "active" : ""}" data-subtab="gear" onclick="switchGearSubTab('gear')">Gear</button>
      <button class="gear-subtab ${sub === "priorities" ? "active" : ""}" data-subtab="priorities" onclick="switchGearSubTab('priorities')">Priorities</button>
    </div>`;
    const gearTabHtml = attrTable + slots + dmgCalcHtml;
    const prioTabHtml = renderPrioContent(nikke);
    const bodyHtml =
        statsPanel +
        subTabBar +
        `<div id="gear-subtab-gear"${sub === "gear" ? "" : ' style="display:none"'}>${gearTabHtml}</div>` +
        `<div id="gear-subtab-priorities"${sub === "priorities" ? "" : ' style="display:none"'}>${prioTabHtml}</div>`;
    const existingHdr = area.querySelector("[data-nikke-hdr]");
    if (!existingHdr || existingHdr.dataset.nikkeHdr !== nikke.name) {
        area.innerHTML = `<div data-nikke-hdr="${nikke.name}">${hdrHtml}</div><div id="gear-body-inner">${bodyHtml}</div>`;
    } else {
        document.getElementById("gear-body-inner").innerHTML = bodyHtml;
    }
}

// ── Editable Nikke stats (Power / Bond / Limit Break / Cores / Cube / Doll / Skills) ──
// Max bond is LB-based: (LB+1)*10 → LB0=10, LB1=20, LB2=30, LB3=40.
// Only Pilgrim / over-spec Nikkes reach 40 at LB3; everyone else caps at 30.
// R Nikkes have no bond (returns null).
function bondMaxFor(n) {
    const db = NIKKE_DB_MAP.get(n.name) || {};
    if (db.rarity === "R") return null;
    const lb = n.limitBreak != null ? n.limitBreak : 0;
    const base = (lb + 1) * 10;
    const elevated = db.manufacturer === "Pilgrim" || db.overspec === true;
    return Math.min(base, elevated ? 40 : 30);
}
function getNikkeStatMax(n, field) {
    const db = NIKKE_DB_MAP.get(n.name) || {};
    if (field === "bond") return bondMaxFor(n) ?? 0;
    if (field === "limitBreak") return db.rarity === "SSR" ? 3 : db.rarity === "SR" ? 2 : 0;
    if (field === "cores") return db.rarity === "SSR" ? 7 : 0;
    if (field === "skill1" || field === "skill2" || field === "skill3") return 10;
    return null;
}
function clampNikkeStat(n, field, num) {
    num = Math.max(0, num);
    const max = getNikkeStatMax(n, field);
    return max != null ? Math.min(max, num) : num;
}

// Builds a themed −/+ stepper (replaces the native number-input spin buttons).
// accessory=true targets a cube/doll level (field is "cube"/"doll").
function statStepperHtml(nid, field, value, min, max, accessory, extraStyle, disabled, valColor, showMax) {
    const stepFn = accessory ? "stepNikkeAccessoryLv" : "stepNikkeStat";
    const changeFn = accessory ? "updateNikkeAccessoryLv" : "updateNikkeStat";
    const v = value != null ? value : "";
    const maxAttr = max != null ? `max="${max}" ` : "";
    const numVal = value != null ? Number(value) : null;
    const minDis = disabled || (numVal != null && numVal <= min) ? " disabled" : "";
    const maxDis = disabled || (max != null && numVal != null && numVal >= max) ? " disabled" : "";
    const inputDis = disabled ? " disabled" : "";
    // Optional value colour (e.g. skill level vs target) — bold like the design mockup.
    const inputStyle = valColor ? ` style="color:${valColor};font-weight:600"` : "";
    // Optional "/max" suffix beside the value (LB / Cores / Bond) — mockup style.
    const hasMax = showMax && max != null && Number(max) > 0;
    const inputHtml = `<input class="stepper-input" type="number" inputmode="numeric" min="${min}" ${maxAttr}step="1" placeholder="—" value="${v}" onchange="${changeFn}('${nid}','${field}',this.value)"${inputDis}${inputStyle}/>`;
    const mid = hasMax
        ? `<span class="stepper-valwrap">${inputHtml}<span class="stepper-max">/${max}</span></span>`
        : inputHtml;
    return `<div class="stepper${hasMax ? " has-max" : ""}"${extraStyle ? ` style="${extraStyle}"` : ""}>
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="${stepFn}('${nid}','${field}',-1)"${minDis}>−</button>
${mid}
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="${stepFn}('${nid}','${field}',1)"${maxDis}>+</button>
          </div>`;
}

// Compact stepper for a gear piece's tier (1–10) or level (0–5), shown in the slot header.
function gearStepperHtml(nid, slot, field, value, min, max) {
    const v = value != null ? value : "";
    const numVal = value != null ? Number(value) : null;
    const minDis = numVal != null && numVal <= min ? " disabled" : "";
    const maxDis = numVal != null && numVal >= max ? " disabled" : "";
    return `<div class="stepper" style="width:82px">
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="stepGearField('${nid}','${slot}','${field}',-1)"${minDis}>−</button>
<input class="stepper-input" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" placeholder="—" value="${v}" onchange="updateGearField('${nid}','${slot}','${field}',this.value)"/>
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="stepGearField('${nid}','${slot}','${field}',1)"${maxDis}>+</button>
          </div>`;
}

function gearFieldRange(field) {
    return field === "tier" ? { min: 1, max: 10 } : { min: 0, max: 5 };
}

function stepGearField(nid, slot, field, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n.gear || !n.gear[slot]) return;
    const { min, max } = gearFieldRange(field);
    const cur = n.gear[slot][field] != null ? n.gear[slot][field] : min;
    n.gear[slot][field] = Math.max(min, Math.min(max, cur + delta));
    save();
    renderGearMain(n);
}

function updateGearField(nid, slot, field, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n.gear || !n.gear[slot]) return;
    const { min, max } = gearFieldRange(field);
    const trimmed = String(val).trim();
    if (trimmed === "") {
        // Blank clears back to the unset baseline (tier 0 = "not entered", level 0).
        n.gear[slot][field] = 0;
    } else {
        let num = parseInt(trimmed.replace(/[^0-9]/g, ""), 10);
        if (isNaN(num)) num = min;
        n.gear[slot][field] = Math.max(min, Math.min(max, num));
    }
    save();
    renderGearMain(n);
}

function updateNikkeStat(nid, field, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    const trimmed = String(val).trim();
    if (trimmed === "") {
        n[field] = null;
    } else {
        let num = parseInt(trimmed.replace(/[^0-9]/g, ""), 10);
        if (isNaN(num)) num = 0;
        n[field] = clampNikkeStat(n, field, num);
    }
    save();
    renderGearMain(n);
}

function stepNikkeStat(nid, field, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    const cur = n[field] != null ? n[field] : 0;
    n[field] = clampNikkeStat(n, field, cur + delta);
    save();
    renderGearMain(n);
}

function stepNikkeAccessoryLv(nid, which, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n[which]) return;
    const cur = n[which].lv != null ? n[which].lv : 0;
    n[which].lv = Math.max(0, cur + delta);
    save();
    renderGearMain(n);
}

// Show the recommendation star on the *selected* cube only while its dropdown is open.
// mousedown fires just before the native list opens; blur restores the star-free field text.
// Only the selected option is touched, so the static stars on other recommended options stay put.
function cubeStarOn(sel) {
    const o = sel.options[sel.selectedIndex];
    if (o && o.dataset.rec === "1" && !o.textContent.startsWith("★ ")) {
        o.textContent = "★ " + o.textContent;
    }
}
function cubeStarOff(sel) {
    const o = sel.options[sel.selectedIndex];
    if (o && o.textContent.startsWith("★ ")) {
        o.textContent = o.textContent.slice(2);
    }
}

function updateNikkeCube(nid, tid) {
    if (tid === "__add_cube__") {
        switchTab("cubes", null);
        return;
    }
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    if (!tid) {
        n.cube = null;
    } else {
        const tnum = parseInt(tid, 10);
        n.cube = {
            tid: tnum,
            name: HARMONY_CUBES[tnum] ?? null,
        };
    }
    save();
    renderGearMain(n);
}

function updateNikkeDoll(nid, tid) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    if (!tid) {
        n.doll = null;
    } else {
        const tnum = parseInt(tid, 10);
        n.doll = {
            tid: tnum,
            lv: n.doll && n.doll.lv != null ? n.doll.lv : 0,
            name: COLLECTION_DOLLS.find((d) => d.id === tnum)?.name ?? null,
        };
    }
    save();
    renderGearMain(n);
}

function updateNikkeAccessoryLv(nid, which, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n[which]) return;
    let num = parseInt(String(val).replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || num < 0) num = 0;
    n[which].lv = num;
    save();
}

function updateStat(nid, slot, i, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    const line = n.gear[slot].lines[i];
    const prevStat = line.stat;
    const prevVal = line.val;
    line.stat = val;
    if (!val) {
        line.val = "";
        line.locked = false;
    } else if (prevStat && prevStat !== val && prevVal && TIER_TABLE[val]) {
        // Stat changed: keep the same tier, load that tier's % value for the new stat
        const tier = getTier(prevStat, prevVal);
        if (tier && TIER_TABLE[val][tier - 1] !== undefined) {
            line.val = TIER_TABLE[val][tier - 1].toFixed(2);
        }
    }
    save();
    renderGearMain(n);
    updateGearDots(n); // patch just this Nikke's 4 sidebar dots, nothing else in the list
    renderOverview();
    // Auto-focus the value input for this line after selecting a stat
    if (val) {
        setTimeout(() => {
            const inp = document.querySelector(`[data-gear-val="${nid}-${slot}-${i}"]`);
            if (inp && !inp.disabled) inp.focus();
        }, 0);
    }
}

function gearValKeydown(event, nid, slot, i) {
    // select onchange handles saving; nothing to intercept
}

function gearSelectKeydown(event, nid, slot, i) {
    if (event.key === "Tab") {
        event.preventDefault();
        // Jump directly to this line's value input if stat is set, otherwise next line's select
        const inp = document.querySelector(`[data-gear-val="${nid}-${slot}-${i}"]`);
        if (inp && !inp.disabled) {
            inp.focus();
        } else {
            const nextIdx = i + 1;
            if (nextIdx < 3) {
                const nextSel = document.querySelector(`[data-gear-select="${nid}-${slot}-${nextIdx}"]`);
                if (nextSel) nextSel.focus();
            }
        }
    }
}
function formatValLive(input) {
    // Strip non-digits, then auto-insert decimal before last 2 digits as user types
    let digits = input.value.replace(/[^0-9]/g, "");
    if (digits.length <= 2) {
        input.value = digits; // not enough digits yet to format
    } else {
        input.value = digits.slice(0, -2) + "." + digits.slice(-2);
    }
}

function updateVal(nid, slot, i, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.gear[slot].lines[i].val = val.trim();
    save();
    renderGearMain(n);
    updateGearDots(n); // patch just this Nikke's 4 sidebar dots, nothing else in the list
    renderOverview();
    // Auto-focus the next line's stat select (if there is one and it's empty)
    const nextIdx = i + 1;
    if (nextIdx < 3 && val.trim()) {
        setTimeout(() => {
            const sel = document.querySelector(`[data-gear-select="${nid}-${slot}-${nextIdx}"]`);
            if (sel && !sel.value) sel.focus();
        }, 0);
    }
}
function toggleLock(nid, slot, i) {
    const n = state.nikkes.find((x) => x.id === nid);
    const l = n.gear[slot].lines[i];
    if (!l.stat) return;
    l.locked = !l.locked;
    save();
    renderGearMain(n);
    updateGearDots(n); // patch just this Nikke's 4 sidebar dots, nothing else in the list
}

// ============================================================
//  DAMAGE CALCULATOR PANEL — per-Nikke gear impact display
// ============================================================

function renderDamageCalcPanel(nikke, totals) {
    const db = NIKKE_DB_MAP.get(nikke.name) || {};
    const weapon = nikke.weapon || db.weapon || "AR";
    const isChargeWeapon = weapon === "SR" || weapon === "RL";
    const hasElement = state.elementalBoss;

    // Gather all gear lines across all 4 slots
    const allGearLines = [];
    SLOTS.forEach((slot) => {
        nikke.gear[slot].lines.forEach((l) => {
            if (l.stat && l.val) {
                allGearLines.push({ stat: l.stat, val: parseFloat(l.val) || 0, slot });
            }
        });
    });

    // If no gear lines at all, show minimal placeholder
    if (allGearLines.length === 0) {
        return `
        <div class="dmg-calc-panel" style="margin-top:16px;background:#0f1320;border:1px solid #1e2535;border-radius:8px;padding:14px 16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:14px;font-weight:600;color:#bb86fc">⚡ Damage Impact</span>
            <span style="font-size:11px;color:#475569;background:#1a2235;padding:2px 6px;border-radius:4px">Phase 1 — Gear Multipliers</span>
          </div>
          <div style="font-size:13px;color:#475569">Add gear lines to see their damage impact.</div>
        </div>`;
    }

    // Build context for this Nikke
    const context = {
        weapon,
        elementAdvantage: hasElement,
        baseChargeDmg: isChargeWeapon ? 1.5 : 0,
        // Use defaults for base stats (Phase 1 — we don't have per-Nikke ATK yet)
        baseATK: 25000,
        enemyDEF: 5000,
        baseCritRate: 0.15,
        baseCritDmg: 0.5,
        coreHit: true,
        fullBurst: true,
    };

    const result = DamageCalc.analyzeGearImpact(allGearLines, context);

    // Build per-line rows sorted by contribution (highest first)
    const sorted = [...result.perLine]
        .filter((p) => p.contribution > 0)
        .sort((a, b) => b.contribution - a.contribution);

    const lineRows = sorted
        .map((p) => {
            const pct = p.contribution.toFixed(2);
            const barWidth = Math.min(100, (p.contribution / (result.totalBoostPercent || 1)) * 100);
            const statColor = getStatColor(p.line.stat);
            return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px">
            <span style="width:120px;color:${statColor};font-weight:500;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.line.stat}</span>
            <span style="width:50px;color:#94a3b8;flex-shrink:0;text-align:right">${p.line.val}%</span>
            <div style="flex:1;height:6px;background:#1a2235;border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${barWidth}%;background:${statColor};border-radius:3px;transition:width 0.2s"></div>
            </div>
            <span style="width:60px;text-align:right;color:#64ffda;font-weight:600;flex-shrink:0">+${pct}%</span>
        </div>`;
        })
        .join("");

    // Non-damage lines (Max Ammo, Charge Speed, Hit Rate, DEF)
    const nonDmgLines = allGearLines.filter((l) => {
        const s = l.stat;
        return s === "Max Ammo" || s === "Charge Speed" || s === "Hit Rate" || s === "DEF";
    });
    const nonDmgNote = nonDmgLines.length
        ? `<div style="font-size:11px;color:#475569;margin-top:6px">${nonDmgLines.length} line(s) not shown (${[...new Set(nonDmgLines.map((l) => l.stat))].join(", ")}) — no direct per-hit damage effect.</div>`
        : "";

    return `
    <div class="dmg-calc-panel" style="margin-top:16px;background:#0f1320;border:1px solid #1e2535;border-radius:8px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:#bb86fc">⚡ Damage Impact</span>
        <span style="font-size:11px;color:#475569;background:#1a2235;padding:2px 6px;border-radius:4px">Phase 1 — Gear Multipliers</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">Base Damage</div>
          <div style="font-size:16px;font-weight:600;color:#e2e8f0">${result.nakedDmg.toLocaleString()}</div>
        </div>
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">With Gear</div>
          <div style="font-size:16px;font-weight:600;color:#e2e8f0">${result.fullDmg.toLocaleString()}</div>
        </div>
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">Difference</div>
          <div style="font-size:16px;font-weight:600;color:#64ffda">+${(result.fullDmg - result.nakedDmg).toLocaleString()}</div>
        </div>
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">Boost</div>
          <div style="font-size:16px;font-weight:600;color:#64ffda">+${result.totalBoostPercent.toFixed(2)}%</div>
        </div>
      </div>
      <div style="margin-bottom:4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Per-line marginal contribution</div>
      ${lineRows}
      ${nonDmgNote}
      <div style="margin-top:10px;font-size:11px;color:#334155;border-top:1px solid #1e2535;padding-top:8px">
        Assumes: ${hasElement ? "Element advantage" : "No element"} · Core hit · Full burst · Base ATK 25k · DEF 5k · 15% CR / 50% CD${isChargeWeapon ? " · Charge weapon (1.5× base)" : ""}
      </div>
    </div>`;
}

function getStatColor(stat) {
    switch (stat) {
        case "ATK":
            return "#f87171";
        case "Elemental Dmg":
        case "Elemental Damage":
            return "#60a5fa";
        case "Critical Rate":
            return "#fbbf24";
        case "Critical Dmg":
        case "Critical Damage":
            return "#fb923c";
        case "Charge Dmg":
        case "Charge Damage":
            return "#a78bfa";
        default:
            return "#94a3b8";
    }
}
