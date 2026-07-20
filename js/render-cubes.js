// ============================================================
//  CUBES TAB
// ============================================================

function renderCubes() {
    const el = document.getElementById("cubes");
    const levels = state.cubeLevels ?? {};

    // Map cube tid → list of Nikke names using it
    const cubeUsers = {};
    state.nikkes.forEach((n) => {
        if (n.cube && n.cube.tid) {
            if (!cubeUsers[n.cube.tid]) cubeUsers[n.cube.tid] = [];
            cubeUsers[n.cube.tid].push(n.name || String(n.id));
        }
    });

    const cards = Object.entries(HARMONY_CUBES)
        .map(([tid, name]) => {
            const tidNum = parseInt(tid, 10);
            const hasLevel = levels[tid] != null;
            const level = levels[tid];
            const users = (cubeUsers[tidNum] || []).slice().sort((a, b) => a.localeCompare(b));
            const usersHtml = users.length
                ? users.map((u) => `<span class="cube-user">${u}</span>`).join(", ")
                : "Not equipped";
            const lvBadge = hasLevel ? `<span class="cube-lv-badge">Lv ${level}</span>` : "";
            const minDis = hasLevel && level <= 1 ? " disabled" : "";
            const maxDis = hasLevel && level >= 15 ? " disabled" : "";
            const foot = hasLevel
                ? `<div class="stepper">
                <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="stepCubeLevel(${tid},-1)"${minDis}>−</button>
                <input class="stepper-input" type="number" inputmode="numeric" min="1" max="15" step="1" value="${level}" onchange="updateCubeLevel(${tid},this.value)"/>
                <button type="button" class="stepper-btn" tabindex="-1" onmousedown="event.preventDefault()" onclick="stepCubeLevel(${tid},1)"${maxDis}>+</button>
              </div>
              <button class="btn-sm btn-danger" onclick="removeCubeLevel(${tid})">Remove</button>`
                : `<button class="btn-sm btn-track" onclick="addCubeLevel(${tid})">+ Track level</button>`;
            return `<div class="cube-card ${hasLevel ? "is-tracked" : "is-untracked"}">
          <div class="cube-card-head"><span class="cube-name">${name}</span>${lvBadge}</div>
          <div class="cube-users">${usersHtml}</div>
          <div class="cube-card-foot">${foot}</div>
        </div>`;
        })
        .join("");

    el.innerHTML = `
        <div class="panel-page-title">Harmony Cubes</div>
        <div class="cube-grid">${cards}</div>
    `;
}

function updateCubeLevel(tid, value) {
    if (!state.cubeLevels) state.cubeLevels = {};
    const v = parseInt(value, 10);
    if (!isNaN(v) && v >= 1) {
        state.cubeLevels[tid] = Math.min(v, 15);
    } else {
        delete state.cubeLevels[tid];
    }
    save();
    renderCubes();
}

function stepCubeLevel(tid, delta) {
    if (!state.cubeLevels) state.cubeLevels = {};
    const cur = state.cubeLevels[tid] != null ? state.cubeLevels[tid] : 1;
    state.cubeLevels[tid] = Math.max(1, Math.min(15, cur + delta));
    save();
    renderCubes();
}

function addCubeLevel(tid) {
    if (!state.cubeLevels) state.cubeLevels = {};
    state.cubeLevels[tid] = 1;
    save();
    renderCubes();
}

function removeCubeLevel(tid) {
    if (state.cubeLevels) delete state.cubeLevels[tid];
    save();
    renderCubes();
}
