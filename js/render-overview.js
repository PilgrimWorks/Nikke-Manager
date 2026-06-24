// ============================================================
//  RENDER: OVERVIEW
// ============================================================

let _overviewSearch = "";

// Which overview recommendation view is active: rockeff | equipment | skills | dolls | bond
let _overviewView = "rockeff";

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

function filterOverviewList() {
    const input = document.getElementById("overview-search");
    if (!input) return;
    _overviewSearch = input.value.toLowerCase();
    document.querySelectorAll("#overview .rank-row").forEach((el) => {
        el.style.display = el.dataset.name.includes(_overviewSearch) ? "" : "none";
    });
}

// ── Overview view: Rock Efficiency (rock efficiency ranking) ──
function buildRockEffView() {
    const nk = state.nikkes;

    // Build efficiency ranking: gain% per rock for each incomplete slot
    // If a raid is selected, filter to only those nikkes and weight by damage
    const selRaid = state.selRaid ? state.raids.find((r) => r.id === state.selRaid) : null;
    const raidNikkeIds = selRaid ? new Set(selRaid.entries.map((e) => e.nikkeId)) : null;
    const raidDmgMap = {};
    if (selRaid)
        selRaid.entries.forEach((e) => {
            raidDmgMap[e.nikkeId] = e.damage || 0;
        });

    const rankings = [];
    const savedElementalBoss = state.elementalBoss;
    nk.forEach((n) => {
        if (!n.priorities.length) return;
        if (raidNikkeIds && !raidNikkeIds.has(n.id)) return; // filter by raid
        // If raid has an element weakness, only count Elemental Dmg for matching Nikkes
        if (selRaid && selRaid.element && n.element !== selRaid.element) {
            state.elementalBoss = false;
        } else {
            state.elementalBoss = savedElementalBoss;
        }
        SLOTS.forEach((slot) => {
            const v = getVerdict(n, slot);
            if (!v || v.cls === "v-keep") return; // skip done slots
            let rocks = 0,
                gainLabel = "",
                weightedGainRaw = 0;
            if (v.options) {
                const rec = v.options.find((o) => o.recommended) || v.options[0];
                rocks = rec.rocks;
                gainLabel = rec.gain;
                weightedGainRaw = rec.dpsGain || 0;
            } else {
                rocks = v.rocks;
                gainLabel = v.gain || "";
                weightedGainRaw = v.dpsGain || 0;
            }
            if (rocks <= 0 || weightedGainRaw <= 0) return;
            // Weight by damage if raid selected
            const dmg = raidDmgMap[n.id] || 0;
            const weightedGain = dmg > 0 ? (weightedGainRaw / 100) * dmg : weightedGainRaw;
            const efficiency = weightedGain / rocks;
            rankings.push({
                nikkeId: n.id,
                nikke: n.name,
                slot,
                rocks,
                gain: weightedGainRaw,
                gainLabel,
                efficiency,
                dmg,
                weightedGain,
            });
        });
    });
    state.elementalBoss = savedElementalBoss;
    rankings.sort((a, b) => b.efficiency - a.efficiency);

    // Raid selector dropdown
    const raidOpts = [...state.raids]
        .reverse()
        .map((r) => {
            const dn = `${r.season ? "Season " + r.season + " · " : ""}${r.name}${r.element ? " — " + r.element : ""}`;
            return `<option value="${r.id}" ${state.selRaid === r.id ? "selected" : ""}>${dn}</option>`;
        })
        .join("");
    const raidSelector = state.raids.length
        ? `
    <select class="form-input" style="font-size:14px;padding:3px 8px;width:auto;display:inline-block;margin-left:8px" onchange="selectRaidFilter(this.value)">
      <option value="">All Nikkes</option>${raidOpts}
    </select>`
        : "";

    const effLabel = selRaid ? "dmg/rock" : "%/rock";

    // Sort rankings by selected column
    const sortBy = state.rankSort || "efficiency";
    const asc = state.rankSortAsc ? 1 : -1;
    if (sortBy === "dmgGain") {
        rankings.sort((a, b) => asc * ((a.gain / 100) * (a.dmg || 0) - (b.gain / 100) * (b.dmg || 0)));
    } else if (sortBy === "dmg") {
        rankings.sort((a, b) => asc * ((a.dmg || 0) - (b.dmg || 0)));
    } else {
        rankings.sort((a, b) => asc * (a.efficiency - b.efficiency));
    }

    const sortArrow = (col) => (sortBy === col ? (state.rankSortAsc ? " ▲" : " ▼") : "");
    const rankingHtml = rankings.length
        ? (() => {
              const top10 = rankings.slice(0, 10);
              const next10 = rankings.slice(10, 20);
              const renderRow = (
                  r,
                  i,
              ) => `<tr class="rank-row" data-name="${r.nikke.toLowerCase()}" onclick="goToGearSlot('${r.nikkeId}','${r.slot}')">
        <td style="color:#475569">${i + 1}</td>
        <td style="font-weight:500"><div style="display:flex;align-items:center;gap:6px">${nikkeIcon(r.nikke, 22)}<span>${r.nikke}</span></div></td>
        <td>${r.slot}</td>
        <td>~${r.rocks}</td>
        <td style="color:#4ade80">${r.gainLabel}</td>
        ${selRaid ? `<td style="color:#94a3b8">${r.dmg ? r.dmg + "M" : "—"}</td><td style="color:#60a5fa;font-weight:600">${r.dmg ? "+" + ((r.gain / 100) * r.dmg).toFixed(2) + "M" : "—"}</td>` : ""}
        <td style="font-weight:700;color:${selRaid ? (r.efficiency >= 0.5 ? "#4ade80" : r.efficiency >= 0.1 ? "#fbbf24" : "#f87171") : r.efficiency >= 1 ? "#4ade80" : r.efficiency >= 0.3 ? "#fbbf24" : "#f87171"}">${selRaid ? r.efficiency.toFixed(2) + "M/rock" : r.efficiency.toFixed(3) + "%/rock"}</td>
      </tr>`;
              const toggleBtn = next10.length
                  ? `<tr id="rank-toggle-row"><td colspan="99" style="text-align:center;padding:8px">
      <button class="btn-sm" onclick="var el=document.getElementById('rank-next10');var btn=this;if(el.style.display==='none'){el.style.display='';btn.textContent='Hide #11–${Math.min(20, rankings.length)} ▲'}else{el.style.display='none';btn.textContent='Show next 10 ▼'}">Show next 10 ▼</button>
    </td></tr>`
                  : "";
              const next10Rows = next10.length
                  ? `<tbody id="rank-next10" style="display:none">${next10.map((r, i) => renderRow(r, i + 10)).join("")}</tbody>`
                  : "";
              return `<div class="section-label" style="margin-top:1.5rem">Rock efficiency ranking${raidSelector} <span style="font-size:12px;color:#475569;font-weight:400">(${selRaid ? "damage gain per rock" : "gain% per rock"}, higher = better)</span></div>
    <table class="attr-table" style="width:100%;table-layout:fixed">
      <colgroup>
        <col style="width:4%">
        <col style="width:${selRaid ? "20%" : "25%"}">
        <col style="width:8%">
        <col style="width:8%">
        <col style="width:${selRaid ? "24%" : "40%"}">
        ${selRaid ? `<col style="width:10%"><col style="width:12%">` : ""}
        <col style="width:${selRaid ? "14%" : "15%"}">
      </colgroup>
      <tr><th>Prio.</th><th>Nikke</th><th>Slot</th><th>Rocks</th><th>Gain</th>${selRaid ? `<th class="sort-header" onclick="setRankSort('dmg')">DMG${sortArrow("dmg")}</th><th class="sort-header" onclick="setRankSort('dmgGain')">DMG Gain${sortArrow("dmgGain")}</th>` : ""}<th class="sort-header" onclick="setRankSort('efficiency')">Efficiency${sortArrow("efficiency")}</th></tr>
      ${top10.map((r, i) => renderRow(r, i)).join("")}
      ${toggleBtn}
      ${next10Rows}
    </table>`;
          })()
        : `<div class="section-label" style="margin-top:1.5rem">Rock efficiency ranking${raidSelector}</div><div style="font-size:14px;color:#475569">No actionable slots to rank</div>`;

    const html = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <input id="overview-search" class="form-input" placeholder="Search Nikke..." value="${_overviewSearch.replace(/"/g, "&quot;")}" oninput="filterOverviewList()" style="font-size:13px;padding:4px 8px;width:160px"/>
      <label class="elemental-toggle" title="Include Elemental Dmg in gain calculations" style="margin-left:auto">
        <input type="checkbox" id="elemental-chk" onchange="toggleElementalBoss(this.checked)" ${state.elementalBoss ? "checked" : ""} style="accent-color:#3b82f6"/>
        <span>Elemental boss</span>
      </label>
    </div>
    ${rankingHtml}`;
    return { count: rankings.length, html };
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
        const rec = db && db.build && db.build.skill && db.build.skill.pve ? db.build.skill.pve.rec : null;
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
        ? `<div class="section-label" style="margin-top:1rem">Skill recommendedations<span style="font-size:12px;color:#475569;font-weight:400"> (current → recommended)</span></div>
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
    const view = _overviewView || "rockeff";
    const views = {
        rockeff: { label: "Rock Efficiency", data: buildRockEffView() },
        equipment: { label: "Equipment", data: buildEquipmentView() },
        skills: { label: "Skills", data: buildSkillsView() },
        dolls: { label: "Dolls", data: buildDollsView() },
        bond: { label: "Bond", data: buildBondView() },
    };
    const active = views[view] || views.rockeff;
    const btn = (key) =>
        `<button type="button" class="metric-card ov-btn${view === key ? " active" : ""}" onclick="setOverviewView('${key}')">
        <div class="metric-val">${views[key].data.count}</div><div class="metric-label">${views[key].label}</div></button>`;
    const showElementFilter = ["equipment", "skills", "dolls", "bond"].includes(view);
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
    <div class="ov-grid">
      ${btn("rockeff")}
      ${btn("equipment")}
      ${btn("skills")}
      ${btn("dolls")}
      ${btn("bond")}
    </div>
    ${elementFilter}
    ${active.data.html}`;
    if (view === "rockeff" && _overviewSearch) filterOverviewList();
}

function toggleElementalBoss(checked) {
    state.elementalBoss = checked;
    save();
    renderOverview();
    // Only re-render gear main content if a nikke is selected, don't touch sidebar
    if (state.selGear) {
        const n = state.nikkes.find((x) => x.id === state.selGear);
        if (n) renderGearMain(n);
    }
}

function selectRaidFilter(raidId) {
    state.selRaid = raidId || null;
    save();
    renderOverview();
}

function setRankSort(col) {
    if (state.rankSort === col) {
        state.rankSortAsc = !state.rankSortAsc;
    } else {
        state.rankSort = col;
        state.rankSortAsc = false; // default desc for new column
    }
    renderOverview();
}
