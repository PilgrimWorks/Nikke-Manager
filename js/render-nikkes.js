// ============================================================
//  RENDER: GEAR TRACKER
// ============================================================

let _gearSidebarCache = "";
let _gearSidebarSearch = "";
// Whether the Nikke list is collapsed. Only has a visual effect on mobile
// (≤768px), where the list + filters render as a centered modal popup (like the
// "Add a Nikke" picker) — collapsed = popup closed. On desktop the list is
// always shown inline via CSS. Starts closed and auto-closes when a Nikke is
// selected so the detail panel takes focus on small screens.
let _nikkeListCollapsed = true;
// Whether the collapsible filter panel (Element/Burst/Manufacturer/Weapon) is
// expanded beneath the "Filters" chip. View-only; not persisted. Kept in a
// module var so it survives sidebar re-renders (which fire on every filter
// change) instead of snapping shut after each pick.
let _gearFiltersExpanded = false;
// Clear the sidebar's search + dropdown filters back to their defaults. Not
// saved — this only resets the current view (sort order is left untouched).
function resetGearFilters() {
    _gearSidebarSearch = "";
    state.gearElementFilter = "";
    state.gearBurstFilter = "";
    state.gearManufacturerFilter = "";
    state.gearWeaponFilter = "";
}
function toggleNikkeList() {
    _nikkeListCollapsed = !_nikkeListCollapsed;
    if (!_nikkeListCollapsed) {
        // Opening the popup (mobile-only) — clear filters + search so it opens
        // fresh each time. Bust the sidebar cache so the reset actually rebuilds.
        resetGearFilters();
        _gearSidebarCache = "";
        renderGear();
    }
    const sb = document.getElementById("gear-sidebar-inner");
    if (!sb) return;
    sb.classList.toggle("nikke-list-collapsed", _nikkeListCollapsed);
    const tog = sb.querySelector(".roster-list-toggle");
    if (tog) tog.setAttribute("aria-expanded", String(!_nikkeListCollapsed));
    // When the popup opens on mobile, focus the search field for quick filtering.
    if (!_nikkeListCollapsed) {
        const search = document.getElementById("nikke-sidebar-search");
        if (search) search.focus();
    }
}
// Explicit close for the mobile Nikke-list popup (backdrop tap / ✕ button).
// No-op on desktop, where the list is always shown inline.
function closeNikkeListPopup() {
    _nikkeListCollapsed = true;
    const sb = document.getElementById("gear-sidebar-inner");
    if (!sb) return;
    sb.classList.add("nikke-list-collapsed");
    const tog = sb.querySelector(".roster-list-toggle");
    if (tog) tog.setAttribute("aria-expanded", "false");
}
// Active sub-tab within a Nikke's detail panel: "gear" or "priorities"
let _gearSubTab = "gear";

function filterGearSidebarList() {
    const input = document.getElementById("nikke-sidebar-search");
    if (!input) return;
    _gearSidebarSearch = input.value.toLowerCase();
    // In-place visibility change (like sort/filter) — don't replay the dot pop.
    const listEl = document.querySelector("#gear .nikke-list");
    if (listEl) listEl.classList.add("no-dot-anim");
    applyGearSidebarFilters();
}

// Does this nikke pass the current element/burst/manufacturer/weapon filters?
function nikkePassesGearFilters(n) {
    if (!n) return false;
    if (state.gearElementFilter && n.element !== state.gearElementFilter) return false;
    if (state.gearBurstFilter) {
        const bk = { I: "burst1", II: "burst2", III: "burst3" }[state.gearBurstFilter];
        if (bk && !n[bk]) return false;
    }
    if (
        state.gearManufacturerFilter &&
        (NIKKE_DB_MAP.get(n.name) || {}).manufacturer !== state.gearManufacturerFilter
    )
        return false;
    if (
        state.gearWeaponFilter &&
        (n.weapon || (NIKKE_DB_MAP.get(n.name) || {}).weapon) !== state.gearWeaponFilter
    )
        return false;
    return true;
}

// Apply the dropdown filters + search box to the sidebar list by toggling each
// item's visibility — no re-render. Manages the "no matches" message.
function applyGearSidebarFilters() {
    const listEl = document.querySelector("#gear .nikke-list");
    if (!listEl) return;
    const search = _gearSidebarSearch || "";
    const anyFilter =
        !!state.gearElementFilter ||
        !!state.gearBurstFilter ||
        !!state.gearManufacturerFilter ||
        !!state.gearWeaponFilter;
    const byId = new Map(state.nikkes.map((n) => [String(n.id), n]));
    const items = listEl.querySelectorAll(".nikke-item");
    let anyVisible = false;
    items.forEach((el) => {
        const n = byId.get(el.dataset.id);
        let visible = n ? nikkePassesGearFilters(n) : !anyFilter;
        if (visible && search) visible = (el.dataset.name || "").includes(search);
        el.style.display = visible ? "flex" : "none";
        if (visible) anyVisible = true;
    });
    let emptyMsg = listEl.querySelector(".nikke-list-search-empty");
    if (items.length > 0 && !anyVisible) {
        if (!emptyMsg) {
            emptyMsg = document.createElement("div");
            emptyMsg.className = "nikke-list-search-empty";
            emptyMsg.style.cssText = "font-size:14px;color:#475569;padding:6px";
            listEl.appendChild(emptyMsg);
        }
        emptyMsg.textContent = "No Nikkes matching filters";
        emptyMsg.style.display = "";
    } else if (emptyMsg) {
        emptyMsg.style.display = "none";
    }
}

// Shared work for a filter change: suppress the dot pop, sync the panel's
// selects + chip/pills UI, and re-apply visibility — all without a re-render.
function applyGearFilterUpdate() {
    const listEl = document.querySelector("#gear .nikke-list");
    if (listEl) listEl.classList.add("no-dot-anim");
    syncGearFilterSelects();
    refreshGearFilterUI();
    applyGearSidebarFilters();
}

// Point the filter panel's four <select>s at the current filter state (used
// after clearing, or when a pill's ✕ resets a single filter).
function syncGearFilterSelects() {
    const set = (id, val) => {
        const s = document.getElementById(id);
        if (s) s.value = val;
    };
    set("gear-filter-element", state.gearElementFilter || "");
    set("gear-filter-burst", state.gearBurstFilter || "");
    set("gear-filter-manufacturer", state.gearManufacturerFilter || "");
    set("gear-filter-weapon", state.gearWeaponFilter || "");
}

// Rebuild the chip's active-count badge and the active-filter pills in place,
// and toggle the "Clear all" button's disabled state.
function refreshGearFilterUI() {
    const bar = document.querySelector("#gear .gear-filter-bar");
    if (!bar) return;
    const active = [];
    if (state.gearElementFilter)
        active.push({ label: state.gearElementFilter, clear: "setGearElementFilter('')" });
    if (state.gearBurstFilter)
        active.push({ label: "Burst " + state.gearBurstFilter, clear: "setGearBurstFilter('')" });
    if (state.gearManufacturerFilter)
        active.push({ label: state.gearManufacturerFilter, clear: "setGearManufacturerFilter('')" });
    if (state.gearWeaponFilter)
        active.push({ label: state.gearWeaponFilter, clear: "setGearWeaponFilter('')" });

    const chip = bar.querySelector(".gear-filter-chip");
    if (chip) chip.classList.toggle("has-active", active.length > 0);
    const chips = bar.querySelector(".gear-filter-chips");
    if (chips) {
        chips.querySelectorAll(".gear-filter-pill").forEach((p) => p.remove());
        active.forEach((f) => {
            const pill = document.createElement("span");
            pill.className = "gear-filter-pill";
            pill.innerHTML = `${f.label}<button type="button" class="gear-filter-pill-x" title="Clear filter" onclick="${f.clear}">✕</button>`;
            chips.appendChild(pill);
        });
    }
    const clearBtn = bar.querySelector(".gear-filter-clear");
    if (clearBtn) clearBtn.disabled = active.length === 0;
}

function sortNikkesBySidebar(nikkes) {
    const by = state.gearSidebarSort || "power";
    const asc = (state.gearSidebarSortDir || "desc") === "asc";
    return [...nikkes].sort((a, b) => {
        let diff = 0;
        if (by === "alpha") {
            diff = a.name.localeCompare(b.name);
            if (diff !== 0) return asc ? diff : -diff;
            return (b.power ?? -1) - (a.power ?? -1);
        } else if (by === "power") {
            diff = (a.power ?? -1) - (b.power ?? -1);
        } else if (by === "lb") {
            diff = (a.limitBreak ?? 0) + (a.cores ?? 0) - ((b.limitBreak ?? 0) + (b.cores ?? 0));
        } else if (by === "bond") {
            diff = (a.bond ?? -1) - (b.bond ?? -1);
        }
        if (diff !== 0) return asc ? diff : -diff;
        return (b.power ?? -1) - (a.power ?? -1);
    });
}

function renderGear() {
    const el = document.getElementById("gear");
    // Render ALL nikkes (sorted). The element/burst/manufacturer/weapon filters
    // and the search box are applied as show/hide via applyGearSidebarFilters(),
    // so changing a filter updates the list in place rather than rebuilding the
    // whole menu (and doesn't replay the dot pop-in animation).
    const ordered = sortNikkesBySidebar(state.nikkes.slice());
    const list =
        ordered
            .map((n) => {
                try {
                // One dot per gear slot, coloured by that slot's gear status (done/partial/warn/none)
                const dots = SLOTS.map(
                    (s) => `<span class="${dotStatus(n, s)}" title="${s}" data-slot="${s}"></span>`,
                ).join("");
                const badge = n.unrecognized
                    ? `<span class="nikke-badge" title="Not in database — burst, element and weapon are unknown. Edit in the Roster to fill them in.">not in DB</span>`
                    : "";
                return `<div class="nikke-item js-kbnav-item ${state.selGear === n.id ? "active" : ""}" data-id="${n.id}" data-name="${n.name.toLowerCase()}" tabindex="0" role="button" onclick="selGearNikke('${n.id}')" style="display:flex;align-items:center;gap:8px">
      ${nikkeIcon(n.name, 34)}<div style="min-width:0"><div>${n.name}${badge}</div><div class="nikke-item-sub" style="display:flex;align-items:center;gap:6px"><span class="gear-dots-mini">${dots}</span>${elemIcon(n.element, 14)}</div></div>
    </div>`;
                } catch (e) {
                    console.error("Error rendering nikke sidebar item:", n.name || n.id, e);
                    return `<div class="nikke-item" data-id="${n.id || ''}" data-name="${(n.name || '').toLowerCase()}" onclick="selGearNikke('${n.id || ''}')" style="display:flex;align-items:center;gap:8px;opacity:0.5">
      <div style="min-width:0"><div>${n.name || '(corrupted)'}<span class="nikke-badge" title="This Nikke has corrupted data. Try re-importing.">⚠</span></div></div>
    </div>`;
                }
            })
            .join("") ||
        `<div style="font-size:14px;color:#475569;padding:6px">No Nikkes added</div>`;

    // Build filter options from fixed game constants
    const elemOpts = NIKKE_ELEMENTS.map(
        (e) => `<option value="${e}" ${state.gearElementFilter === e ? "selected" : ""}>${e}</option>`,
    ).join("");
    const mfrOpts = NIKKE_MANUFACTURERS.map(
        (m) => `<option value="${m}" ${state.gearManufacturerFilter === m ? "selected" : ""}>${m}</option>`,
    ).join("");
    const weaponOpts = Object.keys(NIKKE_WEAPONS)
        .map((code) => `<option value="${code}" ${state.gearWeaponFilter === code ? "selected" : ""}>${code}</option>`)
        .join("");
    const sortDir = state.gearSidebarSortDir || "desc";
    const sortBy = state.gearSidebarSort || "power";

    // Active filters → pills. Each carries a label and the setter call that
    // clears just that one filter (used by the pill's ✕ button).
    const activeFilters = [];
    if (state.gearElementFilter)
        activeFilters.push({ label: state.gearElementFilter, clear: "setGearElementFilter('')" });
    if (state.gearBurstFilter)
        activeFilters.push({ label: "Burst " + state.gearBurstFilter, clear: "setGearBurstFilter('')" });
    if (state.gearManufacturerFilter)
        activeFilters.push({ label: state.gearManufacturerFilter, clear: "setGearManufacturerFilter('')" });
    if (state.gearWeaponFilter)
        activeFilters.push({ label: state.gearWeaponFilter, clear: "setGearWeaponFilter('')" });
    const activeCount = activeFilters.length;
    const pillsHtml = activeFilters
        .map(
            (f) =>
                `<span class="gear-filter-pill">${f.label}<button type="button" class="gear-filter-pill-x" title="Clear filter" onclick="${f.clear}">✕</button></span>`,
        )
        .join("");

    const filterHtml = `<div style="margin-bottom:6px">
    <input id="nikke-sidebar-search" class="form-input" placeholder="Search Nikke..." value="${_gearSidebarSearch.replace(/"/g, "&quot;")}" oninput="filterGearSidebarList()" data-kbnav-list="#gear .nikke-list" style="font-size:13px;padding:4px 8px;width:100%"/>
  </div>
  <div class="gear-filter-bar" style="margin-bottom:6px">
    <div class="gear-controls-row">
      <select id="gear-sort-select" style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;flex:1;min-width:0" onchange="setGearSidebarSort(this.value)">
        <option value="power" ${sortBy === "power" ? "selected" : ""}>Power</option>
        <option value="alpha" ${sortBy === "alpha" ? "selected" : ""}>Alphabetical</option>
        <option value="lb" ${sortBy === "lb" ? "selected" : ""}>Limit Break</option>
        <option value="bond" ${sortBy === "bond" ? "selected" : ""}>Bond</option>
      </select>
      <button id="gear-sort-dir" onclick="toggleGearSidebarSortDir()" title="Toggle sort direction" style="font-size:16px;padding:2px 7px;background:#0f1117;color:#94a3b8;border:1px solid #2d3f5e;border-radius:5px;cursor:pointer;flex-shrink:0;line-height:1;transition:color 0.1s,background 0.1s" onmouseover="this.style.background='#1a2235';this.style.color='#e2e8f0'" onmouseout="this.style.background='#0f1117';this.style.color='#94a3b8'">${sortDir === "asc" ? "↑" : "↓"}</button>
      <button type="button" class="gear-filter-chip${activeCount ? " has-active" : ""}" onclick="toggleGearFilterPanel()" aria-expanded="${_gearFiltersExpanded}" title="Filters" aria-label="Filters">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
      </button>
    </div>
    <div class="gear-filter-chips">${pillsHtml}</div>
    <div class="gear-filter-panel${_gearFiltersExpanded ? " show" : ""}">
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <div style="display:flex;flex-direction:column;gap:2px;flex:1">
          <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Element</span>
          <select id="gear-filter-element" style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearElementFilter(this.value)">
            <option value="">All</option>${elemOpts}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1">
          <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Burst</span>
          <select id="gear-filter-burst" style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearBurstFilter(this.value)">
            <option value="">All</option>
            <option value="I" ${state.gearBurstFilter === "I" ? "selected" : ""}>I</option>
            <option value="II" ${state.gearBurstFilter === "II" ? "selected" : ""}>II</option>
            <option value="III" ${state.gearBurstFilter === "III" ? "selected" : ""}>III</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <div style="display:flex;flex-direction:column;gap:2px;flex:1">
          <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Manufacturer</span>
          <select id="gear-filter-manufacturer" style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearManufacturerFilter(this.value)">
            <option value="">All</option>${mfrOpts}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1">
          <span style="font-size:11px;color:#475569;letter-spacing:0.05em;padding:0 2px">Weapon</span>
          <select id="gear-filter-weapon" style="font-size:13px;padding:3px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%" onchange="setGearWeaponFilter(this.value)">
            <option value="">All</option>${weaponOpts}
          </select>
        </div>
      </div>
      <button type="button" class="gear-filter-clear" onclick="clearGearFilters()"${activeCount ? "" : " disabled"}>Clear all filters</button>
    </div>
  </div>`;

    // Filters are no longer part of the key — they're applied as show/hide in
    // place, so a filter change never needs a full rebuild. Rebuild only when
    // the sort, per-nikke gear dots, or selection change.
    const sidebarKey = `${sortBy}|${sortDir}|${ordered.map((n) => n.id + dotStatus(n, "Helmet") + dotStatus(n, "Torso") + dotStatus(n, "Arms") + dotStatus(n, "Legs")).join(",")}|${state.selGear}`;

    if (sidebarKey !== _gearSidebarCache || !el.innerHTML) {
        _gearSidebarCache = sidebarKey;

        // Add Nikke button (opens the modal popup built below)
        const addHtml = `<button class="add-line-btn add-nikke-cta" onclick="showGearAddForm()" style="margin-top:6px;width:100%">+ Add Nikke</button>`;

        // The Nikkes list opens as a modal popup (not an inline dropdown), so the
        // button carries a "pop-out" icon + haspopup semantics rather than a
        // rotating chevron. is-popout scopes the styling away from the Teams tab's
        // roster toggle, which genuinely expands inline.
        const toggleBtn = `<button type="button" class="roster-list-toggle is-popout" onclick="toggleNikkeList()" aria-haspopup="dialog" aria-expanded="${!_nikkeListCollapsed}">
          <svg class="nikke-list-toggle-icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          <span>Nikkes</span>
          <span class="roster-list-count">${state.nikkes.length}</span>
        </button>`;
        // Mobile-only header (hidden on desktop) shown at the top of the popup.
        // On mobile the popup is a bottom sheet: the drag zone (grab handle +
        // title row) is the swipe-down-to-dismiss area (see the swipe handler in
        // app.js). Desktop hides this whole block via CSS.
        const popupHeader = `<div class="sheet-drag-zone"><div class="sheet-drag-handle" aria-hidden="true"></div><div class="nikke-list-popup-header"><span>Nikkes</span><button type="button" class="del-btn" onclick="closeNikkeListPopup()" style="font-size:16px">✕</button></div></div>`;
        // On mobile the collapsible becomes a full-screen dimmed overlay (tap the
        // backdrop to close) and the inner panel is a bottom sheet. On desktop
        // both are transparent flex columns filling the sidebar.
        const collapsibleHtml = `<div class="nikke-list-collapsible" onclick="if(event.target===this)closeNikkeListPopup()"><div class="nikke-list-panel">${popupHeader}${filterHtml}${addHtml}<div class="nikke-list">${list}</div></div></div>`;
        const sidebarEl = document.getElementById("gear-sidebar-inner");
        if (!sidebarEl) {
            el.innerHTML = `<div class="two-col">
      <div class="nikke-sidebar${_nikkeListCollapsed ? " nikke-list-collapsed" : ""}" id="gear-sidebar-inner">${toggleBtn}${collapsibleHtml}</div>
      <div id="gear-main">${state.selGear ? "" : '<div class="empty-state">← Select a Nikke</div>'}</div>
    </div>${renderGearAddOverlay()}`;
        } else {
            sidebarEl.innerHTML = toggleBtn + collapsibleHtml;
            sidebarEl.classList.toggle("nikke-list-collapsed", _nikkeListCollapsed);
        }
        // Apply the current dropdown filters + search to the freshly-built list
        // (visible items still get their pop-in on this full render / open).
        applyGearSidebarFilters();
    }

    if (state.selGear) {
        const n = state.nikkes.find((x) => x.id === state.selGear);
        if (n) renderGearMain(n);
    }
}

// Surgically refresh just the 4 gear dots for one Nikke in the sidebar list,
// without re-rendering any other list item. Used after editing gear lines.
function updateGearDots(nikke) {
    const dotsEl = document.querySelector(`#gear .nikke-item[data-id="${nikke.id}"] .gear-dots-mini`);
    if (!dotsEl) return;
    SLOTS.forEach((s) => {
        const dot = dotsEl.querySelector(`[data-slot="${s}"]`);
        if (dot) dot.className = dotStatus(nikke, s);
    });
}

function setGearBurstFilter(val) {
    state.gearBurstFilter = val;
    save();
    applyGearFilterUpdate();
}

// Toggle the collapsible filter panel open/closed. Done via a direct class
// flip (no re-render) so it feels instant; the module var keeps the state in
// sync for the next full sidebar render.
function toggleGearFilterPanel() {
    _gearFiltersExpanded = !_gearFiltersExpanded;
    const panel = document.querySelector("#gear .gear-filter-panel");
    const chip = document.querySelector("#gear .gear-filter-chip");
    if (panel) panel.classList.toggle("show", _gearFiltersExpanded);
    if (chip) chip.setAttribute("aria-expanded", String(_gearFiltersExpanded));
}

// Clear all four sidebar filters at once (the panel's "Clear all" button).
// Leaves the search box and sort order untouched.
function clearGearFilters() {
    state.gearElementFilter = "";
    state.gearBurstFilter = "";
    state.gearManufacturerFilter = "";
    state.gearWeaponFilter = "";
    save();
    applyGearFilterUpdate();
}

function setGearSidebarSort(val) {
    state.gearSidebarSort = val;
    state.gearSidebarSortDir = val === "alpha" ? "asc" : "desc";
    save();
    syncGearSortControls();
    reorderGearSidebarList();
}

function toggleGearSidebarSortDir() {
    state.gearSidebarSortDir = state.gearSidebarSortDir === "asc" ? "desc" : "asc";
    save();
    syncGearSortControls();
    reorderGearSidebarList();
}

// Keep the sort <select> value and the direction arrow in sync with state
// without rebuilding the sidebar.
function syncGearSortControls() {
    const sel = document.getElementById("gear-sort-select");
    if (sel) sel.value = state.gearSidebarSort || "power";
    const dir = document.getElementById("gear-sort-dir");
    if (dir) dir.textContent = (state.gearSidebarSortDir || "desc") === "asc" ? "↑" : "↓";
}

// Reorder the existing Nikke-list DOM nodes to match the current sort, instead
// of re-rendering the whole sidebar/menu. Moving nodes with appendChild
// preserves each item (and its search-hidden state, focus, etc.); only their
// order changes.
function reorderGearSidebarList() {
    const listEl = document.querySelector("#gear .nikke-list");
    if (!listEl) return;
    const items = Array.from(listEl.querySelectorAll(".nikke-item"));
    if (items.length < 2) return;
    // Moving nodes re-triggers the dot pop-in animation; suppress it so the
    // pop only plays when the list is opened/rendered, not on every sort. The
    // class is dropped on the next full render (fresh .nikke-list markup).
    listEl.classList.add("no-dot-anim");
    const byId = new Map(items.map((el) => [el.dataset.id, el]));
    const present = state.nikkes.filter((n) => byId.has(String(n.id)));
    sortNikkesBySidebar(present).forEach((n) => listEl.appendChild(byId.get(String(n.id))));
    // Keep the "no matches" search message (if present) at the end of the list.
    const emptyMsg = listEl.querySelector(".nikke-list-search-empty");
    if (emptyMsg) listEl.appendChild(emptyMsg);
}

// Popup picker for adding a Nikke — styled like the Teams slot picker.
function renderGearAddOverlay() {
    return `<div class="team-slot-picker-overlay" id="gear-add-overlay" onclick="if(event.target===this)hideGearAddForm()">
      <div class="team-slot-picker-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:14px;font-weight:600;color:#f1f5f9">Add a Nikke</span>
          <button class="del-btn" onclick="hideGearAddForm()" style="font-size:16px">✕</button>
        </div>
        <input class="form-input" id="gear-nn-search" placeholder="Search..." oninput="filterGearNikkeList()" data-kbnav-list="#gear-nn-list" style="margin-bottom:8px"/>
        <div id="gear-nn-list" class="team-slot-picker-list"></div>
      </div>
    </div>`;
}

function showGearAddForm() {
    const overlay = document.getElementById("gear-add-overlay");
    if (!overlay) return;
    overlay.classList.add("show");
    // Build the item list once when the popup opens; filtering afterwards only
    // toggles visibility (mirrors the main Nikke list) so icons aren't recreated.
    renderGearAddList();
    const search = document.getElementById("gear-nn-search");
    if (search) {
        search.value = "";
        search.focus();
    }
    filterGearNikkeList();
}
function hideGearAddForm() {
    const overlay = document.getElementById("gear-add-overlay");
    if (overlay) overlay.classList.remove("show");
}

// Renders every addable Nikke once. Called on open — not per keystroke.
function renderGearAddList() {
    const list = document.getElementById("gear-nn-list");
    if (!list) return;
    const addedNames = new Set(state.nikkes.map((n) => n.name));
    const available = NIKKE_DATABASE.filter((n) => !addedNames.has(n.name));
    list.innerHTML =
        available
            .map((n) => {
                const elem = n.element ? elemIcon(n.element) : "";
                const bd = burstDisplay(n);
                const burstNum = bd === "All" ? "All" : bd === "III" ? 3 : bd === "II" ? 2 : bd === "I" ? 1 : null;
                const burst = burstNum ? burstIcon(burstNum) : "";
                return `<div class="team-slot-picker-item js-kbnav-item" data-name="${n.name.toLowerCase().replace(/"/g, "&quot;")}" tabindex="0" role="button" onclick="pickGearAddNikke('${n.name.replace(/'/g, "\\'")}')">
      ${nikkeIcon(n.name, 28)}
      <span>${n.name}</span>
      <span style="display:flex;align-items:center;gap:4px;margin-left:auto">${elem} ${burst}</span>
    </div>`;
            })
            .join("") || '<div style="padding:8px;color:#475569;font-size:13px">No available Nikkes</div>';
}

// Filters the already-rendered list by toggling visibility only — no re-render.
function filterGearNikkeList() {
    const search = document.getElementById("gear-nn-search");
    const list = document.getElementById("gear-nn-list");
    if (!list) return;
    const q = search ? search.value.toLowerCase() : "";
    const items = list.querySelectorAll(".team-slot-picker-item");
    let anyVisible = false;
    items.forEach((el) => {
        const visible = (el.dataset.name || "").includes(q);
        el.style.display = visible ? "" : "none";
        if (visible) anyVisible = true;
    });
    let emptyMsg = list.querySelector(".gear-nn-search-empty");
    if (items.length > 0 && !anyVisible) {
        if (!emptyMsg) {
            emptyMsg = document.createElement("div");
            emptyMsg.className = "gear-nn-search-empty";
            emptyMsg.style.cssText = "padding:8px;color:#475569;font-size:13px";
            emptyMsg.textContent = "No matching Nikkes";
            list.appendChild(emptyMsg);
        } else {
            emptyMsg.style.display = "";
        }
    } else if (emptyMsg) {
        emptyMsg.style.display = "none";
    }
}

function pickGearAddNikke(name) {
    const entry = NIKKE_DATABASE.find((n) => n.name === name);
    if (!entry) return;
    const nikke = mkNikke(entry.name, entry.burst1, entry.burst2, entry.burst3, entry.element);
    state.nikkes.push(nikke);
    state.selGear = nikke.id;
    _nikkeListCollapsed = true; // mobile: close the list popup so the new Nikke's detail shows
    try {
        localStorage.setItem("nikke_selGear", nikke.id);
    } catch (e) {}
    hideGearAddForm();
    save();
    render();
}

function setGearElementFilter(val) {
    state.gearElementFilter = val;
    save();
    applyGearFilterUpdate();
}

function setGearManufacturerFilter(val) {
    state.gearManufacturerFilter = val;
    save();
    applyGearFilterUpdate();
}

function setGearWeaponFilter(val) {
    state.gearWeaponFilter = val;
    save();
    applyGearFilterUpdate();
}

function selGearNikke(id) {
    if (state.selGear === id) return;
    state.selGear = id;
    _nikkeListCollapsed = true; // mobile: hide the list so the picked Nikke's detail shows
    try {
        localStorage.setItem("nikke_selGear", id);
    } catch (e) {}
    const sb = document.getElementById("gear-sidebar-inner");
    if (sb) {
        sb.classList.add("nikke-list-collapsed");
        const tog = sb.querySelector(".roster-list-toggle");
        if (tog) tog.setAttribute("aria-expanded", "false");
    }
    // Just update active class without re-rendering sidebar
    document.querySelectorAll("#gear .nikke-list .nikke-item").forEach((el) => {
        const isActive = el.getAttribute("onclick")?.includes(id);
        el.classList.toggle("active", isActive);
    });
    // Only re-render the main content area
    const n = state.nikkes.find((x) => x.id === id);
    if (n) renderGearMain(n);
    // Jump to the top so the picked Nikke's detail starts at its header.
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Toggle between the "Gear" and "Priorities" sub-tabs in the Nikke detail panel.
// Just flips visibility — no re-render — so the active tab is preserved on redraw.
function switchGearSubTab(tab) {
    _gearSubTab = tab === "priorities" ? "priorities" : "gear";
    document.querySelectorAll("#gear .gear-subtab").forEach((b) => {
        b.classList.toggle("active", b.dataset.subtab === _gearSubTab);
    });
    const g = document.getElementById("gear-subtab-gear");
    const p = document.getElementById("gear-subtab-priorities");
    if (g) g.style.display = _gearSubTab === "gear" ? "" : "none";
    if (p) p.style.display = _gearSubTab === "priorities" ? "" : "none";
}

function renderGearMain(nikke) {
    const area = document.getElementById("gear-main");
    const totals = attrTotals(nikke);

    // Attribute totals — every substat currently on gear (plus any prioritised line); nothing filtered out
    const trackedStats = [
        ...new Set([...Object.keys(totals), ...nikke.priorities.filter((p) => p.line).map((p) => p.line)]),
    ];

    // Order: ideal → passable → trash/unset, then alphabetical within each group
    const attrRole = (s) => {
        const c = classifyLine(s, nikke);
        return c === "ideal" ? 0 : c === "passable" ? 1 : 2;
    };
    const sortedStats = trackedStats.slice().sort((a, b) => attrRole(a) - attrRole(b) || a.localeCompare(b));

    const attrRows = sortedStats
        .map((stat) => {
            const cls = classifyLine(stat, nikke);
            const statCls = cls === "ideal" ? "is-ideal" : cls === "passable" ? "is-passable" : "is-trash";
            const tot = totals[stat] || 0;
            // Match the priority the same way classifyLine does (handles stat-name
            // aliases like "Elemental Damage" vs "Elemental Dmg")
            const prio = nikke.priorities.find((p) => normStat(p.line) === normStat(stat));
            // Target's line count comes from the Line Priorities tab (count), not current gear
            const prioCount = prio ? parseInt(prio.count) || 1 : 0;
            const tgtTier = prio ? parseInt(prio.targetTier) || 11 : 11;
            const tgtVal = TIER_TABLE[stat] ? TIER_TABLE[stat][tgtTier - 1] : null;
            const unit = IS_PCT.has(stat) ? "%" : "";
            // Target = priority line count × value at target tier; "—" only when no priority entry
            const tgtTotal = prio && tgtVal !== null ? prioCount * tgtVal : null;

            // Status = Target − current. Not a line priority → Trash (red);
            // below target → remaining gap (yellow); at/above target → green ✓
            let statusCell, totState;
            if (!prio) {
                statusCell = `<span class="at-pill at-pill-trash">✗ Trash</span>`;
                totState = tot > 0 ? "is-trash" : "is-zero";
            } else if (tgtTotal !== null && tot >= tgtTotal) {
                statusCell = `<span class="at-pill at-pill-met">✓ Met</span>`;
                totState = "is-met";
            } else {
                const gap = (tgtTotal !== null ? tgtTotal : 0) - tot;
                statusCell = `<span class="at-pill at-pill-below">↓ ${gap.toFixed(2)}${unit}</span>`;
                totState = tot > 0 ? "is-below" : "is-zero";
            }
            const totText = tot > 0 ? tot.toFixed(2) + unit : "—";
            return `<div class="attr-chip">
      <span class="at-stat ${statCls}">${stat}</span>
      <span class="at-total ${totState}">${totText}</span>
      ${statusCell}
    </div>`;
        })
        .join("");

    const attrTable = trackedStats.length
        ? `
    <div class="attr-summary">
      <div class="attr-chips">
        ${attrRows}
      </div>
    </div>`
        : "";

    // Gear slot cards
    const slots = SLOTS.map((slot) => {
        const gear = nikke.gear[slot];
        const v = getVerdict(nikke, slot);
        const sc = scorePiece(nikke, slot);

        const badge = sc
            ? `<span style="font-size:13px;padding:2px 8px;border-radius:5px;font-weight:600;background:${v.cls === "v-keep" ? "#052e16" : v.cls === "v-ok" ? "#3f2a06" : "#3f1010"};color:${v.cls === "v-keep" ? "#4ade80" : v.cls === "v-ok" ? "#fcd34d" : "#f87171"}">${sc.good} good · ${sc.trash} trash</span>`
            : `<span style="font-size:13px;color:#334155">Not entered</span>`;

        const lineBoxes = gear.lines
            .map((line, i) => {
                const cls = line.stat ? classifyLine(line.stat, nikke) : null;
                const tier = line.stat && line.val ? getTier(line.stat, line.val) : null;
                const tb = tier ? tierBadgeInfo(tier) : null;
                const targetTier = line.stat ? getTargetTier(line.stat, nikke) : 11;
                const atTarget = line.stat && line.val ? isAtTarget(line.stat, line.val, nikke) : false;
                const aboveMin = line.stat && line.val ? isAboveMinVal(line.stat, line.val) : true;
                const prioText =
                    !cls || cls === "unset"
                        ? ""
                        : cls === "ideal"
                          ? "Ideal"
                          : cls === "passable"
                            ? "Passable"
                            : cls === "trash"
                              ? "Trash"
                              : "";
                const prioCls = prioText ? `prio-${cls}` : "";
                // A stat can't appear twice on the same piece — hide stats already used on the other lines
                const usedOnOtherLines = new Set(
                    gear.lines
                        .filter((_, li) => li !== i)
                        .map((ln) => ln.stat)
                        .filter(Boolean),
                );
                const opts = ALL_LINES.filter((l) => l === line.stat || !usedOnOtherLines.has(l))
                    .map((l) => `<option value="${l}" ${line.stat === l ? "selected" : ""}>${l}</option>`)
                    .join("");
                const unit = line.stat && IS_PCT.has(line.stat) ? "%" : "";
                const normalVal = line.val ? parseFloat(String(line.val).replace("%", "")).toFixed(2) : "";
                const tierOpts =
                    line.stat && TIER_TABLE[line.stat]
                        ? TIER_TABLE[line.stat]
                              .map((v, ti) => {
                                  const vStr = v.toFixed(2);
                                  return `<option value="${vStr}"${normalVal === vStr ? " selected" : ""}>${vStr}</option>`;
                              })
                              .join("")
                        : "";
                return `<div class="line-box" style="${line.locked ? "border-color:#166534;background:#052e16" : ""}">
        <div class="line-header">
          <span class="line-label">Line ${i + 1} - ${LINE_CHANCE_LABELS[i]}</span>
          ${prioText ? `<span class="prio-tag ${prioCls}">${prioText}</span>` : ""}
        </div>
        <div class="line-selects">
          <select onchange="updateStat('${nikke.id}','${slot}',${i},this.value)" onkeydown="gearSelectKeydown(event,'${nikke.id}','${slot}',${i})" data-gear-select="${nikke.id}-${slot}-${i}" tabindex="${i * 2 + 1}" style="flex:1;min-width:0">
<option value="">None</option>${opts}
          </select>
          <div class="line-value-row">
            <select class="value-input"
data-gear-val="${nikke.id}-${slot}-${i}"
${!line.stat ? "disabled" : ""}
tabindex="${i * 2 + 2}"
onchange="updateVal('${nikke.id}','${slot}',${i},this.value)"
style="width:64px;flex-shrink:0">
<option value="">—</option>
${tierOpts}
            </select>
            ${unit ? `<span class="value-unit">${unit}</span>` : ""}
            ${tb ? `<span class="tier-badge ${tb.cls}">${tb.label}</span>` : ""}
          </div>
        </div>
        ${line.stat && line.val && !aboveMin ? `<div class="warn-text">⚠ Below min ${MIN_VAL[line.stat]}%</div>` : ""}
        ${line.stat && line.val && aboveMin && !atTarget && isGoodLine(cls) ? `<div class="below-text">Below target T${targetTier}</div>` : ""}
        <button class="lock-btn ${line.locked ? "locked" : ""}"
          onclick="toggleLock('${nikke.id}','${slot}',${i})"
          ${!line.stat ? "disabled" : ""} tabindex="-1">
          ${line.locked ? "🔒 Locked" : "Lock"}
        </button>
      </div>`;
            })
            .join("");

        let verdictHtml = "";
        if (v) {
            // Plain numbered instruction list
            const stepList = (steps) =>
                steps && steps.length
                    ? `<div class="verdict-steps">${steps
                          .map(
                              (s, i) =>
                                  `<div class="verdict-step"><span class="step-num">${i + 1}.</span><span>${s}</span></div>`,
                          )
                          .join("")}</div>`
                    : "";
            // Damage suffix for the option rows, e.g. " · +4.4% dmg"
            const dmgTxt = (g) => (g && g > 0 ? ` · +${g.toFixed(1)}% dmg` : "");
            // Efficiency suffix, e.g. " · 0.24 dmg/rock"
            const effTxt = (rocks, g) => (rocks > 0 && g > 0 ? ` · ${(g / rocks).toFixed(2)} dmg/rock` : "");
            // Rocks + dmg estimate for the card title — no em-dash, standard weight (not bold)
            const costTxt = (rocks, g) => {
                let inner = "";
                if (rocks > 0) inner = `~${rocks} rocks${dmgTxt(g)}${effTxt(rocks, g)}`;
                else if (g && g > 0) inner = `+${g.toFixed(1)}% dmg`;
                return inner ? ` <span class="verdict-cost">${inner}</span>` : "";
            };

            if (v.options && v.options.length === 1) {
                // Single surviving option → render like a plain verdict
                const opt = v.options[0];
                const title = v.action || opt.action || v.label;
                const summary = `${title}${costTxt(opt.rocks, opt.dpsGain)}`;
                verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          ${stepList(opt.simpleSteps && opt.simpleSteps.length ? opt.simpleSteps : opt.steps)}
        </details>`;
            } else if (v.options) {
                const title = v.action || v.label;
                const rec = v.options.find((o) => o.recommended) || v.options[0];
                const summary = `${title}${costTxt(rec.rocks, rec.dpsGain)}`;
                const optionsBody = v.options
                    .map(
                        (opt) => `
<div class="verdict-option" style="${opt.recommended ? "border-left:3px solid currentColor" : ""}">
  <div class="verdict-option-title">${opt.recommended ? "★ " : ""}${opt.action || opt.title}<span class="rock-est">${opt.rocks > 0 ? `~${opt.rocks} rocks` : ""}${dmgTxt(opt.dpsGain)}${effTxt(opt.rocks, opt.dpsGain)}</span>${opt.recommended ? '<span class="recommended-badge">Recommended</span>' : ""}</div>
  ${stepList(opt.simpleSteps && opt.simpleSteps.length ? opt.simpleSteps : opt.steps)}
</div>`,
                    )
                    .join("");
                verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          ${optionsBody}
        </details>`;
            } else {
                const title = v.action || v.label;
                const simple = v.simpleSteps && v.simpleSteps.length ? v.simpleSteps : null;
                const summary = `${title}${costTxt(v.rocks, v.dpsGain)}`;
                if (!simple) {
                    // "Done" / "Keep" states: summary only, no expander
                    verdictHtml = `<div class="verdict ${v.cls} verdict-static"><span class="verdict-title">${summary}</span></div>`;
                } else {
                    verdictHtml = `<details class="verdict ${v.cls}">
          <summary class="verdict-title">${summary}</summary>
          ${stepList(simple)}
        </details>`;
                }
            }
        }

        const tierVal = gear.tier && gear.tier > 0 ? gear.tier : null;
        const lvVal = gear.lv != null ? gear.lv : 0;
        const tierLvEdit = `<div style="display:flex;align-items:center;gap:8px;margin-left:2px">
        ${fieldChipHtml({ nid: nikke.id, editor: "stepper", kind: "gear", slot, field: "tier", value: tierVal, min: 1, max: 10, compact: true, label: "Tier", valueText: chipNumText(tierVal) })}
        ${fieldChipHtml({ nid: nikke.id, editor: "stepper", kind: "gear", slot, field: "lv", value: lvVal, min: 0, max: 5, compact: true, label: "Lv", valueText: chipNumText(lvVal) })}
      </div>`;
        return `<div class="slot-card">
      <div class="slot-header"><div style="display:flex;align-items:center;gap:6px"><span class="slot-tag">${slot}</span>${tierLvEdit}</div><div style="display:flex;align-items:center;gap:6px">${badge}</div></div>
      <div class="lines-grid">${lineBoxes}</div>
      ${verdictHtml}
    </div>`;
    }).join("");

    // Editable Nikke stats: Power / Bond / Limit Break / Cores / Cube / Doll
    const db = NIKKE_DB_MAP.get(nikke.name) || {};
    const bondMax = bondMaxFor(nikke) ?? 0;
    const skillRec = db.build && db.build.skill && db.build.skill.pve ? skillTargetVals(db.build.skill.pve) : null;
    // Current-vs-target colour (skills, bond): green once current ≥ target, yellow while below.
    const targetColor = (cur, tgt) => (tgt == null ? null : (cur ?? 0) >= tgt ? "#4ade80" : "#fcd34d");
    const lbMax = db.rarity === "SSR" ? 3 : db.rarity === "SR" ? 2 : 0;
    const coresMax = db.rarity === "SSR" ? 7 : 0;
    const fieldLabelCss = "font-size:12px;color:#64748b;letter-spacing:.04em";
    const fieldInputCss =
        "font-size:14px;padding:4px 6px;background:#0f1117;color:#e2e8f0;border:1px solid #2d3f5e;border-radius:5px;width:100%";
    const trackedTids = new Set(
        Object.keys(state.cubeLevels ?? {}).filter((tid) => (state.cubeLevels ?? {})[tid] != null),
    );
    const hasUntracked = Object.keys(HARMONY_CUBES).some((tid) => !trackedTids.has(tid));
    // Recommended PVE cubes for this Nikke — used to mark options with a star and colour the field.
    const recCubes = (db.build && db.build.cube && db.build.cube.pve) || [];
    const cubeOpts = Object.entries(HARMONY_CUBES)
        .filter(([tid]) => trackedTids.has(tid))
        .map(([tid, name]) => {
            const lv = (state.cubeLevels ?? {})[tid];
            const isRec = recCubes.includes(name);
            const isSelected = nikke.cube && String(nikke.cube.tid) === tid;
            // Star recommended cubes in the dropdown, but not on the selected option — the
            // closed field mirrors its text and we want it star-free. cubeStarOn/Off (wired to
            // the select's mousedown/blur) re-adds the star to the selected option only while
            // the dropdown is open. data-rec marks which options are eligible for that.
            const star = isRec && !isSelected ? "★ " : "";
            const label = `${star}${name.replace(/ Cube$/i, "")} - Lv.${lv}`;
            return `<option value="${tid}" ${isRec ? 'data-rec="1"' : ""} ${isSelected ? "selected" : ""}>${label}</option>`;
        })
        .concat(hasUntracked ? [`<option value="__add_cube__" style="color:#60a5fa">+ Add another cube</option>`] : [])
        .join("");
    // Colour the selected cube green if it's a recommended PVE cube for this Nikke, yellow if not.
    const selCubeName = nikke.cube ? (HARMONY_CUBES[nikke.cube.tid] ?? nikke.cube.name) : null;
    const cubeColor = selCubeName ? (recCubes.includes(selCubeName) ? "#4ade80" : "#fcd34d") : null;
    const equippedDollDb = nikke.doll ? COLLECTION_DOLLS.find((d) => d.id === nikke.doll.tid) : null;
    const isTreasureDoll = equippedDollDb != null && equippedDollDb.treasure != null;
    const dollCandidates = COLLECTION_DOLLS.filter((d) => {
        if (nikke.doll && nikke.doll.tid === d.id) return true;
        if (d.treasure != null) return d.treasure === nikke.name;
        return d.weapon === db.weapon;
    });
    const dollOpts = dollCandidates
        .map(
            (d) =>
                `<option value="${d.id}" ${nikke.doll && nikke.doll.tid === d.id ? "selected" : ""}>${d.rarity}</option>`,
        )
        .join("");
    // Colour the doll rarity green when it's the highest available for this Nikke, yellow otherwise.
    const DOLL_RARITY_RANK = { R: 1, SR: 2, SSR: 3 };
    const maxDollRank = dollCandidates.reduce((m, d) => Math.max(m, DOLL_RARITY_RANK[d.rarity] ?? 0), 0);
    const dollRarityColor = equippedDollDb
        ? (DOLL_RARITY_RANK[equippedDollDb.rarity] ?? 0) >= maxDollRank
            ? "#4ade80"
            : "#fcd34d"
        : null;
    // Colour the doll level green at max (15), yellow otherwise.
    const dollLevelColor = nikke.doll && nikke.doll.lv != null ? (nikke.doll.lv >= 15 ? "#4ade80" : "#fcd34d") : null;
    // The three skill levels collapse into ONE "Skills" chip that reads
    // "10 · 10 · 10" (each level coloured by whether it meets its target); the
    // chip opens a popover with a stepper per skill.
    const skillCell = (v, tgt) => {
        const c = skillRec ? targetColor(v, tgt) : null;
        return `<span${c ? ` style="color:${c}"` : ""}>${v != null ? v : "—"}</span>`;
    };
    const skillsValueText = `${skillCell(nikke.skill1, skillRec ? skillRec.s1 : null)} · ${skillCell(nikke.skill2, skillRec ? skillRec.s2 : null)} · ${skillCell(nikke.skill3, skillRec ? skillRec.s3 : null)}`;
    // Cube chip shows the cube name plus its tracked level ("Resilience Lv5").
    const selCubeShort = selCubeName ? selCubeName.replace(/ Cube$/i, "") : "None";
    const selCubeLv = nikke.cube ? (state.cubeLevels ?? {})[nikke.cube.tid] : null;
    const cubeValueText = nikke.cube ? `${selCubeShort}${selCubeLv != null ? ` Lv${selCubeLv}` : ""}` : "None";
    // Doll chip combines rarity + level into one ("SR Lv5"); treasure dolls have
    // no level. The popover edits both.
    const dollValueText = !equippedDollDb
        ? "None"
        : isTreasureDoll
          ? `<span${dollRarityColor ? ` style="color:${dollRarityColor}"` : ""}>${equippedDollDb.rarity}</span>`
          : `<span${dollRarityColor ? ` style="color:${dollRarityColor}"` : ""}>${equippedDollDb.rarity}</span> <span${dollLevelColor ? ` style="color:${dollLevelColor}"` : ""}>Lv${nikke.doll.lv != null ? nikke.doll.lv : 0}</span>`;
    const statsPanel = `
    <div class="nikke-stats-edit" style="margin-bottom:10px">
      <div class="stats-grid-main">
        ${fieldChipHtml({ nid: nikke.id, editor: "text", field: "power", block: true, label: "Power", valueText: nikke.power != null ? Number(nikke.power).toLocaleString() : "—" })}
        ${fieldChipHtml({ nid: nikke.id, editor: "stepper", kind: "stat", field: "limitBreak", value: nikke.limitBreak, min: 0, max: lbMax, showMax: true, disabled: lbMax === 0, block: true, label: "LB", valueText: chipNumText(nikke.limitBreak, lbMax, true) })}
        ${fieldChipHtml({ nid: nikke.id, editor: "stepper", kind: "stat", field: "cores", value: nikke.cores, min: 0, max: coresMax, showMax: true, disabled: coresMax === 0, block: true, label: "Cores", valueText: chipNumText(nikke.cores, coresMax, true) })}
        <div class="chip-break chip-break-a"></div>
        ${fieldChipHtml({ nid: nikke.id, editor: "stepper", kind: "stat", field: "bond", value: nikke.bond, min: 0, max: bondMax, showMax: true, disabled: bondMax === 0, block: true, valColor: bondMax > 0 ? targetColor(nikke.bond, bondMax) : null, label: "Bond", valueText: chipNumText(nikke.bond, bondMax, true) })}
        <div class="chip-break chip-break-b"></div>
        ${fieldChipHtml({ nid: nikke.id, editor: "skills", field: "skills", block: true, label: "Skills", valueText: skillsValueText })}
        <div class="chip-break chip-break-c"></div>
        ${fieldChipHtml({ nid: nikke.id, editor: "options", optType: "cube", field: "cube", block: true, label: "Cube", valColor: cubeColor, valueText: cubeValueText })}
        ${fieldChipHtml({ nid: nikke.id, editor: "doll", optType: "doll", field: "doll", block: true, label: "Doll", valueText: dollValueText })}
      </div>
    </div>`;

    // Look up weapon / rarity / manufacturer / class from the database
    const weaponCode = nikke.weapon || db.weapon || "";
    const weaponLabel = NIKKE_WEAPONS[weaponCode] || weaponCode;
    const metaItems = [
        nikke.element ? ["Element", nikke.element] : null,
        nikke.burst1 || nikke.burst2 || nikke.burst3 ? ["Burst", burstDisplay(nikke)] : null,
        weaponLabel ? ["Weapon", weaponLabel] : null,
        db.rarity ? ["Rarity", db.rarity] : null,
        db.manufacturer ? ["Manufacturer", db.manufacturer] : null,
        db.class ? ["Class", db.class] : null,
    ].filter(Boolean);
    const metaLine = metaItems.length
        ? '<div class="nikke-hdr-meta">' +
          metaItems
              .map(
                  ([k, v]) =>
                      `<span class="meta-item"><span class="meta-label">${k}:</span><span class="meta-val">${v}</span></span>`,
              )
              .join("") +
          "</div>"
        : "";

    // Prev/next navigation between Nikkes (mobile header buttons). Order follows
    // the sidebar's current sort so flipping through matches the visible list.
    const orderedNav = sortNikkesBySidebar(state.nikkes.slice());
    const navIdx = orderedNav.findIndex((n) => n.id === nikke.id);
    const hasPrev = navIdx > 0;
    const hasNext = navIdx >= 0 && navIdx < orderedNav.length - 1;

    const hdrHtml = `
    <div class="nikke-hdr">
      <button type="button" class="nikke-nav-btn" onclick="gearNavNikke(-1)"${hasPrev ? "" : " disabled"} aria-label="Previous Nikke">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="nikke-hdr-main">
        ${nikkeIcon(nikke.name, 56)}
        <div class="nikke-hdr-text">
          <div class="nikke-hdr-name">${nikke.name}</div>
          ${metaLine}
        </div>
      </div>
      <button type="button" class="nikke-nav-btn" onclick="gearNavNikke(1)"${hasNext ? "" : " disabled"} aria-label="Next Nikke">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>`;
    // ── Damage Calculator Section ──
    // NOTE: Damage Impact card temporarily disabled. Kept renderDamageCalcPanel()
    // below (and this call, commented out) so it can be re-enabled later.
    // const dmgCalcHtml = renderDamageCalcPanel(nikke, totals);

    // ── Sub-tabs: Gear (attribute totals + slots + damage) vs Priorities ──
    const sub = _gearSubTab === "priorities" ? "priorities" : "gear";
    // Elemental-Dmg toggle sits inline at the right of the sub-tab bar to save vertical space.
    const subTabBar = `
    <div class="gear-subtab-bar">
      <button class="gear-subtab ${sub === "gear" ? "active" : ""}" data-subtab="gear" onclick="switchGearSubTab('gear')">Gear</button>
      <button class="gear-subtab ${sub === "priorities" ? "active" : ""}" data-subtab="priorities" onclick="switchGearSubTab('priorities')">Priorities</button>
      <label class="elemental-toggle" title="Include Elemental Dmg in gain and verdict calculations" style="margin-left:auto;align-self:center">
        <input type="checkbox" id="elemental-chk-gear" onchange="toggleElementalBoss(this.checked)" ${state.elementalBoss ? "checked" : ""} style="accent-color:#3b82f6"/>
        <span>Include Elemental Dmg</span>
      </label>
    </div>`;
    const gearTabHtml = attrTable + slots; // + dmgCalcHtml (Damage Impact card disabled)
    const prioTabHtml = renderPrioContent(nikke);
    const bodyHtml =
        statsPanel +
        subTabBar +
        `<div id="gear-subtab-gear"${sub === "gear" ? "" : ' style="display:none"'}>${gearTabHtml}</div>` +
        `<div id="gear-subtab-priorities"${sub === "priorities" ? "" : ' style="display:none"'}>${prioTabHtml}</div>`;
    const existingHdr = area.querySelector("[data-nikke-hdr]");
    if (!existingHdr || existingHdr.dataset.nikkeHdr !== nikke.name) {
        area.innerHTML = `<div data-nikke-hdr="${nikke.name}">${hdrHtml}</div><div id="gear-body-inner">${bodyHtml}</div>`;
    } else {
        document.getElementById("gear-body-inner").innerHTML = bodyHtml;
    }
}

// ── Editable Nikke stats (Power / Bond / Limit Break / Cores / Cube / Doll / Skills) ──
// Max bond is LB-based: (LB+1)*10 → LB0=10, LB1=20, LB2=30, LB3=40.
// Only Pilgrim / over-spec Nikkes reach 40 at LB3; everyone else caps at 30.
// R Nikkes have no bond (returns null).
function bondMaxFor(n) {
    const db = NIKKE_DB_MAP.get(n.name) || {};
    if (db.rarity === "R") return null;
    const lb = n.limitBreak != null ? n.limitBreak : 0;
    const base = (lb + 1) * 10;
    const elevated = db.manufacturer === "Pilgrim" || db.overspec === true;
    return Math.min(base, elevated ? 40 : 30);
}
function getNikkeStatMax(n, field) {
    const db = NIKKE_DB_MAP.get(n.name) || {};
    if (field === "bond") return bondMaxFor(n) ?? 0;
    if (field === "limitBreak") return db.rarity === "SSR" ? 3 : db.rarity === "SR" ? 2 : 0;
    if (field === "cores") return db.rarity === "SSR" ? 7 : 0;
    if (field === "skill1" || field === "skill2" || field === "skill3") return 10;
    return null;
}
function clampNikkeStat(n, field, num) {
    num = Math.max(0, num);
    const max = getNikkeStatMax(n, field);
    return max != null ? Math.min(max, num) : num;
}

// Builds a themed −/+ stepper (replaces the native number-input spin buttons).
// accessory=true targets a cube/doll level (field is "cube"/"doll").
// A labelled, value-showing chip. Every editable field on the Nikke screen is
// one of these; tapping it opens a popover editor (see openFieldPopover) — there
// is no inline editing. `editor` picks the popover type:
//   'stepper' → −/value/+ (numeric),  'text' → free number input,
//   'options' → a pick-list.
// opts: { nid, editor, field, slot?, index?, label, labelHtml?, valueText,
//         valColor?, disabled?, block?, compact?,
//         kind?, min?, max?, showMax?,   // stepper editor
//         optType? }                     // options editor
// Display text for a numeric chip value ("v" or "v/max"; "—" when unset).
function chipNumText(value, max, showMax) {
    const v = value != null && value !== "" ? value : "—";
    return showMax && max ? `${v}/${max}` : `${v}`;
}

function fieldChipHtml(o) {
    const cls = `field-chip${o.block ? " block" : ""}${o.compact ? " compact" : ""}${o.disabled ? " is-disabled" : ""}`;
    const valStyle = o.valColor ? ` style="color:${o.valColor}"` : "";
    const labelInner = o.labelHtml || o.label || "";
    const body = `<span class="field-chip-body"><span class="field-chip-label">${labelInner}</span><span class="field-chip-val"${valStyle}>${o.valueText}</span></span>`;
    if (o.disabled) return `<span class="${cls}">${body}</span>`;
    const disc = o.slot != null && o.slot !== "" ? o.slot : o.index != null ? o.index : "";
    const chipId = `${o.nid}:${o.editor}:${disc}:${o.field}`;
    return `<button type="button" class="${cls}" data-chip="${chipId}" data-nid="${o.nid}" data-editor="${o.editor}" data-field="${o.field}" data-slot="${o.slot || ""}" data-index="${o.index != null ? o.index : ""}" data-kind="${o.kind || ""}" data-min="${o.min != null ? o.min : ""}" data-max="${o.max != null ? o.max : ""}" data-showmax="${o.showMax ? "1" : ""}" data-opttype="${o.optType || ""}" data-label="${(o.label || "").replace(/"/g, "&quot;")}" onclick="openFieldPopover(this)">${body}</button>`;
}

// ── Field editor popover ────────────────────────────────────
// A single floating editor anchored to whichever chip was tapped. It lives on
// <body> so re-rendering the Nikke panel (which every edit does) doesn't
// destroy it; after a stepper/text change it re-anchors to the rebuilt chip.
let _fieldPopover = null;

function ensureFieldPopoverEl() {
    let pop = document.getElementById("field-popover");
    if (!pop) {
        pop = document.createElement("div");
        pop.id = "field-popover";
        pop.className = "stepper-popover";
        document.body.appendChild(pop);
    }
    return pop;
}

// Current numeric value for a stepper/text editor.
function curStepperVal(n, s) {
    if (!n) return null;
    if (s.kind === "gear") return n.gear && n.gear[s.slot] ? n.gear[s.slot][s.field] : null;
    if (s.kind === "accessory") return n[s.field] && n[s.field].lv != null ? n[s.field].lv : null;
    if (s.kind === "prio") {
        const pr = n.priorities && n.priorities[s.index];
        if (!pr) return null;
        return parseInt(pr[s.field]) || (s.field === "count" ? 1 : 11);
    }
    return n[s.field] != null ? n[s.field] : null;
}

function setStepperVal(n, s, newVal, blank) {
    const clamp = (x) => {
        let v = x;
        if (s.min != null) v = Math.max(s.min, v);
        if (s.max != null) v = Math.min(s.max, v);
        return v;
    };
    if (s.kind === "gear") {
        if (!n.gear || !n.gear[s.slot]) return;
        n.gear[s.slot][s.field] = blank ? s.min || 0 : clamp(newVal);
    } else if (s.kind === "accessory") {
        if (!n[s.field]) return;
        n[s.field].lv = blank ? 0 : clamp(newVal);
    } else if (s.kind === "prio") {
        if (!n.priorities || !n.priorities[s.index]) return;
        n.priorities[s.index][s.field] = blank ? s.min : clamp(newVal);
    } else {
        n[s.field] = blank ? null : clamp(newVal);
    }
    save();
    // Priorities feed the attribute totals, verdicts and overview, so use the
    // priorities refresh (full gear + overview re-render); everything else only
    // needs the detail panel rebuilt.
    if (s.kind === "prio") refreshGearPrio();
    else renderGearMain(n);
    syncFieldPopover();
}

// Build the option list for an 'options' editor from current state.
function fieldChipOptions(s) {
    const n = state.nikkes.find((x) => x.id === s.nid);
    if (!n) return [];
    if (s.optType === "cube") {
        const db = NIKKE_DB_MAP.get(n.name) || {};
        const recCubes = (db.build && db.build.cube && db.build.cube.pve) || [];
        const tracked = new Set(
            Object.keys(state.cubeLevels ?? {}).filter((tid) => (state.cubeLevels ?? {})[tid] != null),
        );
        const opts = [{ value: "", label: "None", selected: !n.cube }];
        Object.entries(HARMONY_CUBES)
            .filter(([tid]) => tracked.has(tid))
            .forEach(([tid, name]) => {
                const lv = (state.cubeLevels ?? {})[tid];
                const star = recCubes.includes(name) ? "★ " : "";
                opts.push({
                    value: tid,
                    label: `${star}${name.replace(/ Cube$/i, "")} - Lv.${lv}`,
                    selected: n.cube && String(n.cube.tid) === tid,
                });
            });
        if (Object.keys(HARMONY_CUBES).some((tid) => !tracked.has(tid)))
            opts.push({ value: "__add_cube__", label: "+ Add another cube" });
        return opts;
    }
    if (s.optType === "doll") {
        const db = NIKKE_DB_MAP.get(n.name) || {};
        const cands = COLLECTION_DOLLS.filter((d) => {
            if (n.doll && n.doll.tid === d.id) return true;
            if (d.treasure != null) return d.treasure === n.name;
            return d.weapon === db.weapon;
        });
        const opts = [{ value: "", label: "None", selected: !n.doll }];
        cands.forEach((d) => opts.push({ value: String(d.id), label: d.rarity, selected: n.doll && n.doll.tid === d.id }));
        return opts;
    }
    if (s.optType === "prioLine") {
        const pr = n.priorities[s.index] || {};
        const opts = [{ value: "", label: "— select —", selected: !pr.line }];
        ALL_LINES.filter((l) => !ALWAYS_TRASH.has(l)).forEach((l) =>
            opts.push({ value: l, label: l, selected: pr.line === l }),
        );
        return opts;
    }
    if (s.optType === "prioTier") {
        const pr = n.priorities[s.index] || {};
        return PRIORITY_TIERS.map((t) => ({ value: t, label: t, selected: pr.tier === t }));
    }
    return [];
}

function openFieldPopover(chipEl) {
    closeFieldPopover();
    _fieldPopover = {
        nid: chipEl.dataset.nid,
        editor: chipEl.dataset.editor,
        field: chipEl.dataset.field,
        slot: chipEl.dataset.slot || null,
        index: chipEl.dataset.index !== "" ? Number(chipEl.dataset.index) : null,
        kind: chipEl.dataset.kind || null,
        min: chipEl.dataset.min !== "" ? Number(chipEl.dataset.min) : null,
        max: chipEl.dataset.max !== "" ? Number(chipEl.dataset.max) : null,
        showMax: chipEl.dataset.showmax === "1",
        optType: chipEl.dataset.opttype || null,
        label: chipEl.dataset.label || "",
        chipId: chipEl.dataset.chip,
    };
    ensureFieldPopoverEl();
    renderFieldPopover();
    positionFieldPopover(chipEl);
    // Focus the input for the free-text editor (Power) so it's editable at once.
    const inp = document.querySelector("#field-popover input");
    if (inp && _fieldPopover.editor === "text") {
        inp.focus();
        inp.select();
    }
    // Defer the outside-click listener so the opening click doesn't close it.
    setTimeout(() => {
        document.addEventListener("mousedown", fieldPopoverOutside, true);
        document.addEventListener("touchstart", fieldPopoverOutside, true);
    }, 0);
    // Keep the popover anchored to its chip while the page scrolls/resizes.
    window.addEventListener("scroll", repositionOpenFieldPopover, true);
    window.addEventListener("resize", repositionOpenFieldPopover);
}

function repositionOpenFieldPopover() {
    const s = _fieldPopover;
    if (!s) return;
    const chip = document.querySelector(`#gear [data-chip="${s.chipId}"]`);
    if (!chip) {
        closeFieldPopover();
        return;
    }
    positionFieldPopover(chip);
}

function renderFieldPopover() {
    const s = _fieldPopover;
    if (!s) return;
    const pop = ensureFieldPopoverEl();
    const n = state.nikkes.find((x) => x.id === s.nid);
    let bodyHtml = "";
    if (s.editor === "options") {
        const opts = fieldChipOptions(s);
        bodyHtml = `<div class="field-options">${opts
            .map(
                (o) =>
                    `<button type="button" class="field-option${o.selected ? " selected" : ""}" onclick="fieldPopoverSelect('${String(o.value).replace(/'/g, "\\'")}')">${o.label}</button>`,
            )
            .join("")}</div>`;
    } else if (s.editor === "text") {
        const raw = n && n[s.field] != null ? n[s.field] : "";
        bodyHtml = `<div class="field-text-edit"><input class="stepper-input field-text-input" type="text" inputmode="numeric" value="${raw}" onchange="fieldPopoverText(this.value)"/></div>`;
    } else if (s.editor === "skills") {
        const db = n ? NIKKE_DB_MAP.get(n.name) || {} : {};
        const rec = db.build && db.build.skill && db.build.skill.pve ? skillTargetVals(db.build.skill.pve) : null;
        const scol = (cur, tgt) => (tgt == null ? null : (cur ?? 0) >= tgt ? "#4ade80" : "#fcd34d");
        const row = (i, field, tgt) => {
            const v = n && n[field] != null ? n[field] : "";
            const cur = n ? n[field] : null;
            const atMin = cur != null && cur <= 1;
            const atMax = cur != null && cur >= 10;
            const c = rec ? scol(cur, tgt) : null;
            const hint = rec
                ? ` <span class="field-chip-hint" style="color:${c || "#475569"}">· ${state.skillTarget === "rec" ? "rec" : "max"} ${tgt}</span>`
                : "";
            const cStyle = c ? ` style="color:${c};font-weight:600"` : "";
            return `<div class="skills-pop-row">
        <span class="skills-pop-label">Skill ${i}${hint}</span>
        <div class="stepper">
          <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="fieldPopoverStepField('${field}',-1)"${atMin ? " disabled" : ""}>−</button>
          <span class="stepper-valwrap"><input class="stepper-input" type="number" inputmode="numeric" min="1" max="10" step="1" value="${v}"${cStyle} onchange="fieldPopoverSetField('${field}',this.value)"/></span>
          <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="fieldPopoverStepField('${field}',1)"${atMax ? " disabled" : ""}>+</button>
        </div>
      </div>`;
        };
        const toggle = `<span class="seg-toggle skills-pop-toggle"><button class="${state.skillTarget === "rec" ? "seg-active" : ""}" onclick="fieldPopoverSetSkillTarget('rec')">Rec</button><button class="${state.skillTarget === "max" ? "seg-active" : ""}" onclick="fieldPopoverSetSkillTarget('max')">Max</button></span>`;
        bodyHtml = `<div class="skills-pop">${toggle}${row(1, "skill1", rec ? rec.s1 : null)}${row(2, "skill2", rec ? rec.s2 : null)}${row(3, "skill3", rec ? rec.s3 : null)}</div>`;
    } else if (s.editor === "doll") {
        // Combined doll editor: rarity picker + (unless a treasure doll) level stepper.
        const opts = fieldChipOptions(s);
        const rarityList = `<div class="field-options">${opts
            .map(
                (o) =>
                    `<button type="button" class="field-option${o.selected ? " selected" : ""}" onclick="fieldPopoverDollRarity('${String(o.value).replace(/'/g, "\\'")}')">${o.label}</button>`,
            )
            .join("")}</div>`;
        let lvRow = "";
        const dollObj = n && n.doll;
        const dollDb = dollObj ? COLLECTION_DOLLS.find((d) => d.id === dollObj.tid) : null;
        const isTreasure = dollDb && dollDb.treasure != null;
        if (dollObj && !isTreasure) {
            const lv = dollObj.lv != null ? dollObj.lv : 0;
            lvRow = `<div class="skills-pop-row">
        <span class="skills-pop-label">Level</span>
        <div class="stepper">
          <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="fieldPopoverDollLv(-1)"${lv <= 0 ? " disabled" : ""}>−</button>
          <span class="stepper-valwrap"><input class="stepper-input" type="number" inputmode="numeric" min="0" max="15" step="1" value="${lv}" onchange="fieldPopoverDollLvSet(this.value)"/></span>
          <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="fieldPopoverDollLv(1)"${lv >= 15 ? " disabled" : ""}>+</button>
        </div>
      </div>`;
        }
        bodyHtml = `<div class="doll-pop">${rarityList}${lvRow}</div>`;
    } else {
        const val = curStepperVal(n, s);
        const atMin = s.min != null && val != null && val <= s.min;
        const atMax = s.max != null && val != null && val >= s.max;
        const vStr = val != null ? val : "";
        const maxSuffix = s.showMax && s.max ? `<span class="stepper-max">/${s.max}</span>` : "";
        bodyHtml = `<div class="stepper${s.showMax ? " has-max" : ""}">
      <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="fieldPopoverStep(-1)"${atMin ? " disabled" : ""}>−</button>
      <span class="stepper-valwrap"><input class="stepper-input" type="number" inputmode="numeric" min="${s.min != null ? s.min : ""}" ${s.max != null ? `max="${s.max}"` : ""} step="1" value="${vStr}" onchange="fieldPopoverSetValue(this.value)"/>${maxSuffix}</span>
      <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="fieldPopoverStep(1)"${atMax ? " disabled" : ""}>+</button>
    </div>`;
    }
    pop.innerHTML = `<div class="stepper-popover-label">${s.label}</div>${bodyHtml}`;
    pop.style.display = "block";
}

function positionFieldPopover(chipEl) {
    const pop = document.getElementById("field-popover");
    if (!pop || !chipEl) return;
    const r = chipEl.getBoundingClientRect();
    pop.style.visibility = "hidden";
    pop.style.display = "block";
    const pr = pop.getBoundingClientRect();
    let left = r.left + r.width / 2 - pr.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
    let top = r.bottom + 6;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 6);
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    pop.style.visibility = "visible";
}

function syncFieldPopover() {
    const s = _fieldPopover;
    if (!s) return;
    const chip = document.querySelector(`#gear [data-chip="${s.chipId}"]`);
    if (!chip) {
        closeFieldPopover();
        return;
    }
    renderFieldPopover();
    positionFieldPopover(chip);
}

function fieldPopoverStep(delta) {
    const s = _fieldPopover;
    if (!s) return;
    const n = state.nikkes.find((x) => x.id === s.nid);
    if (!n) return;
    const cur = curStepperVal(n, s);
    setStepperVal(n, s, (cur != null ? cur : 0) + delta, false);
}

function fieldPopoverSetValue(val) {
    const s = _fieldPopover;
    if (!s) return;
    const n = state.nikkes.find((x) => x.id === s.nid);
    if (!n) return;
    const trimmed = String(val).trim();
    if (trimmed === "") {
        setStepperVal(n, s, 0, true);
        return;
    }
    let num = parseInt(trimmed.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) num = s.min != null ? s.min : 0;
    setStepperVal(n, s, num, false);
}

// Skills popover: step/set one of skill1-3 (clamped 1–10), re-render, re-sync.
function fieldPopoverStepField(field, delta) {
    const s = _fieldPopover;
    if (!s) return;
    const n = state.nikkes.find((x) => x.id === s.nid);
    if (!n) return;
    const cur = n[field] != null ? n[field] : 0;
    n[field] = Math.max(1, Math.min(10, cur + delta));
    save();
    renderGearMain(n);
    syncFieldPopover();
}

function fieldPopoverSetField(field, val) {
    const s = _fieldPopover;
    if (!s) return;
    const n = state.nikkes.find((x) => x.id === s.nid);
    if (!n) return;
    let num = parseInt(String(val).replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) num = 1;
    n[field] = Math.max(1, Math.min(10, num));
    save();
    renderGearMain(n);
    syncFieldPopover();
}

// Rec/Max toggle inside the skills popover — flips the target, re-renders, and
// re-syncs so the popover's own toggle + skill hints update in place.
function fieldPopoverSetSkillTarget(val) {
    setSkillTarget(val);
    syncFieldPopover();
}

// Combined doll popover: pick rarity, then step/set level — both keep the
// popover open (re-render + re-sync) so you can set both in one go.
function fieldPopoverDollRarity(value) {
    const s = _fieldPopover;
    if (!s) return;
    updateNikkeDoll(s.nid, value);
    syncFieldPopover();
}

function fieldPopoverDollLv(delta) {
    const s = _fieldPopover;
    if (!s) return;
    const n = state.nikkes.find((x) => x.id === s.nid);
    if (!n || !n.doll) return;
    const cur = n.doll.lv != null ? n.doll.lv : 0;
    n.doll.lv = Math.max(0, Math.min(15, cur + delta));
    save();
    renderGearMain(n);
    syncFieldPopover();
}

function fieldPopoverDollLvSet(val) {
    const s = _fieldPopover;
    if (!s) return;
    const n = state.nikkes.find((x) => x.id === s.nid);
    if (!n || !n.doll) return;
    let num = parseInt(String(val).replace(/[^0-9]/g, ""), 10);
    if (isNaN(num)) num = 0;
    n.doll.lv = Math.max(0, Math.min(15, num));
    save();
    renderGearMain(n);
    syncFieldPopover();
}

// Free number field (Power). Commits via updateNikkeStat, which re-renders.
function fieldPopoverText(val) {
    const s = _fieldPopover;
    if (!s) return;
    updateNikkeStat(s.nid, s.field, val);
    syncFieldPopover();
}

// Pick-list selection (Cube / Doll / priority Stat & Priority). The dedicated
// update fns re-render; the popover closes since the choice is complete.
function fieldPopoverSelect(value) {
    const s = _fieldPopover;
    if (!s) return;
    if (s.optType === "cube") updateNikkeCube(s.nid, value);
    else if (s.optType === "doll") updateNikkeDoll(s.nid, value);
    else if (s.optType === "prioLine") updatePrioLine(s.nid, s.index, value);
    else if (s.optType === "prioTier") updatePrioTier(s.nid, s.index, value);
    closeFieldPopover();
}

function closeFieldPopover() {
    const pop = document.getElementById("field-popover");
    if (pop) {
        pop.style.display = "none";
        pop.innerHTML = "";
    }
    _fieldPopover = null;
    document.removeEventListener("mousedown", fieldPopoverOutside, true);
    document.removeEventListener("touchstart", fieldPopoverOutside, true);
    window.removeEventListener("scroll", repositionOpenFieldPopover, true);
    window.removeEventListener("resize", repositionOpenFieldPopover);
}

function fieldPopoverOutside(e) {
    const pop = document.getElementById("field-popover");
    if (pop && !pop.contains(e.target)) closeFieldPopover();
}

function gearFieldRange(field) {
    return field === "tier" ? { min: 1, max: 10 } : { min: 0, max: 5 };
}

function stepGearField(nid, slot, field, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n.gear || !n.gear[slot]) return;
    const { min, max } = gearFieldRange(field);
    const cur = n.gear[slot][field] != null ? n.gear[slot][field] : min;
    n.gear[slot][field] = Math.max(min, Math.min(max, cur + delta));
    save();
    renderGearMain(n);
}

function updateGearField(nid, slot, field, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n.gear || !n.gear[slot]) return;
    const { min, max } = gearFieldRange(field);
    const trimmed = String(val).trim();
    if (trimmed === "") {
        // Blank clears back to the unset baseline (tier 0 = "not entered", level 0).
        n.gear[slot][field] = 0;
    } else {
        let num = parseInt(trimmed.replace(/[^0-9]/g, ""), 10);
        if (isNaN(num)) num = min;
        n.gear[slot][field] = Math.max(min, Math.min(max, num));
    }
    save();
    renderGearMain(n);
}

function updateNikkeStat(nid, field, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    const trimmed = String(val).trim();
    if (trimmed === "") {
        n[field] = null;
    } else {
        let num = parseInt(trimmed.replace(/[^0-9]/g, ""), 10);
        if (isNaN(num)) num = 0;
        n[field] = clampNikkeStat(n, field, num);
    }
    save();
    renderGearMain(n);
}

function stepNikkeStat(nid, field, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    const cur = n[field] != null ? n[field] : 0;
    n[field] = clampNikkeStat(n, field, cur + delta);
    save();
    renderGearMain(n);
}

function stepNikkeAccessoryLv(nid, which, delta) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n[which]) return;
    const cur = n[which].lv != null ? n[which].lv : 0;
    n[which].lv = Math.max(0, cur + delta);
    save();
    renderGearMain(n);
}

// Show the recommendation star on the *selected* cube only while its dropdown is open.
// mousedown fires just before the native list opens; blur restores the star-free field text.
// Only the selected option is touched, so the static stars on other recommended options stay put.
function cubeStarOn(sel) {
    const o = sel.options[sel.selectedIndex];
    if (o && o.dataset.rec === "1" && !o.textContent.startsWith("★ ")) {
        o.textContent = "★ " + o.textContent;
    }
}
function cubeStarOff(sel) {
    const o = sel.options[sel.selectedIndex];
    if (o && o.textContent.startsWith("★ ")) {
        o.textContent = o.textContent.slice(2);
    }
}

function updateNikkeCube(nid, tid) {
    if (tid === "__add_cube__") {
        switchTab("cubes", null);
        return;
    }
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    if (!tid) {
        n.cube = null;
    } else {
        const tnum = parseInt(tid, 10);
        n.cube = {
            tid: tnum,
            name: HARMONY_CUBES[tnum] ?? null,
        };
    }
    save();
    renderGearMain(n);
}

function updateNikkeDoll(nid, tid) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n) return;
    if (!tid) {
        n.doll = null;
    } else {
        const tnum = parseInt(tid, 10);
        n.doll = {
            tid: tnum,
            lv: n.doll && n.doll.lv != null ? n.doll.lv : 0,
            name: COLLECTION_DOLLS.find((d) => d.id === tnum)?.name ?? null,
        };
    }
    save();
    renderGearMain(n);
}

function updateNikkeAccessoryLv(nid, which, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    if (!n || !n[which]) return;
    let num = parseInt(String(val).replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || num < 0) num = 0;
    n[which].lv = num;
    save();
}

function updateStat(nid, slot, i, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    const line = n.gear[slot].lines[i];
    const prevStat = line.stat;
    const prevVal = line.val;
    line.stat = val;
    if (!val) {
        line.val = "";
        line.locked = false;
    } else if (prevStat && prevStat !== val && prevVal && TIER_TABLE[val]) {
        // Stat changed: keep the same tier, load that tier's % value for the new stat
        const tier = getTier(prevStat, prevVal);
        if (tier && TIER_TABLE[val][tier - 1] !== undefined) {
            line.val = TIER_TABLE[val][tier - 1].toFixed(2);
        }
    }
    save();
    renderGearMain(n);
    updateGearDots(n); // patch just this Nikke's 4 sidebar dots, nothing else in the list
    renderOverview();
    // Auto-focus the value input for this line after selecting a stat
    if (val) {
        setTimeout(() => {
            const inp = document.querySelector(`[data-gear-val="${nid}-${slot}-${i}"]`);
            if (inp && !inp.disabled) inp.focus();
        }, 0);
    }
}

function gearValKeydown(event, nid, slot, i) {
    // select onchange handles saving; nothing to intercept
}

function gearSelectKeydown(event, nid, slot, i) {
    if (event.key === "Tab") {
        event.preventDefault();
        // Jump directly to this line's value input if stat is set, otherwise next line's select
        const inp = document.querySelector(`[data-gear-val="${nid}-${slot}-${i}"]`);
        if (inp && !inp.disabled) {
            inp.focus();
        } else {
            const nextIdx = i + 1;
            if (nextIdx < 3) {
                const nextSel = document.querySelector(`[data-gear-select="${nid}-${slot}-${nextIdx}"]`);
                if (nextSel) nextSel.focus();
            }
        }
    }
}
function formatValLive(input) {
    // Strip non-digits, then auto-insert decimal before last 2 digits as user types
    let digits = input.value.replace(/[^0-9]/g, "");
    if (digits.length <= 2) {
        input.value = digits; // not enough digits yet to format
    } else {
        input.value = digits.slice(0, -2) + "." + digits.slice(-2);
    }
}

function updateVal(nid, slot, i, val) {
    const n = state.nikkes.find((x) => x.id === nid);
    n.gear[slot].lines[i].val = val.trim();
    save();
    renderGearMain(n);
    updateGearDots(n); // patch just this Nikke's 4 sidebar dots, nothing else in the list
    renderOverview();
    // Auto-focus the next line's stat select (if there is one and it's empty)
    const nextIdx = i + 1;
    if (nextIdx < 3 && val.trim()) {
        setTimeout(() => {
            const sel = document.querySelector(`[data-gear-select="${nid}-${slot}-${nextIdx}"]`);
            if (sel && !sel.value) sel.focus();
        }, 0);
    }
}
function toggleLock(nid, slot, i) {
    const n = state.nikkes.find((x) => x.id === nid);
    const l = n.gear[slot].lines[i];
    if (!l.stat) return;
    l.locked = !l.locked;
    save();
    renderGearMain(n);
    updateGearDots(n); // patch just this Nikke's 4 sidebar dots, nothing else in the list
}

// ============================================================
//  DAMAGE CALCULATOR PANEL — per-Nikke gear impact display
// ============================================================

function renderDamageCalcPanel(nikke, totals) {
    const db = NIKKE_DB_MAP.get(nikke.name) || {};
    const weapon = nikke.weapon || db.weapon || "AR";
    const isChargeWeapon = weapon === "SR" || weapon === "RL";
    const hasElement = state.elementalBoss;

    // Gather all gear lines across all 4 slots
    const allGearLines = [];
    SLOTS.forEach((slot) => {
        nikke.gear[slot].lines.forEach((l) => {
            if (l.stat && l.val) {
                allGearLines.push({ stat: l.stat, val: parseFloat(l.val) || 0, slot });
            }
        });
    });

    // If no gear lines at all, show minimal placeholder
    if (allGearLines.length === 0) {
        return `
        <div class="dmg-calc-panel" style="margin-top:16px;background:#0f1320;border:1px solid #1e2535;border-radius:8px;padding:14px 16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:14px;font-weight:600;color:#bb86fc">⚡ Damage Impact</span>
            <span style="font-size:11px;color:#475569;background:#1a2235;padding:2px 6px;border-radius:4px">Phase 1 — Gear Multipliers</span>
          </div>
          <div style="font-size:13px;color:#475569">Add gear lines to see their damage impact.</div>
        </div>`;
    }

    // Build context for this Nikke
    const context = {
        weapon,
        elementAdvantage: hasElement,
        baseChargeDmg: isChargeWeapon ? 1.5 : 0,
        // Use defaults for base stats (Phase 1 — we don't have per-Nikke ATK yet)
        baseATK: 25000,
        enemyDEF: 5000,
        baseCritRate: 0.15,
        baseCritDmg: 0.5,
        coreHit: true,
        fullBurst: true,
    };

    const result = DamageCalc.analyzeGearImpact(allGearLines, context);

    // Build per-line rows sorted by contribution (highest first)
    const sorted = [...result.perLine]
        .filter((p) => p.contribution > 0)
        .sort((a, b) => b.contribution - a.contribution);

    const lineRows = sorted
        .map((p) => {
            const pct = p.contribution.toFixed(2);
            const barWidth = Math.min(100, (p.contribution / (result.totalBoostPercent || 1)) * 100);
            const statColor = getStatColor(p.line.stat);
            return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px">
            <span style="width:120px;color:${statColor};font-weight:500;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.line.stat}</span>
            <span style="width:50px;color:#94a3b8;flex-shrink:0;text-align:right">${p.line.val}%</span>
            <div style="flex:1;height:6px;background:#1a2235;border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${barWidth}%;background:${statColor};border-radius:3px;transition:width 0.2s"></div>
            </div>
            <span style="width:60px;text-align:right;color:#64ffda;font-weight:600;flex-shrink:0">+${pct}%</span>
        </div>`;
        })
        .join("");

    // Non-damage lines (Max Ammo, Charge Speed, Hit Rate, DEF)
    const nonDmgLines = allGearLines.filter((l) => {
        const s = l.stat;
        return s === "Max Ammo" || s === "Charge Speed" || s === "Hit Rate" || s === "DEF";
    });
    const nonDmgNote = nonDmgLines.length
        ? `<div style="font-size:11px;color:#475569;margin-top:6px">${nonDmgLines.length} line(s) not shown (${[...new Set(nonDmgLines.map((l) => l.stat))].join(", ")}) — no direct per-hit damage effect.</div>`
        : "";

    return `
    <div class="dmg-calc-panel" style="margin-top:16px;background:#0f1320;border:1px solid #1e2535;border-radius:8px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:#bb86fc">⚡ Damage Impact</span>
        <span style="font-size:11px;color:#475569;background:#1a2235;padding:2px 6px;border-radius:4px">Phase 1 — Gear Multipliers</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">Base Damage</div>
          <div style="font-size:16px;font-weight:600;color:#e2e8f0">${result.nakedDmg.toLocaleString()}</div>
        </div>
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">With Gear</div>
          <div style="font-size:16px;font-weight:600;color:#e2e8f0">${result.fullDmg.toLocaleString()}</div>
        </div>
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">Difference</div>
          <div style="font-size:16px;font-weight:600;color:#64ffda">+${(result.fullDmg - result.nakedDmg).toLocaleString()}</div>
        </div>
        <div style="background:#1a2235;border-radius:6px;padding:8px 10px">
          <div style="font-size:11px;color:#64748b;margin-bottom:2px">Boost</div>
          <div style="font-size:16px;font-weight:600;color:#64ffda">+${result.totalBoostPercent.toFixed(2)}%</div>
        </div>
      </div>
      <div style="margin-bottom:4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Per-line marginal contribution</div>
      ${lineRows}
      ${nonDmgNote}
      <div style="margin-top:10px;font-size:11px;color:#334155;border-top:1px solid #1e2535;padding-top:8px">
        Assumes: ${hasElement ? "Element advantage" : "No element"} · Core hit · Full burst · Base ATK 25k · DEF 5k · 15% CR / 50% CD${isChargeWeapon ? " · Charge weapon (1.5× base)" : ""}
      </div>
    </div>`;
}

function getStatColor(stat) {
    switch (stat) {
        case "ATK":
            return "#f87171";
        case "Elemental Dmg":
        case "Elemental Damage":
            return "#60a5fa";
        case "Critical Rate":
            return "#fbbf24";
        case "Critical Dmg":
        case "Critical Damage":
            return "#fb923c";
        case "Charge Dmg":
        case "Charge Damage":
            return "#a78bfa";
        default:
            return "#94a3b8";
    }
}
