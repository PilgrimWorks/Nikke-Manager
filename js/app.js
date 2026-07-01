// ============================================================
//  TAB SWITCHING & INIT
// ============================================================

function switchTab(tab, event) {
    const tabBtnOrderSwitch = ["overview", "gear", "raids", "teams", "cubes", "wishlist", "weights"];
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    if (event) {
        event.target.closest(".tab").classList.add("active");
    } else {
        const idx = tabBtnOrderSwitch.indexOf(tab);
        if (idx >= 0) document.querySelectorAll(".tab")[idx].classList.add("active");
    }
    document.getElementById(tab).classList.add("active");
    // Remember tab in query string
    const url = new URL(window.location);
    url.searchParams.set("tab", tab);
    history.replaceState(null, "", url);
    if (tab === "overview") renderOverview();
    else if (tab === "roster") renderRoster();
    else if (tab === "gear") renderGear();
    else if (tab === "raids") renderRaids();
    else if (tab === "teams") renderTeams();
    else if (tab === "weights") renderWeights();
    else if (tab === "cubes") renderCubes();
    else if (tab === "wishlist") renderWishlist();
}

function goToGearNikke(nikkeId) {
    state.selGear = nikkeId;
    _gearSubTab = "gear";
    try {
        localStorage.setItem("nikke_selGear", nikkeId);
    } catch (e) {}
    // Switch to gear tab
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".tab")[1].classList.add("active"); // Gear Tracker tab
    document.getElementById("gear").classList.add("active");
    const url = new URL(window.location);
    url.searchParams.set("tab", "gear");
    history.replaceState(null, "", url);
    renderGear();
    // Scroll back to the top so the Nikke detail screen starts at its header
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToGearSlot(nikkeId, slot) {
    state.selGear = nikkeId;
    _gearSubTab = "gear";
    try {
        localStorage.setItem("nikke_selGear", nikkeId);
    } catch (e) {}
    // Switch to gear tab `-=-= `    document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
    document.querySelectorAll(".tab")[1].classList.add("active"); // Nikkes tab
    document.getElementById("gear").classList.add("active");
    renderGear();
    // Scroll to the slot card and flash it
    setTimeout(() => {
        const cards = document.querySelectorAll(".slot-card .slot-tag");
        cards.forEach((tag) => {
            if (tag.textContent.trim().toUpperCase() === slot.toUpperCase()) {
                const card = tag.closest(".slot-card");
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.style.transition = "box-shadow 0.3s, border-color 0.3s, border-width 0.3s";
                card.style.boxShadow = "0 0 14px 4px rgba(59,130,246,0.5)";
                card.style.borderColor = "#3b82f6";
                card.style.borderWidth = "2px";
                setTimeout(() => {
                    card.style.boxShadow = "";
                    card.style.borderColor = "";
                    card.style.borderWidth = "";
                }, 1500);
            }
        });
    }, 50);
}

function render() {
    renderOverview();
    renderRoster();
    renderGear();
    renderRaids();
    renderTeams();
    renderWeights();
    renderCubes();
    renderWishlist();
}

load();
render();
preloadNikkeIcons();

// ── App version / build info ────────────────────────────────
(function renderVersion() {
    const el = document.getElementById("app-version");
    if (!el) return;
    const b = window.BUILD_INFO || {};
    const version = b.version ? "v" + b.version : "v?";
    const parts = [version];
    if (b.commit) parts.push("build " + b.commit);
    if (b.date) parts.push(b.date);
    el.textContent = parts.join(" · ");
    el.title =
        "Version " +
        (b.version || "?") +
        (b.commit ? "\nCommit: " + b.commit : "") +
        (b.date ? "\nBuild date: " + b.date : "");
})();

// ── Tutorial & New User Redirect ────────────────────────────
function showTutorial() {
    document.getElementById("tutorial-overlay").classList.add("show");
}

function dismissTutorial() {
    document.getElementById("tutorial-overlay").classList.remove("show");
    localStorage.setItem("nikke_tutorial_seen", "1");
}

// Close tutorial when clicking overlay background
document.getElementById("tutorial-overlay").addEventListener("click", function (e) {
    if (e.target === this) dismissTutorial();
});

// ── My Data Modal ───────────────────────────────────────────
function showMyData() {
    document.getElementById("mydata-overlay").classList.add("show");
    const cloudSection = document.getElementById("mydata-cloud-section");
    if (cloudSection) {
        cloudSection.style.display = currentUser ? "flex" : "none";
    }
}
function dismissMyData() {
    document.getElementById("mydata-overlay").classList.remove("show");
}

async function pullCloudData() {
    if (!currentUser) {
        alert("You must be signed in to pull cloud data.");
        return;
    }
    const cloudData = await loadFromCloud();
    if (!cloudData || !cloudData.nikkes || cloudData.nikkes.length === 0) {
        alert("No cloud data found for your account.");
        return;
    }
    if (
        !confirm(
            `Pull cloud data (${cloudData.nikkes.length} Nikkes)?\n\nThis will replace your current local data (${state.nikkes.length} Nikkes).`,
        )
    )
        return;
    Object.assign(state, cloudData);
    delete state._updatedAt;
    migrateState();
    state.selGear = state.nikkes.length ? state.nikkes[0].id : null;
    state.selRaid = state.raids.length ? state.raids[state.raids.length - 1].id : null;
    state.selRaidEdit = state.raids.length ? state.raids[state.raids.length - 1].id : null;
    try {
        localStorage.setItem("nikke_v8", JSON.stringify(state));
    } catch (e) {}
    render();
    dismissMyData();
}

async function pushToCloud() {
    if (!currentUser) {
        alert("You must be signed in to push to cloud.");
        return;
    }
    if (
        !confirm(
            `Push local data (${state.nikkes.length} Nikkes) to cloud?\n\nThis will overwrite whatever is currently stored in the cloud.`,
        )
    )
        return;
    await uploadLocalToCloud();
    dismissMyData();
}
function clearAllData() {
    const count = state.nikkes.length;
    const cloudNote = currentUser ? "\n\nThis will also wipe your synced cloud data." : "";
    if (
        !confirm(
            `⚠ Delete ALL data?\n\nThis permanently removes ${count} Nikke(s) and all their gear, raid teams, and settings. This cannot be undone.${cloudNote}\n\nConsider backing up first.`,
        )
    )
        return;
    if (!confirm("Are you absolutely sure? There is no way to recover this data.")) return;
    _intentionalWipe = true; // allow empty state to push to cloud
    state = {
        nikkes: [],
        selGear: null,
        selPrio: null,
        elementalBoss: true,
        raids: [],
        selRaid: null,
        selRaidEdit: null,
        rankSort: "efficiency",
        rankSortAsc: false,
        gearElementFilter: "",
        gearSidebarSort: "power",
        gearSidebarSortDir: "desc",
    };
    // Clear independent selection keys so stale IDs don't persist
    try {
        localStorage.removeItem("nikke_selGear");
    } catch (e) {}
    try {
        localStorage.removeItem("nikke_selPrio");
    } catch (e) {}
    save();
    render();
    dismissMyData();
}
document.getElementById("mydata-overlay").addEventListener("click", function (e) {
    if (e.target === this) dismissMyData();
});

// Drive stepper-btn pressed state via explicit class so only the
// clicked button gets the visual — CSS :active propagates to ancestors
// and can bleed onto sibling buttons after an innerHTML re-render.
document.addEventListener(
    "pointerdown",
    function (e) {
        const btn = e.target.closest(".stepper-btn");
        if (!btn || btn.disabled) return;
        btn.classList.add("stepper-pressed");
        function cleanup() {
            btn.classList.remove("stepper-pressed");
            document.removeEventListener("pointerup", cleanup, true);
            document.removeEventListener("pointercancel", cleanup, true);
        }
        document.addEventListener("pointerup", cleanup, true);
        document.addEventListener("pointercancel", cleanup, true);
    },
    true,
);

// If brand new (0 Nikkes), show tutorial and land on Nikkes tab
const _isNewUser = (function handleNewUser() {
    if (state.nikkes.length === 0) {
        // No data yet — always show the guide on load
        showTutorial();
        // Auto-switch to Nikkes tab
        const tabBtnOrder = ["overview", "gear", "raids", "teams", "cubes", "wishlist", "weights"];
        const gearIdx = tabBtnOrder.indexOf("gear");
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
        document.querySelectorAll(".tab")[gearIdx].classList.add("active");
        document.getElementById("gear").classList.add("active");
        const url = new URL(window.location);
        url.searchParams.set("tab", "gear");
        history.replaceState(null, "", url);
        return true;
    }
    return false;
})();

// Restore tab from query string (only if not redirected above)
if (!_isNewUser) {
    const initTab = new URLSearchParams(window.location.search).get("tab");
    if (initTab && document.getElementById(initTab)) {
        // Map section IDs to tab button indices (roster has no button)
        const tabBtnOrder = ["overview", "gear", "raids", "teams", "cubes", "wishlist", "weights"];
        const btnIdx = tabBtnOrder.indexOf(initTab);
        if (btnIdx >= 0) {
            document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
            document.querySelectorAll(".tab")[btnIdx].classList.add("active");
            document.getElementById(initTab).classList.add("active");
        }
    }
}
