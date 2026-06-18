// ============================================================
//  DAMAGE WEIGHTS — Stat importance by weapon type
//  Controls how each stat's value translates to effective DPS.
// ============================================================

// Base weights (weapon-independent):
//   ATK = 1.0, Elemental = 1.0 (direct multipliers)
//   Crit Rate = 0.5 (depends on existing CD, ~50% CD average → 0.5)
//   Crit Damage = 0.35 (depends on existing CR, ~30-35% CR average → 0.35)
//   Hit Rate = 0 (base; weapon-specific overrides below)
//   Max Ammo = 0.25 (base; high value for FIRST line, diminishes sharply after)
//   DEF = 0 (always trash)
// Weapon-specific adjustments:
//   Max Ammo: SR/RL = 0.30, AR/SG = 0.25, SMG/MG = 0.20 (first line value)
//   Charge Speed: SR/RL = 0.6, others = 0 (no charge mechanic)
//   Charge Damage: SR/RL = 0.5, others = 0
//   Hit Rate: SG = 0.5 (tightens pellet spread), AR/SMG/MG = 0.2 (moderate), SR/RL = 0 (pinpoint accuracy)
// Diminishing returns for Max Ammo:
//   1st line = 100% of weight, 2nd = 15%, 3rd+ = 5%

const STAT_DMG_WEIGHT_BASE = {
  'ATK': 1.0,
  'Elemental Damage': 1.0,
  'Critical Rate': 0.5,
  'Critical Damage': 0.35,
  'Hit Rate': 0,
  'Max Ammo': 0.25,
  'Charge Speed': 0,
  'Charge Damage': 0,
  'DEF': 0,
};

const STAT_DMG_WEIGHT_WEAPON = {
  'SR':  { 'Max Ammo': 0.30, 'Charge Speed': 0.6, 'Charge Damage': 0.5, 'Hit Rate': 0 },
  'RL':  { 'Max Ammo': 0.30, 'Charge Speed': 0.6, 'Charge Damage': 0.5, 'Hit Rate': 0 },
  'AR':  { 'Max Ammo': 0.25, 'Hit Rate': 0.2 },
  'SMG': { 'Max Ammo': 0.20, 'Hit Rate': 0.2 },
  'MG':  { 'Max Ammo': 0.20, 'Hit Rate': 0.2 },
  'SG':  { 'Max Ammo': 0.25, 'Hit Rate': 0.5 },
};

// Diminishing returns multiplier for Max Ammo based on how many lines the nikke already has
// Index = number of existing Max Ammo lines (0 = first line, 1 = second, 2+ = third+)
const AMMO_DIMINISH_DEFAULT = [1.0, 0.15, 0.05];

function getAmmoDiminish() {
  if (state.customWeights && state.customWeights.ammoDiminish) return state.customWeights.ammoDiminish;
  return AMMO_DIMINISH_DEFAULT;
}

// Count how many Max Ammo lines a nikke currently has across all gear
function countAmmoLines(nikke) {
  if (!nikke || !nikke.gear) return 0;
  let count = 0;
  SLOTS.forEach(s => {
    if (nikke.gear[s] && nikke.gear[s].lines) {
      nikke.gear[s].lines.forEach(l => { if (l.stat === 'Max Ammo') count++; });
    }
  });
  return count;
}

function getStatDmgWeight(stat, nikkeName, nikkeObj) {
  const weapon = (nikkeObj && nikkeObj.weapon) || 'AR';
  // Check custom weights first (user-editable)
  let baseWeight;
  if (state.customWeights) {
    const cw = state.customWeights;
    if (cw.weapon && cw.weapon[weapon] && cw.weapon[weapon][stat] !== undefined) baseWeight = cw.weapon[weapon][stat];
    else if (cw.base && cw.base[stat] !== undefined) baseWeight = cw.base[stat];
  }
  if (baseWeight === undefined) {
    const weaponOverrides = STAT_DMG_WEIGHT_WEAPON[weapon] || {};
    baseWeight = weaponOverrides[stat] !== undefined ? weaponOverrides[stat] : (STAT_DMG_WEIGHT_BASE[stat] || 0);
  }
  // Apply diminishing returns for Max Ammo
  if (stat === 'Max Ammo' && nikkeObj) {
    const existing = countAmmoLines(nikkeObj);
    const diminish = getAmmoDiminish();
    const mult = existing < diminish.length ? diminish[existing] : diminish[diminish.length - 1];
    return baseWeight * mult;
  }
  return baseWeight;
}
