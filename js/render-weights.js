// ============================================================
//  WEIGHTS SETTINGS UI
// ============================================================

function renderWeights() {
    const el = document.getElementById("weights");
    const ALL_STATS = Object.keys(STAT_DMG_WEIGHT_BASE);
    const WEAPONS = Object.keys(NIKKE_WEAPONS);

    // Resolve current effective values
    function getBase(stat) {
        if (state.customWeights && state.customWeights.base && state.customWeights.base[stat] !== undefined)
            return state.customWeights.base[stat];
        return STAT_DMG_WEIGHT_BASE[stat];
    }
    function getWeapon(weapon, stat) {
        if (
            state.customWeights &&
            state.customWeights.weapon &&
            state.customWeights.weapon[weapon] &&
            state.customWeights.weapon[weapon][stat] !== undefined
        )
            return state.customWeights.weapon[weapon][stat];
        return STAT_DMG_WEIGHT_WEAPON[weapon] && STAT_DMG_WEIGHT_WEAPON[weapon][stat] !== undefined
            ? STAT_DMG_WEIGHT_WEAPON[weapon][stat]
            : "";
    }

    // Check if values differ from defaults
    function isBaseCustom(stat) {
        if (!state.customWeights || !state.customWeights.base) return false;
        return (
            state.customWeights.base[stat] !== undefined &&
            state.customWeights.base[stat] !== STAT_DMG_WEIGHT_BASE[stat]
        );
    }
    function isWeaponCustom(weapon, stat) {
        if (!state.customWeights || !state.customWeights.weapon || !state.customWeights.weapon[weapon])
            return false;
        const defaultVal =
            STAT_DMG_WEIGHT_WEAPON[weapon] && STAT_DMG_WEIGHT_WEAPON[weapon][stat] !== undefined
                ? STAT_DMG_WEIGHT_WEAPON[weapon][stat]
                : undefined;
        return (
            state.customWeights.weapon[weapon][stat] !== undefined &&
            state.customWeights.weapon[weapon][stat] !== defaultVal
        );
    }

    const baseRows = ALL_STATS.map((stat) => {
        const val = getBase(stat);
        const custom = isBaseCustom(stat) ? ' style="color:#fbbf24"' : "";
        return `<tr>
      <td${custom}>${stat}</td>
      <td><input type="number" step="0.01" min="0" max="5" class="value-input" style="width:70px"
        value="${val}" onchange="updateBaseWeight('${stat}', this.value)"></td>
      <td style="font-size:12px;color:#475569">${STAT_DMG_WEIGHT_BASE[stat]}</td>
    </tr>`;
    }).join("");

    const weaponStats = ["Max Ammo", "Charge Speed", "Charge Dmg", "Hit Rate"];
    const weaponRows = WEAPONS.map((w) => {
        const cells = weaponStats
            .map((stat) => {
                const val = getWeapon(w, stat);
                const defaultVal =
                    STAT_DMG_WEIGHT_WEAPON[w] && STAT_DMG_WEIGHT_WEAPON[w][stat] !== undefined
                        ? STAT_DMG_WEIGHT_WEAPON[w][stat]
                        : "—";
                const custom = isWeaponCustom(w, stat) ? ' style="color:#fbbf24"' : "";
                return `<td${custom}><input type="number" step="0.01" min="0" max="5" class="value-input" style="width:65px"
        value="${val}" placeholder="${defaultVal === "—" ? "" : defaultVal}"
        onchange="updateWeaponWeight('${w}','${stat}', this.value)"></td>`;
            })
            .join("");
        return `<tr><td style="font-weight:600;color:#60a5fa">${w}</td>${cells}</tr>`;
    }).join("");

    const diminish = getAmmoDiminish();
    const diminishLabels = ["1st line", "2nd line", "3rd+ lines"];
    const diminishRows = diminish
        .map((val, i) => {
            const isCustom =
                state.customWeights &&
                state.customWeights.ammoDiminish &&
                state.customWeights.ammoDiminish[i] !== AMMO_DIMINISH_DEFAULT[i];
            const custom = isCustom ? ' style="color:#fbbf24"' : "";
            return `<tr>
      <td${custom}>${diminishLabels[i] || `Line ${i + 1}+`}</td>
      <td><input type="number" step="0.01" min="0" max="1" class="value-input" style="width:70px"
        value="${val}" onchange="updateAmmoDiminish(${i}, this.value)"></td>
      <td style="font-size:12px;color:#475569">${AMMO_DIMINISH_DEFAULT[i]}</td>
      <td style="font-size:12px;color:#475569">×${val} = effective weight is ${(val * 100).toFixed(0)}% of base</td>
    </tr>`;
        })
        .join("");

    el.innerHTML = `
    <div style="max-width:700px">
      <div class="section-label">Stat Damage Weights</div>
      <div class="info-note" style="margin-bottom:1rem">
        These weights approximate how much 1% of each stat translates to effective DPS gain.
        They are used to score gear lines and rank upgrade priorities.
        <span style="color:#fbbf24">Yellow</span> values differ from defaults.
      </div>

      <div class="section-label" style="margin-top:1.2rem">Base Weights (weapon-independent)</div>
      <table class="attr-table">
        <tr><th>Stat</th><th>Weight</th><th>Default</th></tr>
        ${baseRows}
      </table>

      <div class="section-label" style="margin-top:1.5rem">Weapon-Specific Overrides</div>
      <div class="info-note" style="margin-bottom:.7rem">
        These override the base weight for specific weapon types. Leave blank to use the base weight.
      </div>
      <table class="attr-table">
        <tr><th>Weapon</th><th>Max Ammo</th><th>Charge Speed</th><th>Charge Dmg</th><th>Hit Rate</th></tr>
        ${weaponRows}
      </table>

      <div class="section-label" style="margin-top:1.5rem">Max Ammo Diminishing Returns</div>
      <div class="info-note" style="margin-bottom:.7rem">
        The first Max Ammo line is highly valuable (reduces reload frequency significantly).
        Additional lines have sharply diminishing returns. The multiplier below is applied to the base Max Ammo weight.
      </div>
      <table class="attr-table">
        <tr><th>Line #</th><th>Multiplier</th><th>Default</th><th>Effect</th></tr>
        ${diminishRows}
      </table>

      <div style="margin-top:1.5rem; display:flex; gap:10px">
        <button class="btn" onclick="resetWeightsToDefault()">Reset All to Defaults</button>
      </div>
    </div>
  `;
}

function updateBaseWeight(stat, value) {
    if (!state.customWeights) state.customWeights = {};
    if (!state.customWeights.base) state.customWeights.base = {};
    const v = parseFloat(value);
    if (isNaN(v)) {
        delete state.customWeights.base[stat];
    } else {
        state.customWeights.base[stat] = v;
    }
    save();
}

function updateWeaponWeight(weapon, stat, value) {
    if (!state.customWeights) state.customWeights = {};
    if (!state.customWeights.weapon) state.customWeights.weapon = {};
    if (!state.customWeights.weapon[weapon]) state.customWeights.weapon[weapon] = {};
    const v = parseFloat(value);
    if (isNaN(v) || value === "") {
        delete state.customWeights.weapon[weapon][stat];
        if (Object.keys(state.customWeights.weapon[weapon]).length === 0)
            delete state.customWeights.weapon[weapon];
    } else {
        state.customWeights.weapon[weapon][stat] = v;
    }
    save();
}

function resetWeightsToDefault() {
    delete state.customWeights;
    save();
    renderWeights();
}

function updateAmmoDiminish(index, value) {
    if (!state.customWeights) state.customWeights = {};
    if (!state.customWeights.ammoDiminish) state.customWeights.ammoDiminish = [...AMMO_DIMINISH_DEFAULT];
    const v = parseFloat(value);
    if (isNaN(v)) {
        state.customWeights.ammoDiminish[index] = AMMO_DIMINISH_DEFAULT[index];
    } else {
        state.customWeights.ammoDiminish[index] = Math.max(0, Math.min(1, v));
    }
    save();
    renderWeights();
}
