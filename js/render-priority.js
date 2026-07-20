// ============================================================
//  RENDER: LINE PRIORITIES (Priorities sub-tab of the Nikkes screen)
// ============================================================

// Re-render the gear detail panel (attribute totals + verdicts depend on
// priorities) and the overview, keeping the active sub-tab. The selected
// Nikke is whatever the Nikkes screen currently has open (state.selGear).
function refreshGearPrio() {
    renderGear();
    renderOverview();
}

function prioStepperHtml(nid, i, value, min, max, stepFn, changeFn) {
    const minDis = value <= min ? " disabled" : "";
    const maxDis = value >= max ? " disabled" : "";
    return `<div class="stepper">
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="${stepFn}('${nid}',${i},-1)"${minDis}>−</button>
<input class="stepper-input" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${value}" onchange="${changeFn}('${nid}',${i},this.value)"/>
<button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="${stepFn}('${nid}',${i},1)"${maxDis}>+</button>
</div>`;
}

// Build the inner HTML of the Priorities sub-tab for a single Nikke.
// No header — the Nikke detail panel already shows the name/meta above.
function renderPrioContent(nikke) {
    const rows = nikke.priorities
        .map((p, i) => {
            const statOpts = ALL_LINES.filter((l) => !ALWAYS_TRASH.has(l))
                .map((l) => `<option value="${l}" ${p.line === l ? "selected" : ""}>${l}</option>`)
                .join("");
            const tierOpts = PRIORITY_TIERS.map(
                (t) => `<option value="${t}" ${p.tier === t ? "selected" : ""}>${t}</option>`,
            ).join("");
            const count = parseInt(p.count) || 1;
            const targetTier = parseInt(p.targetTier) || 11;
            const tgtVal = p.line && TIER_TABLE[p.line] ? TIER_TABLE[p.line][targetTier - 1] : null;
            const prob = probHitTargetTier(targetTier);
            const expRolls = Math.round(1 / prob);
            return `<div class="prio-card">
      <div class="prio-inner">
        <div class="prio-fields">
          <div class="prio-field">
            ${fieldChipHtml({ nid: nikke.id, editor: "options", optType: "prioLine", field: "prioLine", index: i, block: true, label: "Stat", valueText: p.line || "— select —" })}
          </div>
          <div class="prio-field">
            ${fieldChipHtml({ nid: nikke.id, editor: "options", optType: "prioTier", field: "prioTier", index: i, block: true, label: "Priority", valueText: p.tier || "Ideal" })}
          </div>
          <div class="prio-field">
            ${fieldChipHtml({ nid: nikke.id, editor: "stepper", kind: "prio", index: i, field: "count", value: count, min: 1, max: 4, block: true, label: "Count", valueText: chipNumText(count) })}
          </div>
          <div class="prio-field">
            ${fieldChipHtml({ nid: nikke.id, editor: "stepper", kind: "prio", index: i, field: "targetTier", value: targetTier, min: 1, max: 15, block: true, label: "Target Tier", valueText: chipNumText(targetTier) })}
          </div>
        </div>
        <button class="small-del-btn" onclick="delPrio('${nikke.id}',${i})" title="Remove">✕</button>
      </div>
    </div>`;
        })
        .join("");

    return `
    ${rows}
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="add-line-btn" onclick="addPrio('${nikke.id}')">+ Add line</button>
      <button class="add-line-btn" onclick="loadDbPriorities('${nikke.id}')" title="Populate from database overload recommendations">↺ Load from database</button>
    </div>`;
}

function updatePrioLine(nid, i, v) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities[i].line = v;
    save();
    refreshGearPrio();
}
function updatePrioTier(nid, i, v) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities[i].tier = v;
    save();
    refreshGearPrio();
}
function updatePrioCount(nid, i, v) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities[i].count = Math.min(4, Math.max(1, parseInt(v) || 1));
    save();
    refreshGearPrio();
}
function stepPrioCount(nid, i, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities[i].count = Math.min(4, Math.max(1, (parseInt(n.priorities[i].count) || 1) + delta));
    save();
    refreshGearPrio();
}
function updatePrioTargetTier(nid, i, v) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities[i].targetTier = Math.min(15, Math.max(1, parseInt(v) || 11));
    save();
    refreshGearPrio();
}
function stepPrioTargetTier(nid, i, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities[i].targetTier = Math.min(15, Math.max(1, (parseInt(n.priorities[i].targetTier) || 11) + delta));
    save();
    refreshGearPrio();
}
function addPrio(nid) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities.push({ line: "", tier: "Ideal", count: 1, targetTier: 10 });
    save();
    refreshGearPrio();
}
function delPrio(nid, i) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.priorities.splice(i, 1);
    save();
    refreshGearPrio();
}
