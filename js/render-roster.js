// ============================================================
//  RENDER: ROSTER
// ============================================================

function renderRoster() {
    const el = document.getElementById("roster");
    const cards = [...state.nikkes]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((n) => {
            const dots = SLOTS.map((s) => `<div class="dot ${dotStatus(n, s)}" title="${s}"></div>`).join("");
            // Imported Nikkes not found in the local database are editable too,
            // so users can fix the guessed burst/element/weapon.
            const editable = n.custom || n.unrecognized;
            const editBtn = editable
                ? `<button class="edit-btn" onclick="showEditNikke('${n.id}')" title="Edit">✎</button>`
                : "";
            const badge = n.unrecognized
                ? `<span class="nikke-badge" title="Not in database — burst, element and weapon are unknown. Edit to fill them in.">not in DB</span>`
                : "";
            const burstVal = n.burst1 ? "I" : n.burst2 ? "II" : "III";
            const editForm = editable
                ? `
      <div class="edit-inline" id="edit-inline-${n.id}">
        <div class="edit-row-name">
          <input id="edit-name-${n.id}" value="${n.name}" placeholder="Name"/>
        </div>
        <div class="edit-row">
          <select id="edit-burst-${n.id}">
<option value="I"${burstVal === "I" ? " selected" : ""}>Burst I</option>
<option value="II"${burstVal === "II" ? " selected" : ""}>Burst II</option>
<option value="III"${burstVal === "III" ? " selected" : ""}>Burst III</option>
          </select>
          <select id="edit-element-${n.id}">
${NIKKE_ELEMENTS.map((e) => `<option value="${e}"${n.element === e ? " selected" : ""}>${e}</option>`).join("")}
          </select>
          <select id="edit-weapon-${n.id}">
${Object.entries(NIKKE_WEAPONS)
    .map(([c, nm]) => `<option value="${c}"${n.weapon === c ? " selected" : ""}>${nm}</option>`)
    .join("")}
          </select>
        </div>
        <div class="edit-actions">
          <button class="edit-cancel-btn" onclick="hideEditNikke('${n.id}')">Cancel</button>
          <button class="edit-save-btn" onclick="saveEditNikke('${n.id}')">Save</button>
        </div>
      </div>`
                : "";
            return `<div class="nikke-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          ${nikkeIcon(n.name, 44)}
          <div style="min-width:0"><div class="nikke-name">${n.name}</div><div class="nikke-meta">${n.element || ""} · ${burstDisplay(n)}${badge}</div></div>
        </div>
        <div style="display:flex;gap:2px">
          ${editBtn}
          <button class="del-btn" onclick="requestDelete('${n.id}')" title="Remove">✕</button>
        </div>
      </div>
      <div class="gear-dots">${dots}</div>
      <div class="del-confirm" id="del-confirm-${n.id}">
        Remove ${n.name}?
        <button class="del-confirm-yes" onclick="doDelete('${n.id}')">Yes</button>
        <button class="del-confirm-no"  onclick="hideDeleteConfirm('${n.id}')">No</button>
      </div>
      ${editForm}
    </div>`;
        })
        .join("");

    // Build options for the Nikke selector, excluding already-added ones
    const addedNames = new Set(state.nikkes.map((n) => n.name));
    const options = NIKKE_DATABASE.filter((n) => !addedNames.has(n.name))
        .map((n) => `<option value="${n.name}">${n.name} · ${n.element} · ${burstDisplay(n)}</option>`)
        .join("");

    el.innerHTML = `
    <div class="roster-grid">${cards}</div>
    <button class="add-nikke-btn" onclick="showAddForm()">+ Add Nikke</button>
    <div id="add-form" class="form-panel">
      <div class="form-panel-title">Add Nikke</div>
      <div class="form-row">
        <label class="form-label">Search &amp; Select</label>
        <input class="form-input" id="nn-search" placeholder="Type to filter..." oninput="filterNikkeList()"/>
      </div>
      <div class="form-row">
        <select id="nn-select" class="form-input" size="8" style="height:auto;overflow-y:auto">
          ${options}
        </select>
      </div>
      <div class="btn-row"><button class="btn" onclick="hideAddForm()">Cancel</button><button class="btn btn-primary" onclick="addNikke()">Add</button></div>
      <div style="border-top:1px solid #1e2535;margin-top:12px;padding-top:12px">
        <div class="form-panel-title" style="font-size:13px;color:#64748b">Or add a custom Nikke (not in DB yet)</div>
        <div class="form-row"><label class="form-label">Name</label><input class="form-input" id="nn-custom-name" placeholder="e.g. New Nikke Name"/></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div class="form-row"><label class="form-label">Burst</label><select class="form-input" id="nn-custom-burst"><option value="I">I</option><option value="II">II</option><option value="III" selected>III</option></select></div>
          <div class="form-row"><label class="form-label">Element</label><select class="form-input" id="nn-custom-element"><option value="Fire">Fire</option><option value="Water">Water</option><option value="Wind">Wind</option><option value="Electric">Electric</option><option value="Iron">Iron</option></select></div>
          <div class="form-row"><label class="form-label">Weapon</label><select class="form-input" id="nn-custom-weapon">${Object.entries(
              NIKKE_WEAPONS,
          )
              .map(([c, n]) => `<option value="${c}">${n}</option>`)
              .join("")}</select></div>
        </div>
        <div class="btn-row"><button class="btn btn-primary" onclick="addCustomNikke()">Add Custom</button></div>
      </div>
    </div>`;
}

function showAddForm() {
    const f = document.getElementById("add-form");
    if (f.classList.contains("show")) {
        f.classList.remove("show");
        return;
    }
    f.classList.add("show");
    document.getElementById("nn-search").focus();
}
function hideAddForm() {
    document.getElementById("add-form").classList.remove("show");
}

function filterNikkeList() {
    const q = document.getElementById("nn-search").value.toLowerCase();
    const sel = document.getElementById("nn-select");
    const addedNames = new Set(state.nikkes.map((n) => n.name));
    const filtered = NIKKE_DATABASE.filter((n) => !addedNames.has(n.name) && n.name.toLowerCase().includes(q));
    sel.innerHTML = filtered
        .map((n) => `<option value="${n.name}">${n.name} · ${n.element} · ${burstDisplay(n)}</option>`)
        .join("");
}

function addNikke() {
    const sel = document.getElementById("nn-select");
    const name = sel.value;
    if (!name) return;
    const entry = NIKKE_DATABASE.find((n) => n.name === name);
    if (!entry) return;
    const nikke = mkNikke(entry.name, entry.burst1, entry.burst2, entry.burst3, entry.element);
    state.nikkes.push(nikke);
    save();
    render();
}

function addCustomNikke() {
    const name = document.getElementById("nn-custom-name").value.trim();
    if (!name) return;
    // Check if name already exists in roster
    if (state.nikkes.some((n) => n.name === name)) return;
    const _burst = document.getElementById("nn-custom-burst").value;
    const element = document.getElementById("nn-custom-element").value;
    const weapon = document.getElementById("nn-custom-weapon").value;
    const nikke = mkNikke(name, _burst === "I", _burst === "II", _burst === "III", element, weapon);
    nikke.custom = true; // mark as user-created
    state.nikkes.push(nikke);
    // Persist custom weapon mappings
    if (!state.customWeapons) state.customWeapons = {};
    state.customWeapons[name] = weapon;
    save();
    render();
}
