// ============================================================
//  SKILL TARGET TOGGLE (rec / max)
// ============================================================

function setSkillTarget(val) {
    if (state.skillTarget === val) return;
    state.skillTarget = val;
    save();
    renderOverview();
    if (state.selGear) {
        const n = state.nikkes.find((x) => x.id === state.selGear);
        if (n) renderGearMain(n);
    }
    // Teams screen: skill gaps depend on the target, so refresh its gap panels
    // and tab-count badges in place (mirrors the Rec/Max toggle behaviour there).
    if (typeof refreshRosterGapPanels === "function" && state.selTeamRaid) {
        const raid = (state.teamRaids || []).find((r) => r.id === state.selTeamRaid);
        if (raid) {
            refreshRosterGapPanels(raid);
            updateRosterTabCounts(raid);
        }
    }
}
