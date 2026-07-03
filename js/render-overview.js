// ============================================================
//  RENDER: OVERVIEW
// ============================================================

// Which overview recommendation view is active: equipment | skills | dolls | bond
let _overviewView = "equipment";

// Element filter for Equipment/Skills/Dolls/Bond views
let _overviewElement = "";

// Solo Raid team filter for Equipment/Skills/Dolls/Bond views
let _overviewRaid = "";

// Bossing tier ordering (best first) + the set of Nikke names that have a treasure doll.
const BOSSING_ORDER = ["SSS", "SS", "S", "A", "B", "C", "D", "E", "F"];
const TREASURE_NAMES = new Set(COLLECTION_DOLLS.filter((d) => d.treasure).map((d) => d.treasure));

// Index of a Nikke's bossing tier within BOSSING_ORDER (lower = stronger); 999 if unknown.
function bossingIdxOf(name) {
    const db = NIKKE_DB_MAP.get(name);
    const b = db && db.build ? db.build.bossing : null;
    const i = b ? BOSSING_ORDER.indexOf(b) : -1;
    return i === -1 ? 999 : i;
}

// Comparator: bossing tier ascending (stronger first), then power descending.
function bossingPowerCmp(a, b) {
    const d = bossingIdxOf(a.n.name) - bossingIdxOf(b.n.name);
    if (d) return d;
    return (b.n.power ?? 0) - (a.n.power ?? 0);
}

function setOverviewView(v) {
    _overviewView = v;
    renderOverview();
}

function setOverviewElement(el) {
    _overviewElement = el;
    renderOverview();
}

function setOverviewRaid(raidId) {
    _overviewRaid = raidId;
    renderOverview();
}

// Returns a Set of nikke IDs in the selected overview raid, or null if no raid filter active
function getOverviewRaidIds() {
    if (!_overviewRaid) return null;
    const raid = state.raids.find((r) => r.id === _overviewRaid);
    if (!raid) return null;
    return new Set(raid.entries.filter((e) => (e.team || 0) !== 0).map((e) => e.nikkeId));
}

// ── Overview view: Equipment (Prydwen overload gear recommendations) ──
function buildEquipmentView() {
    const rows = [];
    const raidIds = getOverviewRaidIds();
    for (const n of state.nikkes) {
        if (_overviewElement && n.element !== _overviewElement) continue;
        if (raidIds && !raidIds.has(n.id)) continue;
        const db = NIKKE_DB_MAP.get(n.name);
        const overload = db && db.build && db.build.overload;
        if (!overload || !overload.priority) continue;
        const { ideal = [], passable = [] } = overload;
        if (!ideal.length && !passable.length) continue;

        // Count how many of the recommended lines the user currently has across all gear
        const currentStats = {};
        SLOTS.forEach((slot) => {
            if (!n.gear[slot]) return;
            n.gear[slot].lines.forEach((l) => {
                if (l.stat) {
                    currentStats[l.stat] = (currentStats[l.stat] || 0) + 1;
                }
            });
        });

        const defs = [];
        ideal.forEach((rec) => {
            const cur = currentStats[rec.name] || 0;
            if (cur < rec.amount) defs.push({ name: rec.name, cur, rec: rec.amount, tier: "Ideal" });
        });
        passable.forEach((rec) => {
            const cur = currentStats[rec.name] || 0;
            if (cur < rec.amount) defs.push({ name: rec.name, cur, rec: rec.amount, tier: "Passable" });
        });
        if (!defs.length) continue;
        rows.push({ n, defs, priority: overload.priority });
    }
    // Sort by:
    //   1. Overload priority (Meta → Very High → High → Medium → Low → Very Low)
    //   2. Bossing tier (stronger first)
    //   3. Burst level (3 and All tied at 0; 2 and 1 tied at 1)
    //   4. Class (Attacker first, then Supporter, then Defender)
    //   5. Power (higher first)
    const prioOrder = { Meta: 0, "Very High": 1, High: 2, Medium: 3, Low: 4, "Very Low": 5 };
    const classOrder = { Attacker: 0, Supporter: 1, Defender: 2 };
    const burstRank = (name) => {
        const db = NIKKE_DB_MAP.get(name);
        if (!db) return 1;
        // Burst 3 and All (burst3 true) rank equal to each other; burst 1 and 2 rank lower
        return db.burst3 ? 0 : 1;
    };
    rows.sort((a, b) => {
        // 1. Overload priority
        const pa = prioOrder[a.priority] ?? 6;
        const pb = prioOrder[b.priority] ?? 6;
        if (pa !== pb) return pa - pb;
        // 2. Bossing tier
        const bd = bossingIdxOf(a.n.name) - bossingIdxOf(b.n.name);
        if (bd) return bd;
        // 3. Burst level (3/All first, then 2/1)
        const burstD = burstRank(a.n.name) - burstRank(b.n.name);
        if (burstD) return burstD;
        // 4. Class (Attacker, Supporter, Defender)
        const dba = NIKKE_DB_MAP.get(a.n.name);
        const dbb = NIKKE_DB_MAP.get(b.n.name);
        const ca = classOrder[dba && dba.class] ?? 3;
        const cb = classOrder[dbb && dbb.class] ?? 3;
        if (ca !== cb) return ca - cb;
        // 5. Power
        return (b.n.power ?? 0) - (a.n.power ?? 0);
    });
    const prioColor = (p) => {
        if (p === "Meta" || p === "Very High") return "#4ade80";
        if (p === "High") return "#86efac";
        if (p === "Medium") return "#fbbf24";
        return "#94a3b8";
    };
    const body = rows
        .map(
            (r, i) => `${ovRowOpen(r.n.id, r.n.name)}
        <td style="color:#475569">${i + 1}</td>
        ${ovNameCell(r.n.name)}
        <td style="color:${prioColor(r.priority)};font-weight:500">${r.priority}</td>
        <td style="color:#f59e0b;font-weight:500">${r.defs.map((d) => `<span class="${d.tier === "Ideal" ? "prio-ideal" : "prio-passable"}" style="font-size:12px;padding:1px 5px;border-radius:3px;margin-right:4px">${d.name} ${d.cur}/${d.rec}</span>`).join("")}</td>
      </tr>`,
        )
        .join("");
    const html = rows.length
        ? `<div class="section-label" style="margin-top:1rem">Overload gear recommendations<span style="font-size:12px;color:#475569;font-weight:400"> (current / recommended lines)</span></div>
    <table class="attr-table" style="width:100%;table-layout:fixed">
      <colgroup><col style="width:5%"><col style="width:30%"><col style="width:15%"><col style="width:50%"></colgroup>
      <tr><th>Prio.</th><th>Nikke</th><th>OL Priority</th><th>Lines below rec</th></tr>
      ${body}
    </table>`
        : `<div class="section-label" style="margin-top:1rem">Overload gear recommendations</div>${ovEmpty("All Nikke overload gear lines meet recommendations.")}`;
    return { count: rows.length, html };
}

// ── Shared row/cell helpers for the Skills / Dolls / Bond overview views ──
function bossingTierOf(name) {
    const db = NIKKE_DB_MAP.get(name);
    return (db && db.build && db.build.bossing) || null;
}
function ovRowOpen(nikkeId, name) {
    return `<tr class="rank-row" data-name="${String(name).toLowerCase()}" onclick="goToGearNikke('${nikkeId}')">`;
}
function ovNameCell(name) {
    return `<td style="font-weight:500"><div style="display:flex;align-items:center;gap:6px">${nikkeIcon(name, 22)}<span>${name}</span></div></td>`;
}
function ovTierCell(tierLabel) {
    return `<td style="color:#94a3b8">${tierLabel || "—"}</td>`;
}
function ovPowerCell(power) {
    return `<td style="color:#94a3b8">${power != null ? Number(power).toLocaleString() : "—"}</td>`;
}
function ovEmpty(msg) {
    return `<div style="font-size:14px;color:#475569;padding:6px 0">${msg}</div>`;
}

// ── Overview view: Skills below the recommended levels ──
function buildSkillsView() {
    const rows = [];
    const raidIds = getOverviewRaidIds();
    for (const n of state.nikkes) {
        if (_overviewElement && n.element !== _overviewElement) continue;
        if (raidIds && !raidIds.has(n.id)) continue;
        const db = NIKKE_DB_MAP.get(n.name);
        const pve = db && db.build && db.build.skill && db.build.skill.pve;
        if (!pve) continue;
        const rec = skillTargetVals(pve);
        if (!rec) continue;
        const cur = { s1: n.skill1 ?? 0, s2: n.skill2 ?? 0, s3: n.skill3 ?? 0 };
        const defs = [];
        [
            ["s1", "S1"],
            ["s2", "S2"],
            ["s3", "S3"],
        ].forEach(([k, lbl]) => {
            if (rec[k] != null && cur[k] < rec[k]) defs.push(`${lbl} ${cur[k]}→${rec[k]}`);
        });
        if (!defs.length) continue;
        const skillPriority = (db.build.skill && db.build.skill.priority) || null;
        rows.push({ n, defs, priority: skillPriority });
    }
    // Sort by:
    //   1. Skill priority (Meta → High → Medium → Low → Very Low → unset)
    //   2. Bossing tier (stronger first)
    //   3. Power (higher first)
    const skillPrioOrder = { Meta: 0, High: 1, Medium: 2, Low: 3, "Very Low": 4 };
    rows.sort((a, b) => {
        const pa = skillPrioOrder[a.priority] ?? 5;
        const pb = skillPrioOrder[b.priority] ?? 5;
        if (pa !== pb) return pa - pb;
        const bd = bossingIdxOf(a.n.name) - bossingIdxOf(b.n.name);
        if (bd) return bd;
        return (b.n.power ?? 0) - (a.n.power ?? 0);
    });
    const body = rows
        .map(
            (r, i) => `${ovRowOpen(r.n.id, r.n.name)}
        <td style="color:#475569">${i + 1}</td>
        ${ovNameCell(r.n.name)}
        ${ovPowerCell(r.n.power)}
        <td style="color:#f59e0b;font-weight:500">${r.defs.join("&nbsp;&nbsp;&nbsp;")}</td>
      </tr>`,
        )
        .join("");
    const html = rows.length
        ? `<div class="section-label" style="margin-top:1rem;display:flex;align-items:center;gap:8px">Skill recommendations<span style="font-size:12px;color:#475569;font-weight:400"> (current → ${state.skillTarget === "rec" ? "recommended" : "max"})</span><span class="seg-toggle" style="margin-left:auto"><button class="${state.skillTarget === "rec" ? "seg-active" : ""}" onclick="setSkillTarget('rec')">Rec</button><button class="${state.skillTarget === "max" ? "seg-active" : ""}" onclick="setSkillTarget('max')">Max</button></span></div>
    <table class="attr-table" style="width:100%;table-layout:fixed">
      <colgroup><col style="width:5%"><col style="width:30%"><col style="width:12%"><col style="width:53%"></colgroup>
      <tr><th>Prio.</th><th>Nikke</th><th>Power</th><th>Skills below rec</th></tr>
      ${body}
    </table>`
        : `<div class="section-label" style="margin-top:1rem">Skills below recommended</div>${ovEmpty("All Nikke skills meet the recommended levels.")}`;
    return { count: rows.length, html };
}

// ── Overview view: Dolls for high-bossing Nikkes ──
// Bossing ≥ S need an SR doll at Lv15. Treasure Nikkes count one tier higher
// and should run their treasure doll instead of the standard SR doll.
function buildDollsView() {
    const S_IDX = BOSSING_ORDER.indexOf("S");
    const rows = [];
    const raidIds = getOverviewRaidIds();
    for (const n of state.nikkes) {
        if (_overviewElement && n.element !== _overviewElement) continue;
        if (raidIds && !raidIds.has(n.id)) continue;
        const db = NIKKE_DB_MAP.get(n.name);
        if (!db) continue;
        const rawIdx = bossingIdxOf(n.name);
        const isTreasure = TREASURE_NAMES.has(n.name);
        const effIdx = isTreasure && rawIdx < 999 ? Math.max(0, rawIdx - 1) : rawIdx;
        if (effIdx > S_IDX) continue;
        let recDoll, done;
        if (isTreasure) {
            recDoll = COLLECTION_DOLLS.find((d) => d.treasure === n.name);
            done = !!(n.doll && recDoll && n.doll.tid === recDoll.id);
        } else {
            recDoll = COLLECTION_DOLLS.find((d) => d.rarity === "SR" && d.weapon === db.weapon);
            const eq = n.doll ? COLLECTION_DOLLS.find((d) => d.id === n.doll.tid) : null;
            done = !!(eq && eq.rarity === "SR" && n.doll.lv === 15);
        }
        if (done) continue;
        const boosted = isTreasure && rawIdx < 999 && effIdx < rawIdx;
        const pvePriority = db.collection?.pvePriority ?? Infinity;
        rows.push({ n, recDoll, isTreasure, effIdx, boosted, pvePriority });
    }
    rows.sort((a, b) => {
        if (a.pvePriority !== b.pvePriority) return a.pvePriority - b.pvePriority;
        if (a.effIdx !== b.effIdx) return a.effIdx - b.effIdx;
        return (b.n.power ?? 0) - (a.n.power ?? 0);
    });
    const curDollLabel = (n) => {
        if (!n.doll) return `<span style="color:#64748b">None</span>`;
        const d = COLLECTION_DOLLS.find((x) => x.id === n.doll.tid);
        if (!d) return `<span style="color:#64748b">None</span>`;
        const lv = d.treasure ? "" : ` Lv${n.doll.lv ?? 0}`;
        return `[${d.rarity}] ${d.name}${lv}`;
    };
    const recDollLabel = (r) => {
        if (!r.recDoll) return `<span style="color:#64748b">—</span>`;
        const lv = r.isTreasure ? "" : " Lv15";
        return `[${r.recDoll.rarity}] ${r.recDoll.name}${lv}`;
    };
    const tierCell = (r) =>
        `<td style="color:#94a3b8">${BOSSING_ORDER[r.effIdx] ?? "—"}${r.boosted ? ` <span style="color:#60a5fa;font-size:11px">★</span>` : ""}</td>`;
    const body = rows
        .map(
            (r, i) => `${ovRowOpen(r.n.id, r.n.name)}
        <td style="color:#475569">${i + 1}</td>
        <td style="font-weight:500"><div style="display:flex;align-items:center;gap:6px">${nikkeIcon(r.n.name, 22)}<span>${r.n.name}</span>${r.isTreasure ? `<span style="color:#60a5fa;font-size:11px" title="Has treasure doll">★</span>` : ""}</div></td>
        ${ovPowerCell(r.n.power)}
        <td style="color:#94a3b8">${curDollLabel(r.n)}</td>
        <td style="color:#4ade80">${recDollLabel(r)}</td>
      </tr>`,
        )
        .join("");
    const html = rows.length
        ? `<div class="section-label" style="margin-top:1rem">Doll recommendations<span style="font-size:12px;color:#475569;font-weight:400"> (★ = treasure boost)</span></div>
    <table class="attr-table" style="width:100%;table-layout:fixed">
      <colgroup><col style="width:5%"><col style="width:30%"><col style="width:12%"><col style="width:27%"><col style="width:26%"></colgroup>
      <tr><th>Prio.</th><th>Nikke</th><th>Power</th><th>Current doll</th><th>Recommended</th></tr>
      ${body}
    </table>`
        : `<div class="section-label" style="margin-top:1rem">Doll recommendations</div>${ovEmpty("Every bossing ≥ S Nikke has its recommended doll.")}`;
    return { count: rows.length, html };
}

// ── Overview view: Bond below its LB-based max ──
function buildBondView() {
    const rows = [];
    const raidIds = getOverviewRaidIds();
    for (const n of state.nikkes) {
        if (_overviewElement && n.element !== _overviewElement) continue;
        if (raidIds && !raidIds.has(n.id)) continue;
        const max = bondMaxFor(n);
        if (max == null) continue; // R rarity → no bond
        const cur = n.bond ?? 0;
        if (cur >= max) continue;
        rows.push({ n, cur, max });
    }
    rows.sort(bossingPowerCmp);
    const body = rows
        .map(
            (r, i) => `${ovRowOpen(r.n.id, r.n.name)}
        <td style="color:#475569">${i + 1}</td>
        ${ovNameCell(r.n.name)}
        ${ovPowerCell(r.n.power)}
        <td><span style="color:#f59e0b;font-weight:600">${r.cur}</span><span style="color:#475569"> / ${r.max}</span></td>
      </tr>`,
        )
        .join("");
    const html = rows.length
        ? `<div class="section-label" style="margin-top:1rem">Bond recommendations<span style="font-size:12px;color:#475569;font-weight:400"> (current / max for limit break)</span></div>
    <table class="attr-table" style="width:100%;table-layout:fixed">
      <colgroup><col style="width:5%"><col style="width:30%"><col style="width:12%"><col style="width:53%"></colgroup>
      <tr><th>Prio.</th><th>Nikke</th><th>Power</th><th>Bond</th></tr>
      ${body}
    </table>`
        : `<div class="section-label" style="margin-top:1rem">Bond recommendations</div>${ovEmpty("Every Nikke's bond is at max for its limit break.")}`;
    return { count: rows.length, html };
}

function renderOverview() {
    const el = document.getElementById("overview");
    const view = _overviewView || "equipment";
    const views = {
        equipment: { label: "Equipment", data: buildEquipmentView() },
        skills: { label: "Skills", data: buildSkillsView() },
        dolls: { label: "Dolls", data: buildDollsView() },
        bond: { label: "Bond", data: buildBondView() },
    };
    const active = views[view] || views.equipment;
    const btn = (key) =>
        `<button type="button" class="metric-card ov-btn${view === key ? " active" : ""}" onclick="setOverviewView('${key}')">
        <div class="metric-val">${views[key].data.count}</div><div class="metric-label">${views[key].label}</div></button>`;
    const showElementFilter = true;
    const raidOpts = [...state.raids]
        .reverse()
        .map((r) => {
            const dn = `${r.season ? "S" + r.season + " · " : ""}${r.name}${r.element ? " — " + r.element : ""}`;
            return `<option value="${r.id}" ${_overviewRaid === r.id ? "selected" : ""}>${dn}</option>`;
        })
        .join("");
    const elementFilter = showElementFilter
        ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <select class="form-input" style="font-size:13px;padding:4px 8px;width:auto" onchange="setOverviewElement(this.value)">
        <option value="">All Elements</option>
        ${NIKKE_ELEMENTS.map((e) => `<option value="${e}" ${_overviewElement === e ? "selected" : ""}>${e}</option>`).join("")}
      </select>
      ${
          state.raids.length
              ? `<select class="form-input" style="font-size:13px;padding:4px 8px;width:auto" onchange="setOverviewRaid(this.value)">
        <option value="">All Solo Raid Teams</option>${raidOpts}
      </select>`
              : ""
      }
    </div>`
        : "";
    el.innerHTML = `
    <div style="display:flex;align-items:center;margin-bottom:10px">
      <label class="elemental-toggle" title="Include Elemental Dmg in gain and verdict calculations" style="margin-left:auto">
        <input type="checkbox" id="elemental-chk" onchange="toggleElementalBoss(this.checked)" ${state.elementalBoss ? "checked" : ""} style="accent-color:#3b82f6"/>
        <span>Include Elemental Dmg</span>
      </label>
    </div>
    <div class="ov-grid">
      ${btn("equipment")}
      ${btn("skills")}
      ${btn("dolls")}
      ${btn("bond")}
    </div>
    ${elementFilter}
    ${active.data.html}`;
}

function toggleElementalBoss(checked) {
    state.elementalBoss = checked;
    save();
    // Sync both checkboxes if they exist
    const chkOverview = document.getElementById("elemental-chk");
    const chkGear = document.getElementById("elemental-chk-gear");
    if (chkOverview) chkOverview.checked = checked;
    if (chkGear) chkGear.checked = checked;
    renderOverview();
    // Only re-render gear main content if a nikke is selected, don't touch sidebar
    if (state.selGear) {
        const n = state.nikkes.find((x) => x.id === state.selGear);
        if (n) renderGearMain(n);
    }
}

