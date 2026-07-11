// ============================================================
//  WISHLIST
// ============================================================

function renderWishlist() {
    const el = document.getElementById("wishlist");

    const rosterByName = {};
    for (const n of state.nikkes ?? []) rosterByName[n.name] = n;

    // Early-game gate: reaching account level 160 requires 5 SSR Nikkes at LB3.
    // Until the player owns that many, finishing limit breaks is the top priority,
    // so LB is promoted to the front of the sort order below.
    let ssrLb3Count = 0;
    for (const n of state.nikkes ?? []) {
        const dbEntry = NIKKE_DB_MAP.get(n.name);
        if (dbEntry?.rarity === "SSR" && (n.limitBreak ?? 0) >= 3) ssrLb3Count++;
    }
    const prioritizeLb = ssrLb3Count < 5;

    const pools = { Elysion: [], Missilis: [], Tetra: [], "Pilgrim/Over-spec": [] };

    for (const db of NIKKE_DATABASE) {
        if (db.rarity !== "SSR") continue;
        if (db.manufacturer === "Abnormal") continue;
        if (db.seasonal) continue;

        const roster = rosterByName[db.name];
        const cores = roster ? (roster.cores ?? 0) : 0;
        const lb = roster ? (roster.limitBreak ?? 0) : 0;
        const power = roster ? (roster.power ?? 0) : 0;

        if (cores >= 7) continue;

        const bossing = db.build?.bossing ?? null;
        const isTreasure = TREASURE_NAMES.has(db.name);

        let rawIdx = bossing ? BOSSING_ORDER.indexOf(bossing) : 999;
        if (rawIdx === -1) rawIdx = 999;
        let bossingIdx = rawIdx;
        const lbBoosted = isTreasure && lb < 2 && rawIdx < 999;
        if (lbBoosted) bossingIdx = Math.max(0, rawIdx - 1);

        const burstVal = { III: 1, All: 1 }[db.burst] ?? 0;

        const candidate = {
            name: db.name,
            bossing,
            effectiveBossing: lbBoosted ? BOSSING_ORDER[bossingIdx] : bossing,
            lbBoosted,
            isOverspec: db.overspec === true,
            burst: db.burst,
            bossingIdx,
            burstVal,
            power,
            cores,
            lb,
        };

        if (db.overspec || db.manufacturer === "Pilgrim") {
            pools["Pilgrim/Over-spec"].push(candidate);
        } else {
            pools[db.manufacturer].push(candidate);
        }
    }

    const sortFn = (a, b) => {
        // When the player still needs LB3 SSRs for the lv.160 gate, rank by LB first
        // so units closest to LB3 float to the top.
        if (prioritizeLb && b.lb !== a.lb) return b.lb - a.lb;
        if (a.bossingIdx !== b.bossingIdx) return a.bossingIdx - b.bossingIdx;
        if (b.burstVal !== a.burstVal) return b.burstVal - a.burstVal;
        return b.power - a.power;
    };

    const POOL_ORDER = ["Elysion", "Missilis", "Tetra", "Pilgrim/Over-spec"];

    const cardsHtml = POOL_ORDER.map((mfr) => {
        const picks = pools[mfr].sort(sortFn).slice(0, 5);
        const rows =
            picks.length === 0
                ? `<tr><td colspan="4" style="color:#64748b;text-align:center;padding:.75rem">No eligible Nikkes</td></tr>`
                : picks
                      .map((p, i) => {
                          const treasureBadge = p.lbBoosted
                              ? ` <span style="color:#60a5fa;font-size:11px;vertical-align:middle">★ Treasure</span>`
                              : "";
                          const lbCell = p.lb > 0 ? `${p.lb}/3` : `<span style="color:#64748b">—</span>`;
                          const coresCell = p.cores > 0 ? `${p.cores}/7` : `<span style="color:#64748b">—</span>`;
                          return `
                    <tr>
                        <td style="color:#64748b;width:1.5rem">${i + 1}</td>
                        <td><div style="display:flex;align-items:center;gap:8px;min-width:0">${nikkeIcon(p.name, 26)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">${p.name}${treasureBadge}</span></div></td>
                        <td style="color:#64748b">${lbCell}</td>
                        <td style="color:#64748b">${coresCell}</td>
                    </tr>`;
                      })
                      .join("");
        return `
            <div style="flex:1 1 380px;min-width:0;background:#0f1320;border:1px solid #1e2535;border-radius:10px;padding:0.9rem">
                <div style="font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:.6rem;padding-bottom:.45rem;border-bottom:1px solid #1e2535">${mfr}</div>
                <table class="attr-table" style="width:100%;table-layout:fixed;min-width:0">
                    <colgroup>
                        <col style="width:2rem">
                        <col>
                        <col style="width:3.5rem">
                        <col style="width:4rem">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>LB</th>
                            <th>Cores</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }).join("");

    const lb3Note = prioritizeLb
        ? `<div style="background:#1a1530;border:1px solid #3b2a5c;border-left:3px solid #bb86fc;border-radius:8px;padding:.7rem .9rem;margin-bottom:14px;font-size:13px;color:#cbd5e1;line-height:1.5">
                <span style="font-weight:600;color:#bb86fc">⚠ Early-game priority:</span> You own ${ssrLb3Count}/5 SSR Nikkes at max limit break. Breaking the 160 wall requires 5 SSRs at max limit break, so recommendations below are ranked by LB first.
           </div>`
        : "";

    el.innerHTML = `
        <div style="max-width:960px">
            <div class="team-raid-title" style="padding-left:9px;margin-bottom:12px">Wishlist Recommendations</div>
            ${lb3Note}
            <div style="display:flex;flex-wrap:wrap;gap:1.5rem">
                ${cardsHtml}
            </div>
        </div>`;
}
