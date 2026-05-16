"use strict";

/* ===========================================================
   Chrono — circuits d'exercice
   Modèle :
     circuit = { name, groups: [ group ] }
     group   = { id, name, repeat, steps: [ step ] }
     step    = { id, type:'exercise'|'pause', name, sec }
   =========================================================== */

const LS_SAVED = "chrono.circuits.v1"; // dictionnaire { nom: circuit }
const LS_DRAFT = "chrono.draft.v1";    // circuit en cours d'édition

const uid = () => Math.random().toString(36).slice(2, 9);

function newStep(type = "exercise") {
  return {
    id: uid(),
    type,
    name: type === "pause" ? "Pause" : "Exercice",
    sec: type === "pause" ? 30 : 45,
  };
}

function newGroup() {
  return { id: uid(), name: "Ensemble", repeat: 1, steps: [newStep("exercise"), newStep("pause")] };
}

function emptyCircuit() {
  return { name: "", groups: [newGroup()] };
}

let circuit = loadDraft() || emptyCircuit();

/* ---------------- Helpers DOM ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const fmt = (totalSec) => {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

/* ===========================================================
   ÉDITEUR
   =========================================================== */
const groupsEl = $("#groups");
const stepTpl = $("#stepTpl");

function totalSeconds() {
  return circuit.groups.reduce((acc, g) => {
    const gSec = g.steps.reduce((a, s) => a + (s.sec || 0), 0);
    return acc + gSec * Math.max(1, g.repeat || 1);
  }, 0);
}

function render() {
  $("#circuitName").value = circuit.name;
  $("#totalTime").textContent = `Durée totale : ${fmt(totalSeconds())}`;
  groupsEl.innerHTML = "";

  circuit.groups.forEach((group, gi) => {
    const groupEl = document.createElement("div");
    groupEl.className = "group";
    groupEl.dataset.gid = group.id;
    groupEl.innerHTML = `
      <div class="group-head">
        <input class="group-name" type="text" value="" placeholder="Nom de l'ensemble" />
        <label class="repeat">× <input class="group-repeat" type="number" min="1" max="99" value="${group.repeat}" /> tours</label>
        <div class="group-head-actions">
          <button class="icon g-up" title="Monter l'ensemble">↑</button>
          <button class="icon g-down" title="Descendre l'ensemble">↓</button>
          <button class="icon g-dup" title="Dupliquer l'ensemble">⧉</button>
          <button class="icon g-del" title="Supprimer l'ensemble">🗑</button>
        </div>
      </div>
      <div class="steps"></div>
      <div style="padding:10px 14px;">
        <button class="btn btn-secondary g-addstep">+ Ajouter une étape</button>
      </div>`;
    groupEl.querySelector(".group-name").value = group.name;

    const stepsEl = groupEl.querySelector(".steps");
    group.steps.forEach((step) => {
      const node = stepTpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = step.id;
      node.dataset.type = step.type;
      node.querySelector(".step-type").value = step.type;
      node.querySelector(".step-name-input").value = step.name;
      node.querySelector(".step-min").value = Math.floor(step.sec / 60);
      node.querySelector(".step-sec").value = step.sec % 60;
      stepsEl.appendChild(node);
    });

    groupsEl.appendChild(groupEl);
  });

  saveDraft();
}

/* ----- Événements éditeur (délégation) ----- */
$("#circuitName").addEventListener("input", (e) => {
  circuit.name = e.target.value;
  saveDraft();
});

function findGroup(el) {
  const gid = el.closest(".group").dataset.gid;
  const gi = circuit.groups.findIndex((g) => g.id === gid);
  return { gi, group: circuit.groups[gi] };
}
function findStep(el) {
  const { gi, group } = findGroup(el);
  const sid = el.closest(".step").dataset.id;
  const si = group.steps.findIndex((s) => s.id === sid);
  return { gi, group, si, step: group.steps[si] };
}

groupsEl.addEventListener("input", (e) => {
  const t = e.target;
  if (t.classList.contains("group-name")) {
    findGroup(t).group.name = t.value;
  } else if (t.classList.contains("group-repeat")) {
    findGroup(t).group.repeat = Math.max(1, parseInt(t.value, 10) || 1);
    $("#totalTime").textContent = `Durée totale : ${fmt(totalSeconds())}`;
  } else if (t.classList.contains("step-name-input")) {
    findStep(t).step.name = t.value;
  } else if (t.classList.contains("step-min") || t.classList.contains("step-sec")) {
    const ctx = findStep(t);
    const row = t.closest(".step");
    const m = Math.max(0, parseInt(row.querySelector(".step-min").value, 10) || 0);
    const s = Math.max(0, parseInt(row.querySelector(".step-sec").value, 10) || 0);
    ctx.step.sec = m * 60 + s;
    $("#totalTime").textContent = `Durée totale : ${fmt(totalSeconds())}`;
  }
  saveDraft();
});

groupsEl.addEventListener("change", (e) => {
  if (e.target.classList.contains("step-type")) {
    const { step } = findStep(e.target);
    step.type = e.target.value;
    e.target.closest(".step").dataset.type = step.type;
    saveDraft();
  }
});

groupsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const cls = btn.classList;

  // --- actions sur un ensemble ---
  if (cls.contains("g-addstep")) {
    findGroup(btn).group.steps.push(newStep("exercise"));
    return render();
  }
  if (cls.contains("g-dup")) {
    const { gi, group } = findGroup(btn);
    const copy = structuredClone(group);
    copy.id = uid();
    copy.steps.forEach((s) => (s.id = uid()));
    circuit.groups.splice(gi + 1, 0, copy);
    return render();
  }
  if (cls.contains("g-del")) {
    const { gi } = findGroup(btn);
    if (circuit.groups.length === 1) { circuit.groups = [newGroup()]; }
    else { circuit.groups.splice(gi, 1); }
    return render();
  }
  if (cls.contains("g-up") || cls.contains("g-down")) {
    const { gi } = findGroup(btn);
    const ni = cls.contains("g-up") ? gi - 1 : gi + 1;
    if (ni < 0 || ni >= circuit.groups.length) return;
    [circuit.groups[gi], circuit.groups[ni]] = [circuit.groups[ni], circuit.groups[gi]];
    return render();
  }

  // --- actions sur une étape ---
  if (cls.contains("dup")) {
    const { group, si, step } = findStep(btn);
    const copy = { ...structuredClone(step), id: uid() };
    group.steps.splice(si + 1, 0, copy);
    return render();
  }
  if (cls.contains("del")) {
    const { group, si } = findStep(btn);
    group.steps.splice(si, 1);
    if (group.steps.length === 0) group.steps.push(newStep("exercise"));
    return render();
  }
  if (cls.contains("up") || cls.contains("down")) {
    const { group, si } = findStep(btn);
    const ni = cls.contains("up") ? si - 1 : si + 1;
    if (ni < 0 || ni >= group.steps.length) return;
    [group.steps[si], group.steps[ni]] = [group.steps[ni], group.steps[si]];
    return render();
  }
});

$("#addGroupBtn").addEventListener("click", () => {
  circuit.groups.push(newGroup());
  render();
});

$("#newCircuitBtn").addEventListener("click", () => {
  if (!confirm("Nouveau circuit ? Les modifications non enregistrées seront perdues.")) return;
  circuit = emptyCircuit();
  render();
});

/* ===========================================================
   PERSISTANCE
   =========================================================== */
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(LS_SAVED)) || {}; }
  catch { return {}; }
}
function saveDraft() {
  try { localStorage.setItem(LS_DRAFT, JSON.stringify(circuit)); } catch {}
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(LS_DRAFT)); } catch { return null; }
}

function refreshSavedSelect() {
  const sel = $("#savedSelect");
  const names = Object.keys(loadSaved()).sort((a, b) => a.localeCompare(b, "fr"));
  sel.innerHTML = `<option value="">— Charger un circuit —</option>` +
    names.map((n) => `<option value="${encodeURIComponent(n)}">${n}</option>`).join("");
}

$("#saveBtn").addEventListener("click", () => {
  const name = (circuit.name || "").trim();
  if (!name) { alert("Donne un nom au circuit avant d'enregistrer."); $("#circuitName").focus(); return; }
  const all = loadSaved();
  if (all[name] && !confirm(`« ${name} » existe déjà. Le remplacer ?`)) return;
  all[name] = structuredClone(circuit);
  localStorage.setItem(LS_SAVED, JSON.stringify(all));
  refreshSavedSelect();
  $("#savedSelect").value = encodeURIComponent(name);
  alert("Circuit enregistré ✔");
});

$("#loadBtn").addEventListener("click", () => {
  const key = $("#savedSelect").value;
  if (!key) return;
  const all = loadSaved();
  const name = decodeURIComponent(key);
  if (!all[name]) return;
  circuit = structuredClone(all[name]);
  render();
});

$("#deleteSavedBtn").addEventListener("click", () => {
  const key = $("#savedSelect").value;
  if (!key) return;
  const name = decodeURIComponent(key);
  if (!confirm(`Supprimer définitivement « ${name} » ?`)) return;
  const all = loadSaved();
  delete all[name];
  localStorage.setItem(LS_SAVED, JSON.stringify(all));
  refreshSavedSelect();
});

/* ===========================================================
   AUDIO — bips, son de fin d'étape, voix
   =========================================================== */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function tone(freq, dur, type = "sine", gain = 0.25) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const beepCountdown = () => tone(880, 0.15, "square", 0.2);

// Son distinct de FIN D'ÉTAPE : double bip grave + descendant
function endStepSound() {
  if (!audioCtx) return;
  tone(523, 0.18, "sawtooth", 0.3);
  setTimeout(() => tone(330, 0.45, "sawtooth", 0.3), 170);
}

// Carillon de fin de circuit
function finishSound() {
  if (!audioCtx) return;
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.35, "triangle", 0.3), i * 180));
}

let voiceOn = true;
function speak(text) {
  if (!voiceOn || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = 1.05;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function spokenDuration(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  const parts = [];
  if (m) parts.push(m === 1 ? "1 minute" : `${m} minutes`);
  if (s) parts.push(s === 1 ? "1 seconde" : `${s} secondes`);
  return parts.join(" ") || "0 seconde";
}

/* ===========================================================
   LECTEUR
   =========================================================== */
const PREP_SEC = 5;
const DEFAULT_TITLE = document.title;

// Affiche l'étape en cours + le chrono dans l'onglet du navigateur
function setTabTitle() {
  if ($("#player").classList.contains("hidden")) {
    document.title = DEFAULT_TITLE;
    return;
  }
  const label = idx === -1 ? "Préparez-vous" : (timeline[idx] ? timeline[idx].name : "");
  const prefix = paused ? "⏸ " : "";
  document.title = `${prefix}${fmt(remaining)} · ${label}`;
}

let timeline = [];   // étapes "à plat" après expansion des tours
let idx = 0;         // index courant dans timeline (ou -1 = préparation)
let remaining = 0;
let ticking = null;
let paused = false;
let wakeLock = null;

function buildTimeline() {
  const tl = [];
  circuit.groups.forEach((g) => {
    const rounds = Math.max(1, g.repeat || 1);
    const usable = g.steps.filter((s) => (s.sec || 0) > 0);
    for (let r = 1; r <= rounds; r++) {
      usable.forEach((s) => {
        tl.push({
          type: s.type,
          name: s.name || (s.type === "pause" ? "Pause" : "Exercice"),
          sec: s.sec,
          round: r,
          rounds,
          groupName: g.name,
        });
      });
    }
  });
  return tl;
}

async function requestWakeLock() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); }
  catch {}
}
function releaseWakeLock() {
  try { wakeLock && wakeLock.release(); } catch {}
  wakeLock = null;
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && $("#player").classList.contains("hidden") === false && !paused) {
    requestWakeLock();
  }
});

$("#startBtn").addEventListener("click", () => {
  timeline = buildTimeline();
  if (timeline.length === 0) { alert("Ajoute au moins une étape avec une durée."); return; }
  ensureAudio();
  $("#editor").classList.add("hidden");
  $("#player").classList.remove("hidden");
  requestWakeLock();
  startPrep();
});

function startPrep() {
  idx = -1;
  paused = false;
  remaining = PREP_SEC;
  const stage = $("#playerStage");
  stage.className = "player-stage is-prep";
  $("#playerStepName").textContent = "Préparez-vous";
  $("#playerRound").textContent = "Échauffement";
  const first = timeline[0];
  $("#playerNext").textContent = `Suivant : ${first.name} (${fmt(first.sec)})`;
  $("#pauseBtn").textContent = "⏸";
  speak(`Préparez-vous. Premier exercice : ${timeline[0].name}`);
  paint();
  run();
}

function enterStep(i) {
  idx = i;
  const st = timeline[i];
  remaining = st.sec;
  const stage = $("#playerStage");
  stage.className = "player-stage " + (st.type === "pause" ? "is-pause" : "is-exercise");
  $("#playerStepName").textContent = st.name;
  $("#playerRound").textContent =
    (st.rounds > 1 ? `Tour ${st.round}/${st.rounds} · ` : "") + `Étape ${i + 1}/${timeline.length}`;
  const nx = timeline[i + 1];
  $("#playerNext").textContent = nx ? `Suivant : ${nx.name} (${fmt(nx.sec)})` : "Suivant : fin du circuit";
  speak(`${st.name}. ${spokenDuration(st.sec)}`);
  paint();
}

function paint() {
  $("#playerTime").textContent = fmt(remaining);
  let pct = 0;
  if (idx >= 0) {
    const done = timeline.slice(0, idx).reduce((a, s) => a + s.sec, 0) + (timeline[idx].sec - remaining);
    const tot = timeline.reduce((a, s) => a + s.sec, 0);
    pct = tot ? (done / tot) * 100 : 0;
  }
  $("#progressBar").style.width = `${pct}%`;
  setTabTitle();
}

function run() {
  clearInterval(ticking);
  ticking = setInterval(() => {
    if (paused) return;
    remaining -= 1;

    if (remaining > 0 && remaining <= 3) beepCountdown();

    if (remaining <= 0) {
      if (idx === -1) {
        enterStep(0);
      } else {
        endStepSound(); // <-- son distinct à chaque fin d'étape
        if (idx + 1 < timeline.length) {
          enterStep(idx + 1);
        } else {
          finish();
          return;
        }
      }
    }
    paint();
  }, 1000);
}

function finish() {
  clearInterval(ticking);
  const stage = $("#playerStage");
  stage.className = "player-stage is-done";
  $("#playerStepName").textContent = "Circuit terminé 🎉";
  $("#playerTime").textContent = fmt(0);
  $("#playerRound").textContent = "";
  $("#playerNext").textContent = "Bravo !";
  $("#progressBar").style.width = "100%";
  finishSound();
  speak("Circuit terminé. Bravo !");
  releaseWakeLock();
  document.title = "✅ Circuit terminé";
}

$("#pauseBtn").addEventListener("click", () => {
  paused = !paused;
  $("#pauseBtn").textContent = paused ? "▶" : "⏸";
  if (paused) { speechSynthesis.cancel(); releaseWakeLock(); }
  else { requestWakeLock(); }
  setTabTitle();
});

$("#skipBtn").addEventListener("click", () => {
  if (idx === -1) { enterStep(0); return; }
  if (idx + 1 < timeline.length) enterStep(idx + 1);
  else finish();
});

$("#prevBtn").addEventListener("click", () => {
  if (idx <= 0) { startPrep(); return; }
  enterStep(idx - 1);
});

$("#stopBtn").addEventListener("click", () => {
  if (!confirm("Quitter le circuit en cours ?")) return;
  clearInterval(ticking);
  speechSynthesis.cancel();
  releaseWakeLock();
  $("#player").classList.add("hidden");
  $("#editor").classList.remove("hidden");
  setTabTitle();
});

/* ===========================================================
   INIT
   =========================================================== */
refreshSavedSelect();
render();
