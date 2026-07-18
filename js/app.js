// ============================================================
//  TAB SWITCHING & INIT
// ============================================================

function switchTab(tab, event) {
    const tabBtnOrderSwitch = ["overview", "gear", "teams", "cubes", "wishlist", "weights"];
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
    else if (tab === "teams") renderTeams();
    else if (tab === "weights") renderWeights();
    else if (tab === "cubes") renderCubes();
    else if (tab === "wishlist") renderWishlist();
    syncBottomNav(tab);
}

// ── Mobile bottom nav & "More" sheet ────────────────────────
// Keep the fixed bottom-nav highlight in sync with the active tab. Tabs that
// live behind "More" (cubes/wishlist/weights) light up the More button.
function syncBottomNav(tab) {
    const nav = document.getElementById("bottom-nav");
    if (!nav) return;
    const moreTabs = ["cubes", "wishlist", "weights"];
    nav.querySelectorAll(".bnav-item").forEach((b) => b.classList.remove("active"));
    const direct = nav.querySelector('.bnav-item[data-tab="' + tab + '"]');
    if (direct) direct.classList.add("active");
    else if (moreTabs.includes(tab)) {
        const moreBtn = document.getElementById("bnav-more-btn");
        if (moreBtn) moreBtn.classList.add("active");
    }
    document.querySelectorAll(".more-sheet-item[data-tab]").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
}

function openMoreSheet() {
    const ov = document.getElementById("more-sheet-overlay");
    if (!ov) return;
    const sheet = document.getElementById("more-sheet");
    if (sheet) sheet.style.transform = ""; // clear any leftover drag offset
    ov.style.display = "block";
    void ov.offsetWidth; // force reflow so the slide-up transition runs
    ov.classList.add("show");
}

function closeMoreSheet() {
    const ov = document.getElementById("more-sheet-overlay");
    if (!ov) return;
    const sheet = document.getElementById("more-sheet");
    if (sheet) {
        sheet.classList.remove("dragging");
        sheet.style.transform = ""; // let CSS slide it back down
    }
    ov.classList.remove("show");
    setTimeout(() => {
        if (!ov.classList.contains("show")) ov.style.display = "none";
    }, 320);
}

// Dismiss when tapping the backdrop (outside the sheet), + swipe-down to close.
(function initMoreSheet() {
    const ov = document.getElementById("more-sheet-overlay");
    const sheet = document.getElementById("more-sheet");
    if (!ov || !sheet) return;

    ov.addEventListener("click", (e) => {
        if (e.target === ov) closeMoreSheet();
    });

    let startY = 0;
    let dragging = false;
    sheet.addEventListener(
        "touchstart",
        (e) => {
            startY = e.touches[0].clientY;
            dragging = true;
            sheet.classList.add("dragging");
        },
        { passive: true },
    );
    sheet.addEventListener(
        "touchmove",
        (e) => {
            if (!dragging) return;
            const dy = e.touches[0].clientY - startY;
            sheet.style.transform = "translateY(" + Math.max(0, dy) + "px)";
        },
        { passive: true },
    );
    sheet.addEventListener("touchend", (e) => {
        if (!dragging) return;
        dragging = false;
        sheet.classList.remove("dragging");
        const dy = e.changedTouches[0].clientY - startY;
        if (dy > 90) {
            closeMoreSheet();
        } else {
            sheet.style.transform = ""; // snap back open
        }
    });
})();

// Swipe-down-to-dismiss for the mobile Nikkes-list bottom sheet. The panel is
// re-created on every sidebar render, so the drag is wired with delegated
// document-level listeners (attached once) rather than per-element handlers.
// A drag only starts from the sheet's drag zone (grab handle + title row) so it
// never fights the scrollable list below it.
(function initNikkeListSheetSwipe() {
    let sheet = null;
    let startY = 0;
    let dragging = false;

    document.addEventListener(
        "touchstart",
        (e) => {
            const zone = e.target.closest(".nikke-list-collapsible .sheet-drag-zone");
            if (!zone) return;
            sheet = zone.closest(".nikke-list-panel");
            if (!sheet) return;
            startY = e.touches[0].clientY;
            dragging = true;
            sheet.classList.add("dragging");
        },
        { passive: true },
    );
    document.addEventListener(
        "touchmove",
        (e) => {
            if (!dragging || !sheet) return;
            const dy = e.touches[0].clientY - startY;
            sheet.style.transform = "translateY(" + Math.max(0, dy) + "px)";
        },
        { passive: true },
    );
    document.addEventListener("touchend", (e) => {
        if (!dragging || !sheet) return;
        dragging = false;
        const panel = sheet;
        sheet = null;
        panel.classList.remove("dragging");
        const dy = e.changedTouches[0].clientY - startY;
        if (dy > 90) {
            // Slide the sheet the rest of the way down, then close it.
            panel.style.transform = "translateY(100%)";
            setTimeout(() => {
                closeNikkeListPopup();
                panel.style.transform = "";
            }, 240);
        } else {
            panel.style.transform = ""; // snap back open
        }
    });
})();

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

// Step to the previous (dir -1) / next (dir +1) Nikke in the sidebar's current
// sort order. Wired to the header's ◄ ► buttons (mobile). Clamps at the ends.
function gearNavNikke(dir) {
    const ordered = sortNikkesBySidebar(state.nikkes.slice());
    if (!ordered.length) return;
    let idx = ordered.findIndex((n) => n.id === state.selGear);
    if (idx === -1) idx = 0;
    const next = idx + dir;
    if (next < 0 || next >= ordered.length) return;
    state.selGear = ordered[next].id;
    try {
        localStorage.setItem("nikke_selGear", state.selGear);
    } catch (e) {}
    renderGear();
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

// ── Keyboard navigation for Nikke selection lists ───────────
// Applies to the Gear sidebar list and the Add-Nikke / Team-slot / Raid-slot
// pickers, whose items carry class "js-kbnav-item" and tabindex="0".
//   ArrowUp / ArrowDown  → move focus to the previous / next visible item
//   Tab / Shift+Tab      → same as the arrows (focus stays within the list)
//   Enter                → activate the focused item (fires its onclick)
// A list of 0–1 items lets Tab pass through natively so focus is never trapped.
document.addEventListener("keydown", function (e) {
    // From a search box (data-kbnav-list points at its list), ArrowDown moves
    // focus onto the first visible item so you can select it — combobox style.
    if (e.key === "ArrowDown" && e.target.dataset && e.target.dataset.kbnavList) {
        const list = document.querySelector(e.target.dataset.kbnavList);
        const first = list
            ? Array.from(list.querySelectorAll(".js-kbnav-item")).find((el) => el.offsetParent !== null)
            : null;
        if (first) {
            e.preventDefault();
            first.focus();
        }
        return;
    }
    const item = e.target.closest ? e.target.closest(".js-kbnav-item") : null;
    if (!item) return;
    if (e.key === "Enter") {
        e.preventDefault();
        item.click();
        return;
    }
    const forward = e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey);
    const backward = e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey);
    if (!forward && !backward) return;
    // Visible sibling items belonging to the same list container.
    const items = Array.from(item.parentElement.children).filter(
        (el) => el.classList.contains("js-kbnav-item") && el.offsetParent !== null,
    );
    if (items.length < 2) return; // nothing to move between — let Tab escape
    e.preventDefault();
    const idx = items.indexOf(item);
    const next = forward ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
    items[next].focus();
});

// If brand new (0 Nikkes), show tutorial and land on Nikkes tab
const _isNewUser = (function handleNewUser() {
    if (state.nikkes.length === 0) {
        // No data yet — always show the guide on load
        showTutorial();
        // Auto-switch to Nikkes tab
        const tabBtnOrder = ["overview", "gear", "teams", "cubes", "wishlist", "weights"];
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
        const tabBtnOrder = ["overview", "gear", "teams", "cubes", "wishlist", "weights"];
        const btnIdx = tabBtnOrder.indexOf(initTab);
        if (btnIdx >= 0) {
            document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
            document.querySelectorAll(".tab")[btnIdx].classList.add("active");
            document.getElementById(initTab).classList.add("active");
        }
    }
}

// ============================================================
//  BACKGROUND SCROLL LOCK WHILE A POPUP/MODAL IS OPEN
//  Centralised so every modal (overlays, tutorial, My Data, the mobile
//  Nikke/roster list popups) is handled without editing each open/close
//  handler. A MutationObserver watches for the class/DOM changes those
//  handlers make and toggles `html.modal-open`, which locks page scroll.
// ============================================================
function isBackgroundLocked() {
    // Full-screen overlays: locked only when actually laid out (getClientRects
    // is empty when the element — or an ancestor tab section — is display:none).
    for (const o of document.querySelectorAll(
        ".tutorial-overlay.show, .team-slot-picker-overlay.show, .more-sheet-overlay.show",
    )) {
        if (o.getClientRects().length) return true;
    }
    // Mobile list popups render their collapsible as a position:fixed modal;
    // inline (desktop) or collapsed (closed) states are static/hidden instead.
    for (const p of document.querySelectorAll(".nikke-list-collapsible, .roster-list-collapsible")) {
        if (p.getClientRects().length && getComputedStyle(p).position === "fixed") return true;
    }
    return false;
}
function syncBackgroundScrollLock() {
    // Toggled on <html> (outside the observed <body> subtree, so no feedback loop).
    document.documentElement.classList.toggle("modal-open", isBackgroundLocked());
}
let _scrollLockRaf = 0;
function scheduleScrollLockSync() {
    if (_scrollLockRaf) return;
    _scrollLockRaf = requestAnimationFrame(() => {
        _scrollLockRaf = 0;
        syncBackgroundScrollLock();
    });
}
new MutationObserver(scheduleScrollLockSync).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style"],
});
// A resize can flip a mobile popup between fixed-modal and inline (desktop).
window.addEventListener("resize", scheduleScrollLockSync);
// Initial pass — the new-user tutorial may already be open on load.
syncBackgroundScrollLock();
