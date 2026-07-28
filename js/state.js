// ============================================================
//  STATE & PERSISTENCE
// ============================================================

let state = {
    nikkes: [],
    selGear: null,
    selPrio: null,
    elementalBoss: true,
    rankSort: "efficiency",
    rankSortAsc: false,
    skillTarget: "rec",
    gearElementFilter: "",
    gearManufacturerFilter: "",
    gearWeaponFilter: "",
    gearSidebarSort: "power",
    gearSidebarSortDir: "desc",
    // Teams tab
    teamRaids: [],
    selTeamRaid: null,
    teamRaidView: "teams",
    teamRaidGap: null,
    // Custom line priorities for Nikkes not currently owned, keyed by name.
    // Restored automatically if the Nikke is re-acquired.
    savedPriorities: {},
};
