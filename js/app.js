(() => {
  "use strict";
  const STORAGE_KEY = "vokabel-trainer-v1";
  const $ = (id) => document.getElementById(id);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const levels = ["A1","A2","B1","B2","C1","C2"];
  const revisionCount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const wordKey = word => JSON.stringify([word.level, word.de.normalize("NFC"), word.fr.normalize("NFC")]);
  const germanLabel = word => word.plural ? `${word.de} (${word.plural})` : word.de;
  const defaultPlurals = new Map(window.DEFAULT_WORDS.filter(w => w.plural).map(w => [w.de, w.plural]));
  let state = loadState();
  let selectedIds = new Set();
  let deferredInstallPrompt = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.words)) return { words: saved.words.map(normalizeWord), session: saved.session || null };
    } catch (e) { console.warn("Sauvegarde illisible, retour aux exemples.", e); }
    return { words: window.DEFAULT_WORDS.map(normalizeWord), session: null };
  }
  function normalizeWord(word) {
    return {
      id: typeof word.id === "string" && word.id ? word.id : makeId(),
      level: word.level, de: word.de.trim(), fr: word.fr.trim(),
      note: typeof word.note === "string" ? word.note : "",
      plural: typeof word.plural === "string" ? word.plural.trim() : defaultPlurals.get(word.de.trim()) || "",
      revisions: revisionCount(word.revisions)
    };
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
    const order = $("order-select").value;
    if (order === "least") {
      return shuffle(words).sort((a, b) => a.revisions - b.revisions).slice(0, 20);
    }
    if (order === "random") words = shuffle(words);
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
    const german = germanLabel(state.words.find(w => w.id === word.id) || word);
    const isDeToFr = s.direction === "de-fr";
    const remaining = items.filter(w => !isGood(w)).length;
    $("phase-label").textContent = p.type === "learn" ? "Apprentissage" : "Révision";
    $("study-title").textContent = p.type === "learn" ? `Nouveaux mots · ${p.start + 1} à ${p.end}` : `Révision · ${p.end} mots`;
    $("study-subtitle").textContent = `${word.level} · ${isDeToFr ? "Allemand vers français" : "Français vers allemand"} · ${remaining} à valider`;
    $("counter").textContent = `${s.index + 1} / ${items.length}`;
    $("progress-bar").style.width = `${((items.length - remaining) / items.length) * 100}%`;
    $("prompt-label").textContent = isDeToFr ? "Mot allemand à traduire" : "Mot français à traduire";
    $("prompt-word").textContent = isDeToFr ? german : word.fr;
    $("prompt-hint").textContent = isGood(word) ? "Ce mot a déjà été marqué « Bon » dans cette étape." : "Essaie de retrouver la traduction.";
    $("answer-word").textContent = isDeToFr ? word.fr : german;
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
  function assess(status) {
    if (!state.session?.revealed) return;
    const items = currentItems(), word = items[state.session.index];
    if (!word) return;
    const storedWord = state.words.find(w => w.id === word.id);
    if (storedWord) storedWord.revisions = Math.min(storedWord.revisions + 1, Number.MAX_SAFE_INTEGER);
    state.session.statuses[statusKey(word)] = status;
    state.session.revealed = false;
    const nextPending = items.findIndex((w, i) => i > state.session.index && !isGood(w));
    const firstPending = items.findIndex(w => !isGood(w));
    state.session.index = nextPending >= 0 ? nextPending : Math.max(firstPending, 0);
    save();
    renderStudy();
    const cell = document.getElementById(`revisions-${word.id}`);
    if (cell && storedWord) cell.textContent = storedWord.revisions;
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

  function displayedWords() {
    const filter = $("list-filter").value;
    return state.words.filter(w => filter === "ALL" || w.level === filter);
  }
  function renderWords() {
    const words = displayedWords();
    $("word-count").textContent = `${words.length} mot(s)`;
    const tbody = $("word-table"); tbody.replaceChildren();
    words.forEach(word => {
      const tr = document.createElement("tr"); tr.className = "border-b border-slate-100";
      const selectCell = document.createElement("td"); selectCell.className = "py-2 pr-3";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox"; checkbox.checked = selectedIds.has(word.id);
      checkbox.setAttribute("aria-label", `Sélectionner ${word.de}`);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedIds.add(word.id); else selectedIds.delete(word.id);
        updateSelectionUI(words);
      });
      selectCell.appendChild(checkbox); tr.appendChild(selectCell);
      [word.level, germanLabel(word), word.fr, word.note || "—", word.revisions].forEach((value, index) => {
        const td = document.createElement("td"); td.className = "py-2 pr-3"; td.textContent = value;
        if (index === 4) td.id = `revisions-${word.id}`;
        tr.appendChild(td);
      });
      const action = document.createElement("td"); action.className = "py-2";
      const edit = document.createElement("button"); edit.className = "mr-2 text-indigo-700 hover:underline"; edit.textContent = "Modifier";
      edit.addEventListener("click", () => editWord(word.id));
      const del = document.createElement("button"); del.className = "text-rose-700 hover:underline"; del.textContent = "Supprimer";
      del.addEventListener("click", () => deleteWord(word.id));
      action.append(edit, del); tr.appendChild(action); tbody.appendChild(tr);
    });
    updateSelectionUI(words);
  }
  function updateSelectionUI(words) {
    const visibleCount = words.filter(w => selectedIds.has(w.id)).length;
    const selectAll = $("select-all");
    selectAll.disabled = words.length === 0;
    selectAll.checked = words.length > 0 && visibleCount === words.length;
    selectAll.indeterminate = visibleCount > 0 && visibleCount < words.length;
    const count = selectedIds.size;
    $("selection-count").textContent = `${count} mot(s) sélectionné(s) · 20 requis pour commencer`;
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
    const plural = prompt("Pluriel allemand (sans article, facultatif) :", word.plural); if (plural === null) return;
    const note = prompt("Note (facultatif) :", word.note || ""); if (note === null) return;
    if (!de.trim() || !fr.trim()) { alert("Renseigne le mot allemand et sa traduction."); return; }
    word.de = de.trim(); word.fr = fr.trim(); word.note = note.trim(); word.plural = plural.trim();
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
    state.words.push({ id: makeId(), level: $("word-level").value, de, fr, note: $("word-note").value.trim(), plural: $("word-plural").value.trim(), revisions: 0 });
    save(); $("word-form").reset(); renderWords();
  }
  function exportWords() {
    const blob = new Blob([JSON.stringify({ version: "1.2", words: state.words }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "vokabel-trainer-vocabulaire.json"; a.click(); URL.revokeObjectURL(url);
  }
  function importWords(file) {
    if (!file) return;
    const replace = $("import-mode").value === "replace";
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.words)) throw new Error("Le fichier doit contenir un tableau 'words'.");
        const valid = data.words.every(w => w && levels.includes(w.level)
          && typeof w.de === "string" && w.de.trim() && typeof w.fr === "string" && w.fr.trim());
        if (!valid) throw new Error("Certaines entrées ne sont pas valides (niveau, allemand ou français manquant).");
        const message = replace
          ? `Remplacer la liste actuelle par ${data.words.length} mots ? La séance en cours sera abandonnée.`
          : `Ajouter ${data.words.length} mots à la liste et fusionner les entrées identiques ?`;
        if (!confirm(message)) return;
        const words = replace ? [] : state.words.map(w => ({ ...w }));
        const byKey = new Map(words.map(w => [wordKey(w), w]));
        const ids = new Set(words.map(w => w.id));
        for (const entry of data.words) {
          const word = normalizeWord(entry);
          const key = wordKey(word);
          const existing = byKey.get(key);
          if (existing && !replace) {
            existing.revisions = Math.max(existing.revisions, word.revisions);
            existing.plural ||= word.plural;
            existing.note ||= word.note;
            continue;
          }
          while (ids.has(word.id)) word.id = makeId();
          ids.add(word.id);
          byKey.set(key, word);
          words.push(word);
        }
        const nextState = { words, session: replace ? null : state.session };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        state = nextState;
        if (replace) {
          selectedIds.clear();
          $("study-panel").classList.add("hidden");
          $("complete-panel").classList.add("hidden");
          $("resume-button").textContent = "Reprendre la séance";
        }
        renderWords(); alert("Importation terminée.");
      } catch (e) { alert(`Import impossible : ${e.message}`); }
      finally { $("import-file").value = ""; }
    };
    reader.readAsText(file);
  }

  $("select-all").addEventListener("change", event => {
    for (const word of displayedWords()) {
      if (event.target.checked) selectedIds.add(word.id); else selectedIds.delete(word.id);
    }
    renderWords();
  });
  $("order-select").addEventListener("change", () => {
    const least = $("order-select").value === "least";
    if (least) $("size-select").value = "20";
    $("size-select").disabled = least;
  });
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
  $("good-button").addEventListener("click", () => assess("good"));
  $("bad-button").addEventListener("click", () => assess("pending"));
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
