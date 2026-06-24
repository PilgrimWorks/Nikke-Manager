// ============================================================
//  RENDER: GEAR TRACKER
// ============================================================

let _gearSidebarCache = "";
let _gearSidebarSearch = "";

function filterGearSidebarList() {
    const input = document.getElementById("nikke-sidebar-search");
    if (!input) return;
    _gearSidebarSearch = input.value.toLowerCase();
    document.querySelectorAll("#gear .nikke-list .nikke-item").forEach((el) => {
        el.style.display = el.dataset.name.includes(_gearSidebarSearch) ? "flex" : "none";
    });
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
                const done = SLOTS.filter((s) => dotStatus(n, s) === "done").length;
                return `<div class="nikke-item ${state.selGear === n.id ? "active" : ""}" data-name="${n.name.toLowerCase()}" onclick="selGearNikke('${n.id}')" style="display:flex;align-items:center;gap:8px">
      ${nikkeIcon(n.name, 34)}<div>${n.name}<div class="nikke-item-sub">${done}/4 slots done</div></div>
    </div>`;
            })
            .join("") || '<div style="font-size:14px;color:#475569;padding:6px">No Nikkes match filter</div>';

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
        <option value="I" ${state.gearBurstFilter === "I" ? "selected" : ""}>B1</option>
        <option value="II" ${state.gearBurstFilter === "II" ? "selected" : ""}>B2</option>
        <option value="III" ${state.gearBurstFilter === "III" ? "selected" : ""}>B3</option>
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

    const sidebarKey = `${state.gearElementFilter}|${state.gearBurstFilter}|${state.gearManufacturerFilter}|${state.gearWeaponFilter}|${sortBy}|${sortDir}|${filtered.map((n) => n.id + dotStatus(n, "Helmet") + dotStatus(n, "Chest") + dotStatus(n, "Gloves") + dotStatus(n, "Boots")).join(",")}|${state.selGear}`;

    if (sidebarKey !== _gearSidebarCache || !el.innerHTML) {
        _gearSidebarCache = sidebarKey;

        // Add Nikke button and form
        const addedNames = new Set(state.nikkes.map((n) => n.name));
        const addOptions = NIKKE_DATABASE.filter((n) => !addedNames.has(n.name))
            .map((n) => `<option value="${n.name}">${n.name} · ${n.element} · ${burstDisplay(n)}</option>`)
            .join("");
        const addHtml = `<button class="add-line-btn" onclick="showGearAddForm()" style="margin-top:6px;width:100%">+ Add Nikke</button>
      <div id="gear-add-form" class="form-panel" style="max-width:100%;margin-top:6px">
        <div class="form-row"><input class="form-input" id="gear-nn-search" placeholder="Type to filter..." oninput="filterGearNikkeList()" style="font-size:13px;padding:4px 6px"/></div>
        <div class="form-row"><select id="gear-nn-select" class="form-input" size="6" style="height:auto;overflow-y:auto;font-size:13px">${addOptions}</select></div>
        <div class="btn-row"><button class="btn" onclick="hideGearAddForm()" style="font-size:13px;padding:3px 8px">Cancel</button><button class="btn btn-primary" onclick="addNikkeFromGear()" style="font-size:13px;padding:3px 8px">Add</button></div>
        <div style="border-top:1px solid #1e2535;margin-top:8px;padding-top:8px">
          <div style="font-size:12px;color:#64748b;margin-bottom:4px">Custom (not in DB)</div>
          <div class="form-row"><input class="form-input" id="gear-custom-name" placeholder="Name" style="font-size:13px;padding:3px 6px"/></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">
<select class="form-input" id="gear-custom-burst" style="font-size:12px;padding:2px 4px"><option value="I">BI</option><option value="II">BII</option><option value="III" selected>BIII</option></select>
<select class="form-input" id="gear-custom-element" style="font-size:12px;padding:2px 4px"><option value="Fire">Fire</option><option value="Water">Water</option><option value="Wind">Wind</option><option value="Electric">Elec</option><option value="Iron">Iron</option></select>
<select class="form-input" id="gear-custom-weapon" style="font-size:12px;padding:2px 4px">${Object.entries(
            NIKKE_WEAPONS,
        )
            .map(([c, n]) => `<option value="${c}">${n}</option>`)
            .join("")}</select>
          </div>
          <div class="btn-row" style="margin-top:4px"><button class="btn btn-primary" onclick="addCustomNikkeFromGear()" style="font-size:13px;padding:3px 8px">Add Custom</button></div>
        </div>
      </div>`;

        const sidebarEl = document.getElementById("gear-sidebar-inner");
        if (!sidebarEl) {
            el.innerHTML = `<div class="two-col">
      <div class="nikke-sidebar" id="gear-sidebar-inner">${filterHtml}${addHtml}<div class="nikke-list">${list}</div></div>
      <div id="gear-main">${state.selGear ? "" : '<div class="empty-state">← Select a Nikke</div>'}</div>
    </div>`;
        } else {
            sidebarEl.innerHTML = filterHtml + addHtml + `<div class="nikke-list">${list}</div>`;
        }
        if (_gearSidebarSearch) filterGearSidebarList();
    }

    if (state.selGear) {
        const n = state.nikkes.find((x) => x.id === state.selGear);
        if (n) renderGearMain(n);
    }
}

function setGearBurstFilter(val) {
    state.gearBurstFilter = val;
    save();
    renderGear();
    renderPriority();
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

function showGearAddForm() {
    document.getElementById("gear-add-form").classList.add("show");
    document.getElementById("gear-nn-search").focus();
}
function hideGearAddForm() {
    document.getElementById("gear-add-form").classList.remove("show");
}

function filterGearNikkeList() {
    const q = document.getElementById("gear-nn-search").value.toLowerCase();
    const sel = document.getElementById("gear-nn-select");
    const addedNames = new Set(state.nikkes.map((n) => n.name));
    const filtered = NIKKE_DATABASE.filter((n) => !addedNames.has(n.name) && n.name.toLowerCase().includes(q));
    sel.innerHTML = filtered
        .map((n) => `<option value="${n.name}">${n.name} · ${n.element} · ${burstDisplay(n)}</option>`)
        .join("");
}

function addNikkeFromGear() {
    const sel = document.getElementById("gear-nn-select");
    const name = sel.value;
    if (!name) return;
    const entry = NIKKE_DATABASE.find((n) => n.name === name);
    if (!entry) return;
    const nikke = mkNikke(entry.name, entry.burst1, entry.burst2, entry.burst3, entry.element);
    state.nikkes.push(nikke);
    state.selGear = nikke.id;
    save();
    render();
}

function addCustomNikkeFromGear() {
    const name = document.getElementById("gear-custom-name").value.trim();
    if (!name) return;
    if (state.nikkes.some((n) => n.name === name)) return;
    const _burst = document.getElementById("gear-custom-burst").value;
    const element = document.getElementById("gear-custom-element").value;
    const weapon = document.getElementById("gear-custom-weapon").value;
    const nikke = mkNikke(name, _burst === "I", _burst === "II", _burst === "III", element, weapon);
    nikke.custom = true;
    state.nikkes.push(nikke);
    state.selGear = nikke.id;
    if (!state.customWeapons) state.customWeapons = {};
    state.customWeapons[name] = weapon;
    save();
    render();
}

function setGearElementFilter(val) {
    state.gearElementFilter = val;
    save();
    renderGear();
    renderPriority();
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
    // Just update active class without re-rendering sidebar
    document.querySelectorAll("#gear .nikke-list .nikke-item").forEach((el) => {
        const isActive = el.getAttribute("onclick")?.includes(id);
        el.classList.toggle("active", isActive);
    });
    // Only re-render the main content area
    const n = state.nikkes.find((x) => x.id === id);
    if (n) renderGearMain(n);
}

function renderGearMain(nikke) {
    const area = document.getElementById("gear-main");
    const totals = attrTotals(nikke);

    // Attribute totals table
    const trackedStats = [
        ...new Set([...Object.keys(totals), ...nikke.priorities.filter((p) => p.line).map((p) => p.line)]),
    ].filter((s) => !ALWAYS_TRASH.has(s));

    const attrRows = trackedStats
        .map((stat) => {
            const tot = totals[stat] || 0;
            const min = minTotalVal(nikke, stat);
            const met = min === null ? null : tot >= min;
            const metTxt =
                min === null
                    ? `<span class="no-min">No minimum</span>`
                    : met
                      ? `<span class="met">✓ Met (min ${min.toFixed(2)}%)</span>`
                      : `<span class="unmet">✗ Need ${(min - tot).toFixed(2)}% more</span>`;
            const prio = nikke.priorities.find((p) => p.line === stat);
            const tgtTier = prio ? parseInt(prio.targetTier) || 11 : 11;
            const tgtVal = TIER_TABLE[stat] ? TIER_TABLE[stat][tgtTier - 1] : null;
            return `<tr>
      <td style="font-weight:600;color:#f1f5f9">${stat}</td>
      <td>${tot > 0 ? tot.toFixed(2) + (IS_PCT.has(stat) ? "%" : "") : "—"}</td>
      <td>T${tgtTier}${tgtVal ? " (≥" + tgtVal + "%)" : ""}</td>
      <td>${metTxt}</td>
    </tr>`;
        })
        .join("");

    const attrTable = trackedStats.length
        ? `
    <div class="attr-summary">
      <div class="attr-summary-title">Attribute totals</div>
      <table class="attr-table">
        <thead><tr><th>Stat</th><th>Total</th><th>Target Tier</th><th>Minimum</th></tr></thead>
        <tbody>${attrRows}</tbody>
      </table>
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
                const opts = ALL_LINES.map(
                    (l) => `<option value="${l}" ${line.stat === l ? "selected" : ""}>${l}</option>`,
                ).join("");
                const unit = line.stat && IS_PCT.has(line.stat) ? "%" : "";
                const tierOpts =
                    line.stat && TIER_TABLE[line.stat]
                        ? TIER_TABLE[line.stat]
                              .map((v, ti) => {
                                  const vStr = v.toFixed(2);
                                  return `<option value="${vStr}"${String(line.val ?? "").trim() === vStr ? " selected" : ""}>${vStr}</option>`;
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
            if (v.options) {
                const rec = v.options.find((o) => o.recommended) || v.options[0];
                const recName = rec.title.includes("Reset") ? "Reset" : "Change Effects";
                const summary = `${v.label} — ${recName} ~${rec.rocks} rocks · ${rec.gain}`;
                verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          ${v.options
              .map(
                  (opt) => `
<div class="verdict-option" style="${opt.recommended ? "border-left:3px solid currentColor" : ""}">
  <div class="verdict-option-title">${opt.title}${opt.recommended ? '<span class="recommended-badge">Recommended</span>' : ""}</div>
  <div class="verdict-steps">${opt.steps.map((s, si) => `<div class="verdict-step"><span class="step-num">${si + 1}.</span><span>${s}</span></div>`).join("")}</div>
  <span class="rock-est">~${opt.rocks} rocks · ${opt.gain}</span>
</div>`,
              )
              .join("")}
        </details>`;
            } else {
                const gainText = v.gain ? ` · ${v.gain}` : "";
                const summary =
                    v.rocks > 0 ? `${v.label} — ~${v.rocks} rocks${gainText}` : `${v.label}`;
                verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          <div class="verdict-steps">${(v.steps || []).map((s, i) => `<div class="verdict-step"><span class="step-num">${i + 1}.</span><span>${s}</span></div>`).join("")}</div>
          ${v.rocks > 0 ? `<span class="rock-est">~${v.rocks} rocks${gainText}</span>` : ""}
        </details>`;
            }
        }

        const tierLvLabel =
            gear.tier || gear.lv
                ? `<span style="font-size:13px;color:#94a3b8;font-weight:400">T${gear.tier} Lv${gear.lv}</span>`
                : "";
        return `<div class="slot-card">
      <div class="slot-header"><div style="display:flex;align-items:center;gap:6px"><span class="slot-tag">${slot}</span>${tierLvLabel}</div><div style="display:flex;align-items:center;gap:6px">${badge}</div></div>
      <div class="lines-grid">${lineBoxes}</div>
      ${verdictHtml}
    </div>`;
    }).join("");

    // Editable Nikke stats: Power / Bond / Limit Break / Cores / Cube / Doll
    const db = NIKKE_DB_MAP.get(nikke.name) || {};
    const bondMax = bondMaxFor(nikke) ?? 0;
    const skillRec = db.build && db.build.skill && db.build.skill.pve ? db.build.skill.pve.rec : null;
    const lbMax = db.rarity === "SSR" ? 3 : db.rarity === "SR" ? 2 : 0;
    const coresMax = db.rarity === "SSR" ? 7 : 0;
    const fieldLabelCss = "font-size:12px;color:#64748b;letter-spacing:.04em";
    const fieldInputCss =
        "font-size:14px;padding:4px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%";
    const trackedTids = new Set(
        Object.keys(state.cubeLevels ?? {}).filter((tid) => (state.cubeLevels ?? {})[tid] != null),
    );
    const hasUntracked = Object.keys(HARMONY_CUBES).some((tid) => !trackedTids.has(tid));
    const cubeOpts = Object.entries(HARMONY_CUBES)
        .filter(([tid]) => trackedTids.has(tid))
        .map(([tid, name]) => {
            const lv = (state.cubeLevels ?? {})[tid];
            const label = `${name} - Lv.${lv}`;
            return `<option value="${tid}" ${nikke.cube && String(nikke.cube.tid) === tid ? "selected" : ""}>${label}</option>`;
        })
        .concat(hasUntracked ? [`<option value="__add_cube__" style="color:#60a5fa">+ Add another cube</option>`] : [])
        .join("");
    const equippedDollDb = nikke.doll ? COLLECTION_DOLLS.find((d) => d.id === nikke.doll.tid) : null;
    const isTreasureDoll = equippedDollDb != null && equippedDollDb.treasure != null;
    const dollOpts = COLLECTION_DOLLS.filter((d) => {
        if (nikke.doll && nikke.doll.tid === d.id) return true;
        if (d.treasure != null) return d.treasure === nikke.name;
        return d.weapon === db.weapon;
    })
        .map(
            (d) =>
                `<option value="${d.id}" ${nikke.doll && nikke.doll.tid === d.id ? "selected" : ""}>[${d.rarity}] ${d.name}</option>`,
        )
        .join("");
    const statsPanel = `
    <div class="nikke-stats-edit" style="background:#0f1320;border:1px solid #1e2535;border-radius:8px;padding:10px 12px;margin-bottom:10px">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 10px">
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Power</span>
          <input type="text" inputmode="numeric" style="${fieldInputCss}" placeholder="—" value="${nikke.power != null ? nikke.power : ""}" onchange="updateNikkeStat('${nikke.id}','power',this.value)"/></label>
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Limit Break</span>
          ${statStepperHtml(nikke.id, "limitBreak", nikke.limitBreak, 0, lbMax, false, undefined, lbMax === 0)}</label>
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Cores</span>
          ${statStepperHtml(nikke.id, "cores", nikke.cores, 0, coresMax, false, undefined, coresMax === 0)}</label>
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Bond</span>
          ${statStepperHtml(nikke.id, "bond", nikke.bond, 0, bondMax, false, undefined, bondMax === 0)}</label>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 10px;margin-top:8px">
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Skill 1${skillRec ? ` <span style="color:#475569">· rec ${skillRec.s1}</span>` : ""}</span>
          ${statStepperHtml(nikke.id, "skill1", nikke.skill1, 1, 10, false)}</label>
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Skill 2${skillRec ? ` <span style="color:#475569">· rec ${skillRec.s2}</span>` : ""}</span>
          ${statStepperHtml(nikke.id, "skill2", nikke.skill2, 1, 10, false)}</label>
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Skill 3${skillRec ? ` <span style="color:#475569">· rec ${skillRec.s3}</span>` : ""}</span>
          ${statStepperHtml(nikke.id, "skill3", nikke.skill3, 1, 10, false)}</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;margin-top:8px">
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Cube</span>
          <div style="display:flex;gap:4px">
<select style="${fieldInputCss};flex:1" onchange="updateNikkeCube('${nikke.id}',this.value)"><option value="">None</option>${cubeOpts}</select>
          </div></label>
        <label style="display:flex;flex-direction:column;gap:3px"><span style="${fieldLabelCss}">Doll</span>
          <div style="display:flex;gap:4px">
<select style="${fieldInputCss};flex:1" onchange="updateNikkeDoll('${nikke.id}',this.value)"><option value="">None</option>${dollOpts}</select>
${nikke.doll && !isTreasureDoll ? statStepperHtml(nikke.id, "doll", nikke.doll.lv, 0, 15, true, "flex:none;width:96px") : ""}
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
      <label class="elemental-toggle" title="Include Elemental Dmg in gain calculations">
        <input type="checkbox" onchange="toggleElementalBoss(this.checked)" ${state.elementalBoss ? "checked" : ""} style="accent-color:#3b82f6"/>
        <span>Elemental boss</span>
      </label>
    </div>`;
    const bodyHtml = statsPanel + attrTable + slots;
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
function statStepperHtml(nid, field, value, min, max, accessory, extraStyle, disabled) {
    const stepFn = accessory ? "stepNikkeAccessoryLv" : "stepNikkeStat";
    const changeFn = accessory ? "updateNikkeAccessoryLv" : "updateNikkeStat";
    const v = value != null ? value : "";
    const maxAttr = max != null ? `max="${max}" ` : "";
    const numVal = value != null ? Number(value) : null;
    const minDis = disabled || (numVal != null && numVal <= min) ? " disabled" : "";
    const maxDis = disabled || (max != null && numVal != null && numVal >= max) ? " disabled" : "";
    const inputDis = disabled ? " disabled" : "";
    return `<div class="stepper"${extraStyle ? ` style="${extraStyle}"` : ""}>
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="${stepFn}('${nid}','${field}',-1)"${minDis}>−</button>
<input class="stepper-input" type="number" inputmode="numeric" min="${min}" ${maxAttr}step="1" placeholder="—" value="${v}" onchange="${changeFn}('${nid}','${field}',this.value)"${inputDis}/>
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="${stepFn}('${nid}','${field}',1)"${maxDis}>+</button>
          </div>`;
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
    n.gear[slot].lines[i].stat = val;
    if (!val) {
        n.gear[slot].lines[i].val = "";
        n.gear[slot].lines[i].locked = false;
    }
    save();
    renderGearMain(n);
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
}
