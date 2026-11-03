(() => {
  "use strict";
  const STORAGE_KEY = "vokabel-trainer-v1";
  const $ = (id) => document.getElementById(id);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const levels = ["A1","A2","B1","B2","C1","C2"];
  let state = loadState();
  let selectedIds = new Set();
  let deferredInstallPrompt = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.words)) return { words: saved.words, session: saved.session || null };
    } catch (e) { console.warn("Sauvegarde illisible, retour aux exemples.", e); }
    return { words: clone(window.DEFAULT_WORDS), session: null };
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function makeId() { return `w-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function getSelectedWords() {
    const level = $("level-select").value;
    let words = state.words.filter(w => level === "ALL" || w.level === level);
    if ($("order-select").value === "random") words = shuffle(words);
    else words.sort((a,b) => levels.indexOf(a.level)-levels.indexOf(b.level) || a.de.localeCompare(b.de, "de"));
    return words.slice(0, Number($("size-select").value));
  }

  function makePhases(total) {
    const phases = [];
    let learned = 0;
    while (learned < total) {
      const next = Math.min(learned + 5, total);
      phases.push({ type: "learn", start: learned, end: next });
      learned = next;
      if (learned === 10 || learned === 20 || learned === total) {
        phases.push({ type: "review", start: 0, end: learned });
      }
    }
    return phases;
  }
  function startWithWords(words, direction) {
    if (!words.length) { alert("Aucun mot disponible pour cette série."); return; }
    state.session = {
      words: clone(words), direction, phases: makePhases(words.length),
      phase: 0, index: 0, statuses: {}, revealed: false
    };
    save();
    $("complete-panel").classList.add("hidden");
    $("study-panel").classList.remove("hidden");
    renderStudy();
  }
  function startSession() {
    startWithWords(getSelectedWords(), $("direction-select").value);
  }
  function currentPhase() {
    const s = state.session;
    if (!s) return null;
    // Compatibilité avec une séance créée par la première version.
    if (!s.phases) s.phases = makePhases(s.words.length);
    if (!s.statuses) s.statuses = {};
    return s.phases[s.phase];
  }
  function currentItems() {
    const p = currentPhase();
    return p ? state.session.words.slice(p.start, p.end) : [];
  }
  function statusKey(word) { return `${state.session.phase}:${word.id}`; }
  function isGood(word) { return state.session.statuses[statusKey(word)] === "good"; }
  function pendingItems() { return currentItems().filter(w => !isGood(w)); }
  function ensureIndex() {
    const items = currentItems();
    if (!items.length) return;
    if (state.session.index >= items.length) state.session.index = 0;
    // Keep current index on a pending item whenever possible.
    if (isGood(items[state.session.index])) {
      const next = items.findIndex((w, i) => i >= state.session.index && !isGood(w));
      const first = items.findIndex(w => !isGood(w));
      state.session.index = next >= 0 ? next : first >= 0 ? first : 0;
    }
  }
  function renderStudy() {
    if (!state.session) return;
    let p = currentPhase();
    if (!p) { finishSession(); return; }
    let items = currentItems();
    if (items.every(isGood)) {
      state.session.phase++;
      state.session.index = 0;
      state.session.revealed = false;
      save();
      if (state.session.phase >= state.session.phases.length) { finishSession(); return; }
      p = currentPhase(); items = currentItems();
    }
    ensureIndex();
    const s = state.session;
    const word = items[s.index];
    if (!word) return;
    const isDeToFr = s.direction === "de-fr";
    const remaining = items.filter(w => !isGood(w)).length;
    $("phase-label").textContent = p.type === "learn" ? "Apprentissage" : "Révision";
    $("study-title").textContent = p.type === "learn" ? `Nouveaux mots · ${p.start + 1} à ${p.end}` : `Révision · ${p.end} mots`;
    $("study-subtitle").textContent = `${word.level} · ${isDeToFr ? "Allemand vers français" : "Français vers allemand"} · ${remaining} à valider`;
    $("counter").textContent = `${s.index + 1} / ${items.length}`;
    $("progress-bar").style.width = `${((items.length - remaining) / items.length) * 100}%`;
    $("prompt-label").textContent = isDeToFr ? "Mot allemand à traduire" : "Mot français à traduire";
    $("prompt-word").textContent = isDeToFr ? word.de : word.fr;
    $("prompt-hint").textContent = isGood(word) ? "Ce mot a déjà été marqué « Bon » dans cette étape." : "Essaie de retrouver la traduction.";
    $("answer-word").textContent = isDeToFr ? word.fr : word.de;
    $("answer-note").textContent = word.note || "";
    $("answer-area").classList.toggle("hidden", !s.revealed);
    $("reveal-button").classList.toggle("hidden", s.revealed);
    $("next-button").classList.toggle("hidden", !s.revealed);
    $("assessment-controls").classList.toggle("hidden", !s.revealed);
    $("assessment-controls").classList.toggle("flex", s.revealed);
    $("prev-button").disabled = s.index === 0;
    $("next-button").textContent = s.index === items.length - 1 ? "Fin de la liste →" : "Suivant →";
    $("study-panel").classList.remove("hidden");
    $("complete-panel").classList.add("hidden");
  }
  function moveTo(index) {
    const items = currentItems();
    if (!items.length) return;
    state.session.index = Math.max(0, Math.min(items.length - 1, index));
    state.session.revealed = false;
    save(); renderStudy();
  }
  function markGood() {
    const items = currentItems(), word = items[state.session.index];
    if (!word) return;
    state.session.statuses[statusKey(word)] = "good";
    state.session.revealed = false;
    const nextPending = items.findIndex((w, i) => i > state.session.index && !isGood(w));
    const firstPending = items.findIndex(w => !isGood(w));
    if (nextPending >= 0) state.session.index = nextPending;
    else if (firstPending >= 0) state.session.index = firstPending;
    else {
      state.session.index = items.length - 1;
    }
    save(); renderStudy();
  }
  function markNotGood() {
    const items = currentItems(), word = items[state.session.index];
    if (!word) return;
    state.session.statuses[statusKey(word)] = "pending";
    state.session.revealed = false;
    // Passe au prochain mot non validé. Si tous les autres sont bons,
    // le mot à revoir reste affiché afin que l'étape ne soit pas validée par erreur.
    const nextPending = items.findIndex((w, i) => i > state.session.index && !isGood(w));
    const firstPending = items.findIndex(w => !isGood(w));
    state.session.index = nextPending >= 0 ? nextPending : firstPending;
    save(); renderStudy();
  }
  function goNext() {
    const items = currentItems();
    if (state.session.index < items.length - 1) moveTo(state.session.index + 1);
    else {
      const firstPending = items.findIndex(w => !isGood(w));
      if (firstPending >= 0) moveTo(firstPending);
      else { state.session.phase++; state.session.index = 0; state.session.revealed = false; save(); renderStudy(); }
    }
  }
  function finishSession() {
    const count = state.session ? state.session.words.length : 0;
    $("study-panel").classList.add("hidden");
    $("complete-panel").classList.remove("hidden");
    $("complete-message").textContent = `${count} mots parcourus. Tous les mots ont été marqués « Bon » dans les étapes prévues.`;
    state.session = null; save();
  }
  function resumeSession() {
    if (!state.session) { alert("Aucune séance à reprendre."); return; }
    $("complete-panel").classList.add("hidden");
    $("study-panel").classList.remove("hidden");
    renderStudy();
  }

  function renderWords() {
    const filter = $("list-filter").value;
    const words = state.words.filter(w => filter === "ALL" || w.level === filter);
    $("word-count").textContent = `${words.length} mot(s)`;
    const tbody = $("word-table"); tbody.replaceChildren();
    words.forEach(word => {
      const tr = document.createElement("tr"); tr.className = "border-b border-slate-100";
      const selectCell = document.createElement("td"); selectCell.className = "py-2 pr-3";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox"; checkbox.checked = selectedIds.has(word.id);
      checkbox.disabled = !checkbox.checked && selectedIds.size >= 20;
      checkbox.setAttribute("aria-label", `Sélectionner ${word.de}`);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedIds.add(word.id); else selectedIds.delete(word.id);
        updateSelectionUI(); renderWords();
      });
      selectCell.appendChild(checkbox); tr.appendChild(selectCell);
      [word.level, word.de, word.fr, word.note || "—"].forEach(value => {
        const td = document.createElement("td"); td.className = "py-2 pr-3 align-top"; td.textContent = value; tr.appendChild(td);
      });
      const action = document.createElement("td"); action.className = "py-2";
      const edit = document.createElement("button"); edit.className = "mr-2 text-indigo-700 hover:underline"; edit.textContent = "Modifier";
      edit.addEventListener("click", () => editWord(word.id));
      const del = document.createElement("button"); del.className = "text-rose-700 hover:underline"; del.textContent = "Supprimer";
      del.addEventListener("click", () => deleteWord(word.id));
      action.append(edit, del); tr.appendChild(action); tbody.appendChild(tr);
    });
    updateSelectionUI();
  }
  function updateSelectionUI() {
    const count = selectedIds.size;
    $("selection-count").textContent = `${count} / 20 mots sélectionnés`;
    $("start-selected-button").disabled = count !== 20;
    $("start-selected-button").classList.toggle("opacity-50", count !== 20);
  }
  function startSelectedSession() {
    if (selectedIds.size !== 20) { alert("Sélectionne exactement 20 mots."); return; }
    const words = state.words.filter(w => selectedIds.has(w.id));
    if (words.length !== 20) { alert("Certains mots sélectionnés ne sont plus dans la liste. Vérifie ta sélection."); return; }
    startWithWords(words, $("direction-select").value);
  }
  function editWord(id) {
    const word = state.words.find(w => w.id === id); if (!word) return;
    const de = prompt("Mot allemand :", word.de); if (de === null) return;
    const fr = prompt("Traduction française :", word.fr); if (fr === null) return;
    const note = prompt("Note (facultatif) :", word.note || ""); if (note === null) return;
    word.de = de.trim(); word.fr = fr.trim(); word.note = note.trim();
    save(); renderWords();
  }
  function deleteWord(id) {
    if (!confirm("Supprimer ce mot de ta liste ?")) return;
    state.words = state.words.filter(w => w.id !== id);
    selectedIds.delete(id);
    save(); renderWords();
  }
  function addWord(event) {
    event.preventDefault();
    const de = $("word-german").value.trim(), fr = $("word-french").value.trim();
    if (!de || !fr) return;
    state.words.push({ id: makeId(), level: $("word-level").value, de, fr, note: $("word-note").value.trim() });
    save(); $("word-form").reset(); renderWords();
  }
  function exportWords() {
    const blob = new Blob([JSON.stringify({ version: 1, words: state.words }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "vokabel-trainer-vocabulaire.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importWords(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.words)) throw new Error("Le fichier doit contenir un tableau 'words'.");
        const valid = data.words.every(w => levels.includes(w.level) && typeof w.de === "string" && typeof w.fr === "string");
        if (!valid) throw new Error("Certaines entrées ne sont pas valides (niveau, allemand ou français manquant).");
        if (!confirm(`Importer ${data.words.length} mots ? Cela remplacera la liste actuelle.`)) return;
        state.words = data.words.map(w => ({ id: w.id || makeId(), level: w.level, de: w.de, fr: w.fr, note: w.note || "" }));
        selectedIds.clear(); save(); renderWords(); alert("Importation terminée.");
      } catch (e) { alert(`Import impossible : ${e.message}`); }
      $("import-file").value = "";
    };
    reader.readAsText(file);
  }

  $("start-button").addEventListener("click", startSession);
  $("start-selected-button").addEventListener("click", startSelectedSession);
  $("clear-selection-button").addEventListener("click", () => { selectedIds.clear(); renderWords(); });
  $("resume-button").addEventListener("click", resumeSession);
  $("reset-button").addEventListener("click", () => {
    if (confirm("Abandonner la séance en cours ?")) { state.session = null; save(); $("study-panel").classList.add("hidden"); }
  });
  $("reveal-button").addEventListener("click", () => {
    if (!state.session) return;
    state.session.revealed = true; save(); renderStudy();
  });
  $("prev-button").addEventListener("click", () => moveTo(state.session.index - 1));
  $("next-button").addEventListener("click", goNext);
  $("good-button").addEventListener("click", markGood);
  $("bad-button").addEventListener("click", markNotGood);
  $("new-series-button").addEventListener("click", startSession);
  $("word-form").addEventListener("submit", addWord);
  $("list-filter").addEventListener("change", renderWords);
  $("export-button").addEventListener("click", exportWords);
  $("import-button").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", e => importWords(e.target.files[0]));

  // Flèches du clavier pendant l'exercice.
  document.addEventListener("keydown", e => {
    if (!state.session || ["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); moveTo(state.session.index - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    if (e.key === " " && !state.session.revealed) { e.preventDefault(); $("reveal-button").click(); }
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault(); deferredInstallPrompt = event; $("install-button").classList.remove("hidden");
  });
  $("install-button").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null; $("install-button").classList.add("hidden");
  });
  function updateOnlineLabel() { $("offline-indicator").textContent = navigator.onLine ? "Application prête" : "Mode hors ligne"; }
  window.addEventListener("online", updateOnlineLabel);
  window.addEventListener("offline", updateOnlineLabel);
  updateOnlineLabel();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(err => console.warn("Service worker non enregistré", err)));
  }
  renderWords();
  if (state.session) $("resume-button").textContent = "Reprendre la séance disponible";
})();
