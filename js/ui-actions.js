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
    if (state.selRaidEdit) {
        const raid = state.raids.find((r) => r.id === state.selRaidEdit);
        if (raid) renderRaidMain(raid);
    }
}

// ============================================================
//  DELETE WITH INLINE CONFIRM
//  (browser confirm() is blocked in iframes, so we use inline UI)
// ============================================================

let pendingDeleteId = null;

function requestDelete(id) {
    if (pendingDeleteId && pendingDeleteId !== id) {
        hideDeleteConfirm(pendingDeleteId);
    }
    pendingDeleteId = id;
    const el = document.getElementById("del-confirm-" + id);
    if (el) el.classList.add("show");
}

function hideDeleteConfirm(id) {
    const el = document.getElementById("del-confirm-" + id);
    if (el) el.classList.remove("show");
    if (pendingDeleteId === id) pendingDeleteId = null;
}

function doDelete(id) {
    const deleted = state.nikkes.find((n) => n.id === id);
    state.nikkes = state.nikkes.filter((n) => n.id !== id);
    if (state.selGear === id) {
        state.selGear = null;
        try {
            localStorage.removeItem("nikke_selGear");
        } catch (e) {}
    }
    if (state.selPrio === id) {
        state.selPrio = null;
        try {
            localStorage.removeItem("nikke_selPrio");
        } catch (e) {}
    }
    // Clean up custom weapon mapping if it was a custom nikke
    if (deleted && state.customWeapons && state.customWeapons[deleted.name]) {
        delete state.customWeapons[deleted.name];
    }
    pendingDeleteId = null;
    save();
    render();
}

function gearDeleteNikke(id) {
    const n = state.nikkes.find((x) => x.id === id);
    if (!n) return;
    if (!confirm(`Remove ${n.name}? All gear data will be lost.`)) return;
    doDelete(id);
}

// ── Edit custom Nikke ────────────────────────────────────────
function showEditNikke(id) {
    const el = document.getElementById("edit-inline-" + id);
    if (el) el.classList.add("show");
}

function hideEditNikke(id) {
    const el = document.getElementById("edit-inline-" + id);
    if (el) el.classList.remove("show");
}

function saveEditNikke(id) {
    const n = state.nikkes.find((x) => x.id === id);
    if (!n) return;
    const newName = document.getElementById("edit-name-" + id).value.trim();
    if (!newName) return;
    // Prevent duplicate names (allow keeping same name)
    if (newName !== n.name && state.nikkes.some((x) => x.name === newName)) {
        alert("A Nikke with that name already exists.");
        return;
    }
    const burstVal = document.getElementById("edit-burst-" + id).value;
    const element = document.getElementById("edit-element-" + id).value;
    const weapon = document.getElementById("edit-weapon-" + id).value;
    // Update custom weapon mapping
    if (state.customWeapons) {
        delete state.customWeapons[n.name];
    }
    if (!state.customWeapons) state.customWeapons = {};
    state.customWeapons[newName] = weapon;
    // Apply changes
    n.name = newName;
    n.burst1 = burstVal === "I";
    n.burst2 = burstVal === "II";
    n.burst3 = burstVal === "III";
    n.element = element;
    n.weapon = weapon;
    // User has reviewed/corrected the guessed metadata — clear the flag.
    delete n.unrecognized;
    save();
    render();
}
