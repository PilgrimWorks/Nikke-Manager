// ============================================================
//  STATE & PERSISTENCE
// ============================================================

let state = {
    nikkes: [],
    selGear: null,
    selPrio: null,
    elementalBoss: true,
    raids: [],
    selRaid: null,
    selRaidEdit: null,
    rankSort: "efficiency",
    rankSortAsc: false,
    skillTarget: "rec",
    gearElementFilter: "",
    gearManufacturerFilter: "",
    gearWeaponFilter: "",
    gearSidebarSort: "power",
    gearSidebarSortDir: "desc",
    // Teams tab (independent of Solo Raids / state.raids)
    teamRaids: [],
    selTeamRaid: null,
    teamRaidView: "teams",
    teamRaidGap: null,
};
