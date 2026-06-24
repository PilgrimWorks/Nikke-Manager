// ============================================================
//  OVERLOAD MATH — Tier tables, probabilities, verdict engine
//  All game math and recommendation logic lives here.
// ============================================================

// Stats whose values are expressed as percentages
const IS_PCT = new Set([
  'ATK', 'Elemental Dmg', 'Charge Speed', 'Charge Dmg',
  'Critical Rate', 'Critical Dmg', 'Hit Rate', 'DEF'
]);

// Prydwen minimum acceptable values per single line
// (based on community guides — lines below this are considered weak rolls)
const MIN_VAL = {
  'Elemental Dmg': 19.35,
  'Max Ammo':         52.50,
  'ATK':               9.70,
  'Charge Speed':      4.04,
  'Hit Rate':          9.70,
};

// Exact % values per tier (T1–T15) for each stat
// Source: in-game probability table
const TIER_TABLE = {
  'Elemental Dmg': [9.54,10.94,12.34,13.75,15.15,16.55,17.95,19.35,20.75,22.15,23.56,24.96,26.36,27.76,29.16],
  'Hit Rate':         [4.77,5.47,6.18,6.88,7.59,8.29,9.00,9.70,10.40,11.11,11.81,12.52,13.22,13.93,14.63],
  'Max Ammo':         [27.84,31.95,36.06,40.17,44.28,48.39,52.50,56.60,60.71,64.82,68.93,73.04,77.15,81.26,85.37],
  'ATK':              [4.77,5.47,6.18,6.88,7.59,8.29,9.00,9.70,10.40,11.11,11.81,12.52,13.22,13.93,14.63],
  'Charge Dmg':    [4.77,5.47,6.18,6.88,7.59,8.29,9.00,9.70,10.40,11.11,11.81,12.52,13.22,13.93,14.63],
  'Charge Speed':     [1.98,2.28,2.57,2.86,3.16,3.45,3.75,4.04,4.33,4.63,4.92,5.21,5.51,5.80,6.09],
  'Critical Rate':    [2.30,2.64,2.98,3.32,3.66,4.00,4.35,4.69,5.03,5.37,5.71,6.05,6.39,6.73,7.07],
  'Critical Dmg':  [6.64,7.62,8.60,9.58,10.56,11.54,12.52,13.50,14.48,15.46,16.44,17.42,18.40,19.38,20.36],
  'DEF':              [4.77,5.47,6.18,6.88,7.59,8.29,9.00,9.70,10.40,11.11,11.81,12.52,13.22,13.93,14.63],
};

// Probability that a stat roll lands in each tier
// T1–5: 12% each, T6–10: 7% each, T11–15: 1% each
// Index 0 unused; index 1 = T1, index 15 = T15
const TIER_PROB = [0, 12,12,12,12,12, 7,7,7,7,7, 1,1,1,1,1];

// Probability that a stat appears at all on each line
// Line 1 always has a stat; Line 2 = 50% chance; Line 3 = 30% chance
const LINE_APPEAR = [1.0, 0.5, 0.3];
const LINE_CHANCE_LABELS = ['100%', '50%', '30%'];
const LINE_CHANCE_CSS    = ['lc-100', 'lc-50', 'lc-30'];

// Base % chance for each stat to appear on a line (sums to 100)
// When a stat is already on the piece, the pool renormalizes across remaining stats
const STAT_BASE_CHANCE = {
  'ATK': 10, 'Elemental Dmg': 10, 'Max Ammo': 12,
  'Charge Speed': 12, 'Charge Dmg': 12, 'Critical Rate': 12,
  'Critical Dmg': 10, 'Hit Rate': 12, 'DEF': 10,
};


// ============================================================
//  PROBABILITY HELPERS
// ============================================================

/*
 * Probability of hitting targetTier or above on a single Reset Attributes roll.
 * Formula: sum of TIER_PROB[targetTier..15] / 100
 */
function probHitTargetTier(targetTier) {
  let p = 0;
  for (let t = targetTier; t <= 15; t++) p += TIER_PROB[t];
  return p / 100;
}

/*
 * Detect the tier of a rolled value for a given stat.
 * Scans TIER_TABLE from T15 down and returns the first tier
 * whose threshold is <= the rolled value.
 */
function getTier(stat, val) {
  const thresholds = TIER_TABLE[stat];
  if (!thresholds) return null;
  const v = parseFloat(val);
  if (isNaN(v)) return null;
  for (let i = 14; i >= 0; i--) {
    if (v >= thresholds[i] - 0.005) return i + 1; // tier is 1-indexed
  }
  return 1;
}

/*
 * Visual badge info for a given tier number.
 */
function tierBadgeInfo(tier) {
  if (!tier) return null;
  if (tier >= 15) return { label: 'T15', cls: 'tb-elite' };
  if (tier >= 12) return { label: `T${tier}`, cls: 'tb-high' };
  if (tier >= 6)  return { label: `T${tier}`,  cls: 'tb-mid'  };
  return { label: `T${tier}`, cls: 'tb-low' };
}

/*
 * Returns a normalized pool of stat probabilities, excluding stats already on the piece.
 * This is because no stat can appear twice on the same gear piece.
 *
 * usedStats: Set of stat names already present on this piece
 * Returns: { statName: normalizedFraction, ... }
 */
function remainingStatPool(usedStats) {
  let total = 0;
  const pool = {};
  ALL_LINES.forEach(s => {
    if (!usedStats.has(s)) {
      pool[s] = STAT_BASE_CHANCE[s];
      total  += STAT_BASE_CHANCE[s];
    }
  });
  const normalized = {};
  Object.entries(pool).forEach(([s, c]) => normalized[s] = c / total);
  return normalized;
}

/*
 * Given a normalized stat pool and a Nikke's priority list,
 * returns the fraction of the pool that consists of Essential/Ideal stats.
 */
function goodStatFraction(pool, nikke) {
  return nikke.priorities
    .filter(p => p.tier === 'Essential' || p.tier === 'Ideal')
    .reduce((sum, p) => sum + (pool[p.line] || 0), 0);
}

/*
 * Probability that at least one of the given unlocked lines produces
 * a good stat in a single Change Effects roll.
 */
function pAtLeastOneGood(unlockedLines, goodFrac) {
  let pNone = 1;
  unlockedLines.forEach(l => { pNone *= (1 - l.appear * goodFrac); });
  return 1 - pNone;
}

/*
 * Rock cost per roll = number of locked lines + 1.
 */
function rocksPerRoll(lockedCount) {
  return lockedCount + 1;
}

/*
 * Expected rocks to land a good stat via Change Effects.
 */
function estChangeEffectsRocks(unlockedLines, goodFrac, lockedCount) {
  if (!unlockedLines.length) return 0;
  const p = pAtLeastOneGood(unlockedLines, goodFrac);
  if (p <= 0) return 999;
  return Math.round(1 / p) * rocksPerRoll(lockedCount);
}

/*
 * Expected rocks to get N good unlocked lines to targetTier+ via Reset Attributes.
 */
function estResetAttributesRocks(goodUnlockedCount, startLockedCount, targetTierProb) {
  let rocks = 0;
  let lockedCount = startLockedCount;
  let remaining = goodUnlockedCount;
  while (remaining > 0) {
    const p = 1 - Math.pow(1 - targetTierProb, remaining);
    rocks += Math.round(1 / p) * rocksPerRoll(lockedCount);
    lockedCount++;
    remaining--;
  }
  return rocks;
}

/*
 * Expected value of a stat when hitting targetTier or above.
 * Weighted average of tier values from targetTier..15, weighted by TIER_PROB.
 */
function expectedValAtTarget(stat, targetTier) {
  const thresholds = TIER_TABLE[stat];
  if (!thresholds) return 0;
  let weightedSum = 0, totalProb = 0;
  for (let t = targetTier; t <= 15; t++) {
    weightedSum += thresholds[t - 1] * TIER_PROB[t];
    totalProb += TIER_PROB[t];
  }
  return totalProb > 0 ? weightedSum / totalProb : 0;
}

/*
 * Expected value of a stat across ALL tiers (T1-T15), weighted by TIER_PROB.
 * This is what you expect from a fresh Change Effects roll — any tier can appear.
 */
function expectedValAnyTier(stat) {
  const thresholds = TIER_TABLE[stat];
  if (!thresholds) return 0;
  let weightedSum = 0, totalProb = 0;
  for (let t = 1; t <= 15; t++) {
    weightedSum += thresholds[t - 1] * TIER_PROB[t];
    totalProb += TIER_PROB[t];
  }
  return totalProb > 0 ? weightedSum / totalProb : 0;
}

/*
 * Expected value gain from Reset Attributes on a line.
 */
function resetGain(stat, currentVal, targetTier) {
  if (stat === 'Elemental Dmg' && !state.elementalBoss) return 0;
  const expected = expectedValAtTarget(stat, targetTier);
  const current = parseFloat(currentVal) || 0;
  return Math.max(0, expected - current);
}

/*
 * Expected value gain from Change Effects (landing a new good stat).
 * Uses the weighted average across all good stats in the pool,
 * assuming the new line will land at the average tier (weighted by TIER_PROB).
 * targetTier is the minimum acceptable tier for the nikke's priorities.
 * Excludes Elemental Dmg from gain calculation if elementalBoss is off.
 */
function changeEffectsGain(nikke, pool, currentLines, sacrificedLines) {
  const goodPrios = nikke.priorities.filter(p => p.tier === 'Essential' || p.tier === 'Ideal');
  if (!goodPrios.length) return { stat: '—', gain: 0, loss: 0, net: 0 };

  // Count how many of each stat already exist across ALL gear (excluding sacrificed lines on this piece)
  const statCountAcrossGear = {};
  SLOTS.forEach(s => {
    nikke.gear[s].lines.forEach(l => {
      if (l.stat) statCountAcrossGear[l.stat] = (statCountAcrossGear[l.stat] || 0) + 1;
    });
  });
  // Subtract sacrificed lines (they're being given up)
  if (sacrificedLines) {
    sacrificedLines.forEach(l => {
      if (l.stat && statCountAcrossGear[l.stat]) statCountAcrossGear[l.stat]--;
    });
  }

  // Calculate the LOSS from sacrificing good lines (weighted by stat DPS value)
  let totalLoss = 0;
  let totalLossRaw = 0;
  if (sacrificedLines && sacrificedLines.length) {
    sacrificedLines.forEach(l => {
      if (!l.stat || !l.val) return;
      const cls = classifyLine(l.stat, nikke);
      if (!isGoodLine(cls)) return;
      const currentVal = parseFloat(l.val) || 0;
      if (currentVal <= 0) return;
      const comebackFrac = pool[l.stat] || 0;
      const evIfBack = expectedValAnyTier(l.stat);
      const numSacLines = sacrificedLines.length;
      const avgAppear = sacrificedLines.reduce((s, sl) => s + (LINE_APPEAR[sl.idx !== undefined ? sl.idx : 0] || 0.6), 0) / numSacLines;
      const pComeBack = 1 - Math.pow(1 - comebackFrac * avgAppear, numSacLines);
      let effectiveLoss = currentVal - (pComeBack * evIfBack);
      if (l.stat === 'Elemental Dmg' && !state.elementalBoss) effectiveLoss = 0;
      if (effectiveLoss > 0) {
        const statWeight = getStatDmgWeight(l.stat, nikke.name, nikke) || 0.01;
        totalLoss += effectiveLoss * statWeight;
        totalLossRaw += effectiveLoss;
      }
    });
  }

  // Calculate the GAIN from landing a new good stat (weighted by stat DPS value)
  let totalPoolWeight = 0, weightedGainDps = 0;
  const gains = [];
  // Build set of stats being sacrificed so we don't count them as "existing"
  const sacrificedStats = new Set();
  if (sacrificedLines) {
    sacrificedLines.forEach(l => { if (l.stat) sacrificedStats.add(l.stat); });
  }
  goodPrios.forEach(p => {
    const w = pool[p.line] || 0;
    if (w <= 0) return;
    const needed = parseInt(p.count) || 1;
    const have = statCountAcrossGear[p.line] || 0;
    if (have >= needed) return;
    const ev = expectedValAnyTier(p.line);
    // If this stat is on the current piece but being sacrificed, treat current as 0
    const existing = currentLines.find(l => l.stat === p.line);
    const current = (existing && !sacrificedStats.has(p.line)) ? (parseFloat(existing.val) || 0) : 0;
    let gain = Math.max(0, ev - current);
    if (p.line === 'Elemental Dmg' && !state.elementalBoss) gain = 0;
    const dmgW = getStatDmgWeight(p.line, nikke.name, nikke) || 0.01;
    gains.push({ stat: p.line, gain, weight: w, dmgW });
    totalPoolWeight += w;
    weightedGainDps += gain * w * dmgW;
  });
  if (totalPoolWeight <= 0) return { stat: '—', gain: 0, loss: totalLossRaw, net: -totalLossRaw };

  gains.sort((a, b) => (b.weight * b.dmgW) - (a.weight * a.dmgW));
  const grossGain = gains.reduce((s, g) => s + g.gain * g.weight, 0) / totalPoolWeight;
  const net = grossGain - totalLossRaw;
  const grossGainDps = weightedGainDps / totalPoolWeight;
  const netDps = grossGainDps - totalLoss;
  return { stat: gains[0].stat, gain: grossGain, loss: totalLossRaw, net, netDps, gains };
}


// ============================================================
//  LINE CLASSIFICATION
// ============================================================

function classifyLine(stat, nikke) {
  if (!stat) return null;
  if (ALWAYS_TRASH.has(stat)) return 'trash';
  const p = nikke.priorities.find(p => p.line === stat);
  if (!p) return 'unset';
  return p.tier.toLowerCase(); // 'essential', 'ideal', 'passable'
}

function getTargetTier(stat, nikke) {
  const p = nikke.priorities.find(p => p.line === stat);
  return p ? parseInt(p.targetTier) || 11 : 11;
}

function isAtTarget(stat, val, nikke) {
  const tier = getTier(stat, val);
  if (!tier) return false;
  return tier >= getTargetTier(stat, nikke);
}

function isAboveMinVal(stat, val) {
  if (!(stat in MIN_VAL)) return true;
  const v = parseFloat(val);
  if (isNaN(v)) return false;
  return v >= MIN_VAL[stat];
}

function isGoodLine(cls) {
  return cls === 'essential' || cls === 'ideal';
}


// ============================================================
//  VERDICT ENGINE
//  Produces a recommendation object for a single gear slot.
// ============================================================

function getVerdict(nikke, slot) {
  const lines = nikke.gear[slot].lines;

  // If all lines are empty but the Nikke has priorities, recommend starting
  if (lines.every(l => !l.stat)) {
    if (!nikke.priorities || !nikke.priorities.length) return null;
    const goodPrios = nikke.priorities.filter(p => p.tier === 'Essential' || p.tier === 'Ideal');
    if (!goodPrios.length) return null;
    const goodStatNames = goodPrios.map(p => p.line).join('/');
    const pool = remainingStatPool(new Set());
    const gf   = goodStatFraction(pool, nikke);
    const fl   = [{ appear: 1.0 }, { appear: 0.5 }, { appear: 0.3 }];
    const pGood = pAtLeastOneGood(fl, gf);
    const fishRocks = estChangeEffectsRocks(fl, gf, 0);
    // Calculate expected gain per priority stat (same logic as changeEffectsGain but no loss)
    const gainParts = goodPrios.map(p => {
      const ev = expectedValAnyTier(p.line);
      return `${p.line} +${ev.toFixed(2)}%`;
    });
    // Compute DPS-weighted gain (best single stat you could land, weighted)
    const emptyDpsGain = goodPrios.reduce((best, p) => {
      const ev = expectedValAnyTier(p.line);
      const w = getStatDmgWeight(p.line, nikke.name, nikke) || 0.01;
      return Math.max(best, ev * w);
    }, 0);
    return {
      label: `Ready to roll — ~${fishRocks} rocks for ${goodStatNames}`,
      steps: [
        `Use Overload to start rolling effects on this gear`,
        `${(pGood * 100).toFixed(0)}% chance per roll to hit ${goodStatNames} (1 rock/roll)`,
        `Expected gains: ${gainParts.join(', ')}`,
        `Expected ~${fishRocks} rocks to land your first good line`,
      ],
      cls: 'v-ok',
      rocks: fishRocks,
      gain: gainParts.join(', '),
      dpsGain: emptyDpsGain,
    };
  }

  // Annotate each line with derived info
  const ann = lines.map((l, i) => {
    const cls       = l.stat ? classifyLine(l.stat, nikke) : null;
    const tier      = l.stat && l.val ? getTier(l.stat, l.val) : null;
    const targetTier = l.stat ? getTargetTier(l.stat, nikke) : 11;
    const atTarget  = l.stat && l.val ? isAtTarget(l.stat, l.val, nikke) : false;
    const good      = isGoodLine(cls);
    return { ...l, idx: i, cls, tier, targetTier, atTarget, isGood: good, isSac: !good, appear: LINE_APPEAR[i] };
  });

  const lockedCount   = ann.filter(l => l.locked && l.stat).length;
  const goodLines     = ann.filter(l => l.isGood);
  const goodBelowTgt  = goodLines.filter(l => l.stat && l.val && !l.atTarget);
  const usedStats     = new Set(ann.filter(l => l.stat).map(l => l.stat));

  // Helper: good stat fraction for a pool that excludes usedStats + alsoExclude
  function goodFrac(alsoExclude = []) {
    const pool = remainingStatPool(new Set([...usedStats, ...alsoExclude]));
    return goodStatFraction(pool, nikke);
  }

  // Helper: list of good stat names for display
  const goodStatNames = nikke.priorities
    .filter(p => p.tier === 'Essential' || p.tier === 'Ideal')
    .map(p => p.line).join('/') || 'good stats';

  const lineName = l => `Line ${l.idx + 1} (${LINE_CHANCE_LABELS[l.idx]}) — ${l.stat}`;

  // ── CASE 1: 2+ good lines already at target ──────────────
  const allGoodAtTarget = goodLines.length >= 2 && goodBelowTgt.length === 0 && !goodLines.some(l => l.stat && !l.val);
  if (allGoodAtTarget) {
    const steps = [];
    if (goodLines.length === 3) {
      steps.push('This gear is ideal — all 3 lines are at target. No changes needed.');
    } else {
      goodLines.filter(l => !l.locked).sort((a, b) => b.idx - a.idx)
        .forEach(l => steps.push(`Lock ${lineName(l)}`));
      const sacUnlocked = ann.filter(l => l.isSac && l.stat && !l.locked);
      if (sacUnlocked.length) {
        const postLocked = lockedCount + goodLines.filter(l => !l.locked).length;
        const gf = goodFrac(goodLines.filter(l => !l.locked).map(l => l.stat));
        const fr = estChangeEffectsRocks(sacUnlocked.map(l => ({ appear: l.appear })), gf, postLocked);
        steps.push(`Optional: Change Effects on ${sacUnlocked.map(l => `Line ${l.idx + 1}`).join(', ')} for a 3rd good line — ~${fr} rocks`);
      }
      if (!steps.length) steps.push('This piece is complete — no action needed.');
    }
    return { label: `Keep — ${goodLines.length} good line${goodLines.length > 1 ? 's' : ''} at target`, steps, cls: 'v-keep', rocks: 0 };
  }

  // ── CASE 2: At least 1 good line exists ──────────────────
  if (goodLines.length >= 1) {
    const lockNow = goodLines
      .filter(l => !l.locked && (l.atTarget || (l.tier && l.tier >= 12)))
      .sort((a, b) => b.idx - a.idx);

    const lockedAfter = lockedCount + lockNow.length;
    const lockSteps = lockNow.map(l =>
      `Lock ${lineName(l)}` +
      (l.tier >= 12 && !l.atTarget
        ? ` — T${l.tier} is rare, protect before resetting`
        : ` — at target T${l.targetTier} ✓`)
    );

    const toReset = goodBelowTgt.filter(l => !l.locked && !(l.tier && l.tier >= 12));
    const sacUnlocked = ann.filter(l => l.isSac && !l.locked);

    // ── Sub-case 2a: Good lines exist but values below target ──
    if (toReset.length > 0) {
      const optASteps = [...lockSteps];
      optASteps.push(`Reset Attributes — ${rocksPerRoll(lockedAfter)} rock${rocksPerRoll(lockedAfter) > 1 ? 's' : ''}/roll`);
      toReset.forEach(l => optASteps.push(
        `  → ${l.stat} on Line ${l.idx + 1}: needs T${l.targetTier}+ (currently T${l.tier || '?'} at ${l.val}%)`
      ));
      optASteps.push(`Lock each line immediately once it hits T${toReset[0].targetTier}+`);
      const tProb    = probHitTargetTier(toReset[0].targetTier);
      const resetRocks = estResetAttributesRocks(toReset.length, lockedAfter, tProb);
      let fishRocksA = 0;
      if (goodLines.length < 2) {
        const postResetLocked = lockedAfter + toReset.length;
        const gf = goodFrac([...lockNow.map(l => l.stat), ...toReset.map(l => l.stat)]);
        const fl = sacUnlocked.map(l => ({ appear: l.appear }));
        fishRocksA = estChangeEffectsRocks(fl, gf, postResetLocked);
        if (fl.length) optASteps.push(`Then Change Effects for a 2nd good line — ~${fishRocksA} rocks`);
      }

      const optBSteps = [...lockSteps];
      const sacrificing = [...sacUnlocked, ...toReset]
        .filter((l, i, a) => a.findIndex(x => x.idx === l.idx) === i);
      const gfB = goodFrac(lockNow.map(l => l.stat));
      const fishRocksB = estChangeEffectsRocks(sacrificing.map(l => ({ appear: l.appear })), gfB, lockedAfter);
      optBSteps.push(`Change Effects on ${sacrificing.length} unlocked line(s) — ${rocksPerRoll(lockedAfter)} rock${rocksPerRoll(lockedAfter) > 1 ? 's' : ''}/roll`);
      toReset.forEach(l => optBSteps.push(`  ⚠ Sacrificing ${l.stat} T${l.tier || '?'} on Line ${l.idx + 1}`));
      optBSteps.push(`Priority: Line 3 (30%) → Line 2 (50%) → Line 1 (100%) last`);
      optBSteps.push(`P(${goodStatNames}) per line: ${(gfB * 100).toFixed(1)}% — then random tier (avg value shown in gain)`);
      optBSteps.push(`Expected ~${fishRocksB} rocks`);

      const gainADetails = toReset.map(l => {
        const g = resetGain(l.stat, l.val, l.targetTier);
        return { stat: l.stat, gain: g };
      }).filter(x => x.gain > 0);
      const gainALabel = gainADetails.length
        ? gainADetails.map(x => `${x.stat} +${x.gain.toFixed(2)}%`).join(', ')
        : 'no effective gain';
      const poolB = remainingStatPool(new Set([...lockNow.map(l => l.stat), ...ann.filter(l => l.locked && l.stat).map(l => l.stat)]));
      const ceGainB = changeEffectsGain(nikke, poolB, lines, sacrificing);
      let gainBLabel = 'no effective gain';
      if (ceGainB.netDps > 0 || ceGainB.net > 0) {
        // Show per-stat expected gains for clarity
        const perStat = (ceGainB.gains || [])
          .filter(g => g.gain > 0)
          .map(g => `${g.stat} +${g.gain.toFixed(2)}%`);
        const lossNote = ceGainB.loss > 0 ? `, −${ceGainB.loss.toFixed(2)}% sacrificed` : '';
        if (perStat.length) {
          gainBLabel = perStat.join(' or ') + lossNote;
        } else {
          gainBLabel = `net +${ceGainB.net.toFixed(2)}%${lossNote}`;
        }
      } else if (ceGainB.gain > 0) {
        gainBLabel = `${ceGainB.stat} +${ceGainB.gain.toFixed(2)}% gain, −${ceGainB.loss.toFixed(2)}% loss`;
      }

      const gainAWeighted = gainADetails.reduce((s, x) => {
        let w = getStatDmgWeight(x.stat, nikke.name, nikke);
        if (x.stat === 'Max Ammo') {
          const otherAmmo = countAmmoLines(nikke) - 1;
          const diminish = getAmmoDiminish();
          const mult = otherAmmo < diminish.length ? diminish[Math.max(0, otherAmmo)] : diminish[diminish.length - 1];
          const weapon = nikke.weapon || 'AR';
          const baseW = (state.customWeights && state.customWeights.weapon && state.customWeights.weapon[weapon] && state.customWeights.weapon[weapon]['Max Ammo'] !== undefined)
            ? state.customWeights.weapon[weapon]['Max Ammo']
            : (STAT_DMG_WEIGHT_WEAPON[weapon] && STAT_DMG_WEIGHT_WEAPON[weapon]['Max Ammo'] !== undefined ? STAT_DMG_WEIGHT_WEAPON[weapon]['Max Ammo'] : STAT_DMG_WEIGHT_BASE['Max Ammo']);
          w = baseW * mult;
        }
        return s + x.gain * w;
      }, 0);
      const gainBDps = ceGainB.netDps > 0 ? ceGainB.netDps : 0;
      const effA = (resetRocks + fishRocksA) > 0 ? gainAWeighted / (resetRocks + fishRocksA) : 0;
      const effB = fishRocksB > 0 ? gainBDps / fishRocksB : 0;
      const recommendA = effA >= effB;

      return {
        label: goodLines.length >= 2
          ? `${goodLines.length} good lines — value(s) below target`
          : `1 good line — fix value or fish for better`,
        cls: 'v-ok',
        options: [
          { title: 'Option A — Reset Attributes to fix value(s)', steps: optASteps, rocks: resetRocks + fishRocksA, recommended: recommendA, gain: gainALabel, dpsGain: gainAWeighted },
          { title: 'Option B — Sacrifice & Change Effects',        steps: optBSteps, rocks: fishRocksB,             recommended: !recommendA, gain: gainBLabel, dpsGain: gainBDps },
        ],
      };
    }

    // ── Sub-case 2b: 1 good line at target, need a second ──
    if (goodLines.length < 2) {
      const steps = [...lockSteps];
      const fishLines = sacUnlocked
        .filter(l => !lockNow.find(lk => lk.idx === l.idx))
        .map(l => ({ appear: l.appear }));
      const gf = goodFrac(lockNow.map(l => l.stat));
      steps.push(`Change Effects on ${fishLines.length} unlocked line(s) — ${rocksPerRoll(lockedAfter)} rock${rocksPerRoll(lockedAfter) > 1 ? 's' : ''}/roll`);
      steps.push(`All passable/trash/empty lines are sacrificeable`);
      steps.push(`Priority: Line 3 (30%) → Line 2 (50%) → Line 1 (100%) last`);
      steps.push(`P(${goodStatNames}) per line: ${(gf * 100).toFixed(1)}% — then random tier (avg value shown in gain)`);
      const fishRocks = estChangeEffectsRocks(fishLines, gf, lockedAfter);
      steps.push(`Expected ~${fishRocks} rocks`);
      const poolCE = remainingStatPool(new Set([...usedStats, ...lockNow.map(l => l.stat)]));
      const sacForGain = sacUnlocked.filter(l => !lockNow.find(lk => lk.idx === l.idx));
      const ceGain = changeEffectsGain(nikke, poolCE, lines, sacForGain);
      let ceGainLabel = 'no effective gain';
      if (ceGain.net > 0 || ceGain.netDps > 0) {
        const perStat = (ceGain.gains || [])
          .filter(g => g.gain > 0)
          .map(g => `${g.stat} +${g.gain.toFixed(2)}%`);
        const lossNote = ceGain.loss > 0 ? `, −${ceGain.loss.toFixed(2)}% sacrificed` : '';
        ceGainLabel = perStat.length ? perStat.join(' or ') + lossNote : `net +${ceGain.net.toFixed(2)}%`;
      } else if (ceGain.gain > 0) {
        ceGainLabel = `${ceGain.stat} +${ceGain.gain.toFixed(2)}%`;
      }
      const existingGoodStats = new Set(goodLines.map(l => l.stat));
      const missingGoodStats = nikke.priorities
        .filter(p => (p.tier === 'Essential' || p.tier === 'Ideal') && !existingGoodStats.has(p.line) && !usedStats.has(p.line))
        .map(p => p.line);
      const targetStatLabel = missingGoodStats.length ? missingGoodStats.join('/') : goodStatNames;
      const ceGainDps = ceGain.netDps > 0 ? ceGain.netDps : (ceGain.net > 0 ? ceGain.net : 0);
      return { label: `1 good line — fish for ${targetStatLabel}`, steps, cls: 'v-ok', rocks: fishRocks, gain: ceGainLabel, dpsGain: ceGainDps };
    }
  }

  // ── CASE 3: No good lines at all ─────────────────────────
  const pool = remainingStatPool(usedStats);
  const gf   = goodStatFraction(pool, nikke);
  const fl   = ann.map(l => ({ appear: l.appear }));
  const fishRocks = estChangeEffectsRocks(fl, gf, lockedCount);
  const sacStats  = ann.filter(l => l.stat).map(l => l.stat);
  const ceGain3 = changeEffectsGain(nikke, pool, lines);
  let ceGain3Label = 'no effective gain';
  if (ceGain3.gain > 0) {
    const perStat = (ceGain3.gains || [])
      .filter(g => g.gain > 0)
      .map(g => `${g.stat} +${g.gain.toFixed(2)}%`);
    ceGain3Label = perStat.length ? perStat.join(' or ') : `${ceGain3.stat} +${ceGain3.gain.toFixed(2)}%`;
  }
  return {
    label: 'No Essential/Ideal lines — Change Effects freely',
    steps: [
      `No locks needed — ${rocksPerRoll(lockedCount)} rock/roll`,
      `Priority: Line 3 (30%) → Line 2 (50%) → Line 1 (100%) last`,
      `P(${goodStatNames}) per line: ${(gf * 100).toFixed(1)}% — then random tier (avg value shown in gain)`,
      `Expected ~${fishRocks} rocks to land a first good stat`,
      ...(sacStats.length ? [`Current lines (${sacStats.join(', ')}) — all sacrificeable`] : []),
    ],
    cls: 'v-reroll',
    rocks: fishRocks,
    gain: ceGain3Label,
    dpsGain: ceGain3.netDps > 0 ? ceGain3.netDps : (ceGain3.gain > 0 ? ceGain3.gain : 0),
  };
}
