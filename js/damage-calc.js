// ============================================================
//  DAMAGE CALCULATOR — Phase 1: Gear Multiplier Impact
//  Standalone proof-of-concept. Not tightly integrated.
//
//  Based on the nikke.gg damage formula:
//  Final Damage = Base Damage × Final ATK Mod × Major Mods
//                 × Element Bonus × Charge Damage × Damage Up × Damage Taken
//
//  Phase 1 scope: Show how overload gear lines affect the
//  multiplicative damage output (per-hit basis).
// ============================================================

const DamageCalc = (() => {

  // ---------------------------------------------------------
  //  DEFAULT ASSUMPTIONS (user can override via UI later)
  // ---------------------------------------------------------
  const DEFAULTS = {
    // Base ATK at level 400 (approximate — varies by Nikke)
    baseATK: 25000,
    // Total ATK% from non-gear sources (skills, buffs, etc.)
    baseATKPercent: 0,
    // Enemy base DEF (Solo Raid boss-tier)
    enemyDEF: 5000,
    // Enemy DEF% debuff applied
    enemyDEFPercent: 0,
    // Base crit rate (from substats, buffs, etc.) — 15% default
    baseCritRate: 0.15,
    // Base crit damage (0.5 = 50% bonus, game base)
    baseCritDmg: 0.50,
    // Whether element advantage applies (1.1 base)
    elementAdvantage: true,
    // Base charge damage tier: 0 = no charge weapon, 0.5/1.5/2.5 for SR/RL
    baseChargeDmg: 0,
    // Whether the hit lands on a core
    coreHit: true,
    // Whether full burst is active
    fullBurst: true,
  };

  // ---------------------------------------------------------
  //  FORMULA COMPONENTS
  // ---------------------------------------------------------

  /**
   * Calculate Base Damage (ATK - DEF portion)
   */
  function calcBaseDamage(opts) {
    const atk = opts.baseATK * (1 + opts.baseATKPercent + opts.gearATKPercent);
    const def = opts.enemyDEF * (1 + opts.enemyDEFPercent);
    return Math.max(1, atk - def);
  }

  /**
   * Calculate Major Modifiers multiplier
   * = 1 + CritDmg (if crit) + CoreDmg + FullBurstBonus
   */
  function calcMajorMods(opts) {
    let major = 1.0;
    // Crit damage (only if this hit crits — we'll weight by crit rate later)
    // For expected value: we compute crit and non-crit separately
    if (opts.coreHit) major += 1.0; // core hit bonus (base 1.0 for most Nikkes)
    if (opts.fullBurst) major += 0.5;
    return major;
  }

  /**
   * Expected multiplier from crit (weighted average of crit/non-crit)
   * Crit adds critDmg to major mods; we return the effective multiplier.
   */
  function calcCritExpectedMult(opts) {
    const critRate = Math.min(1, opts.baseCritRate + opts.gearCritRate);
    const critDmg = opts.baseCritDmg + opts.gearCritDmg;
    // Expected = (1 - CR) * 1 + CR * (1 + CD)  → simplified: 1 + CR * CD
    return 1 + critRate * critDmg;
  }

  /**
   * Element Bonus multiplier
   */
  function calcElementBonus(opts) {
    if (!opts.elementAdvantage) return 1.0;
    return 1.1 + opts.gearElementDmg;
  }

  /**
   * Charge Damage multiplier (SR/RL only)
   */
  function calcChargeDmg(opts) {
    if (opts.baseChargeDmg === 0) return 1.0;
    return 1 + opts.baseChargeDmg + opts.gearChargeDmg;
  }

  // ---------------------------------------------------------
  //  MAIN CALCULATION
  // ---------------------------------------------------------

  /**
   * Compute expected per-hit damage given a set of options.
   * Returns the final expected damage value (crit-weighted).
   */
  function calcExpectedHit(userOpts = {}) {
    const opts = { ...DEFAULTS, ...userOpts };

    // Fill gear contributions (default to 0 if not provided)
    opts.gearATKPercent = opts.gearATKPercent || 0;
    opts.gearCritRate = opts.gearCritRate || 0;
    opts.gearCritDmg = opts.gearCritDmg || 0;
    opts.gearElementDmg = opts.gearElementDmg || 0;
    opts.gearChargeDmg = opts.gearChargeDmg || 0;

    const baseDmg = calcBaseDamage(opts);
    const majorMods = calcMajorMods(opts);
    const critMult = calcCritExpectedMult(opts);
    const elemBonus = calcElementBonus(opts);
    const chargeDmg = calcChargeDmg(opts);

    // Final = BaseDmg × MajorMods × CritExpected × ElementBonus × ChargeDmg
    // (Damage Up and Damage Taken are team/debuff dependent — default 1.0 for gear comparison)
    return baseDmg * majorMods * critMult * elemBonus * chargeDmg;
  }

  // ---------------------------------------------------------
  //  GEAR IMPACT ANALYSIS
  //  Shows how each overload line changes damage as a %.
  // ---------------------------------------------------------

  /**
   * Given a Nikke's gear lines, compute:
   * 1. Damage WITH current gear lines
   * 2. Damage WITHOUT gear lines (baseline)
   * 3. Per-line contribution (remove one line, see % drop)
   *
   * gearLines: array of { stat: string, val: number } (val in % form, e.g. 10.4 for 10.4%)
   * context: object with weapon type, element advantage, etc.
   */
  function analyzeGearImpact(gearLines, context = {}) {
    const weapon = context.weapon || 'AR';
    const isChargeWeapon = weapon === 'SR' || weapon === 'RL';

    // Map gear lines to formula inputs
    function gearToOpts(lines) {
      const opts = {
        gearATKPercent: 0,
        gearCritRate: 0,
        gearCritDmg: 0,
        gearElementDmg: 0,
        gearChargeDmg: 0,
      };
      lines.forEach(l => {
        if (!l.stat || !l.val) return;
        const v = parseFloat(l.val) / 100; // convert 10.4% → 0.104
        switch (l.stat) {
          case 'ATK': opts.gearATKPercent += v; break;
          case 'Crit Rate':
          case 'Critical Rate': opts.gearCritRate += v; break;
          case 'Crit Dmg':
          case 'Critical Dmg':
          case 'Critical Damage': opts.gearCritDmg += v; break;
          case 'Ele Dmg':
          case 'Elemental Dmg':
          case 'Elemental Damage': opts.gearElementDmg += v; break;
          case 'Charge Dmg':
          case 'Charge Damage': opts.gearChargeDmg += v; break;
          // Max Ammo, Charge Spd, Hit Rate, DEF — no direct per-hit damage effect
        }
      });
      return opts;
    }

    const baseContext = {
      ...DEFAULTS,
      ...context,
      baseChargeDmg: isChargeWeapon ? (context.baseChargeDmg || 1.5) : 0,
    };

    // Full gear damage
    const fullOpts = { ...baseContext, ...gearToOpts(gearLines) };
    const fullDmg = calcExpectedHit(fullOpts);

    // No gear damage (baseline)
    const nakedOpts = { ...baseContext, ...gearToOpts([]) };
    const nakedDmg = calcExpectedHit(nakedOpts);

    // Total gear contribution
    const totalBoost = nakedDmg > 0 ? ((fullDmg / nakedDmg) - 1) * 100 : 0;

    // Per-line marginal contribution (what % damage drops if you remove this line)
    const perLine = gearLines.map((line, i) => {
      if (!line.stat || !line.val) return { line, index: i, contribution: 0 };
      const without = gearLines.filter((_, j) => j !== i);
      const withoutOpts = { ...baseContext, ...gearToOpts(without) };
      const withoutDmg = calcExpectedHit(withoutOpts);
      const contribution = withoutDmg > 0 ? ((fullDmg / withoutDmg) - 1) * 100 : 0;
      return { line, index: i, contribution };
    });

    return {
      nakedDmg: Math.round(nakedDmg),
      fullDmg: Math.round(fullDmg),
      totalBoostPercent: totalBoost,
      perLine,
    };
  }

  /**
   * Quick helper: "If I add this one line, how much % damage do I gain?"
   * Useful for comparing what a single overload line is worth.
   */
  function singleLineValue(stat, val, context = {}) {
    const result = analyzeGearImpact([{ stat, val }], context);
    return result.totalBoostPercent;
  }

  /**
   * Compare two gear setups side-by-side.
   * Returns % difference (positive = setupB is better).
   */
  function compareSetups(gearLinesA, gearLinesB, context = {}) {
    const a = analyzeGearImpact(gearLinesA, context);
    const b = analyzeGearImpact(gearLinesB, context);
    const diff = a.fullDmg > 0 ? ((b.fullDmg / a.fullDmg) - 1) * 100 : 0;
    return {
      setupA: a,
      setupB: b,
      diffPercent: diff,
    };
  }

  // ---------------------------------------------------------
  //  PUBLIC API
  // ---------------------------------------------------------
  return {
    DEFAULTS,
    calcExpectedHit,
    analyzeGearImpact,
    singleLineValue,
    compareSetups,
  };

})();
