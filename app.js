(function () {
  const THEMES = {
    unicorn: {
      label: "Unicorn Magic",
      colors: ["#ffc8ec", "#ffb8e8", "#e8b4ff", "#b8d4ff", "#ffd4f0", "#fff0a8", "#ff9ff3", "#c8f0ff"],
      stickers: ["🦄", "🌈", "✨", "⭐", "💫", "🎀", "💖", "🦋", "☁️", "🌟", "💜", "🎠"],
    },
    fairy: {
      label: "Fairy Garden",
      colors: ["#c8f5d8", "#b8f0c8", "#ffe8f0", "#e8ffc8", "#d4f5ff", "#fff5c8", "#ffc8e8", "#a8e6cf"],
      stickers: ["🧚", "🌸", "🌺", "🦋", "✨", "🍄", "🌿", "💚", "🪄", "🌷", "💫", "🧚‍♀️"],
    },
    princess: {
      label: "Royal Princess",
      colors: ["#e8d4ff", "#ffd4e8", "#fff0c8", "#d4c8ff", "#ffc8d4", "#f0e6ff", "#ffe566", "#ffb8d4"],
      stickers: ["👑", "💎", "🏰", "✨", "🎀", "💖", "⭐", "🪞", "👸", "💍", "🌹", "🎀"],
    },
  };

  const state = {
    theme: "unicorn",
    color: "#ffc8ec",
    pattern: "solid",
    pickedSticker: null,
    stickers: [],
    history: [],
  };

  const els = {
    body: document.body,
    swatches: document.getElementById("colorSwatches"),
    palette: document.getElementById("stickerPalette"),
    layer: document.getElementById("stickerLayer"),
    canvasWrap: document.getElementById("canvasWrap"),
    themeLabel: document.getElementById("themeLabel"),
    selectedTip: document.getElementById("selectedTip"),
    toast: document.getElementById("toast"),
  };

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), 2800);
  }

  function applyDressStyle() {
    document.querySelectorAll(".dress-part").forEach((p) => p.setAttribute("fill", state.color));
    document.documentElement.style.setProperty("--dress", state.color);
    updatePatternOverlay();
  }

  function updatePatternOverlay() {
    let overlay = document.getElementById("patternOverlay");
    const svg = document.querySelector(".dress-svg");

    if (state.pattern === "solid") {
      overlay?.remove();
      document.querySelectorAll(".dress-part").forEach((p) => p.setAttribute("fill", state.color));
      return;
    }

    if (!overlay) {
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.id = "patternOverlay";
      overlay.setAttribute("pointer-events", "none");
      svg.appendChild(overlay);
    }

    overlay.innerHTML = "";
    const paths = [
      { d: "M110 95 L160 75 L210 95 L205 175 L115 175 Z" },
      { d: "M115 175 L205 175 L245 420 L75 420 Z" },
      { d: "M95 130 m-28 0 a28 22 0 1 0 56 0 a28 22 0 1 0 -56 0" },
      { d: "M225 130 m-28 0 a28 22 0 1 0 56 0 a28 22 0 1 0 -56 0" },
    ];

    paths.forEach(({ d }) => {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", `url(#pat-${state.pattern})`);
      p.style.color = shadeColor(state.color, -40);
      overlay.appendChild(p);
    });

    document.querySelectorAll(".dress-part").forEach((p) => p.setAttribute("fill", state.color));
  }

  function shadeColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
    const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  function renderSwatches() {
    const t = THEMES[state.theme];
    els.swatches.innerHTML = "";
    t.colors.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch" + (c === state.color ? " is-active" : "");
      btn.style.background = c;
      btn.title = "Pick color";
      btn.addEventListener("click", () => {
        state.color = c;
        renderSwatches();
        applyDressStyle();
      });
      els.swatches.appendChild(btn);
    });
  }

  function renderPalette() {
    const t = THEMES[state.theme];
    els.palette.innerHTML = "";
    t.stickers.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-item" + (state.pickedSticker === emoji ? " is-picked" : "");
      btn.textContent = emoji;
      btn.addEventListener("click", () => pickSticker(emoji));
      els.palette.appendChild(btn);
    });
  }

  function pickSticker(emoji) {
    state.pickedSticker = state.pickedSticker === emoji ? null : emoji;
    renderPalette();
    els.selectedTip.hidden = !state.pickedSticker;
    document.querySelectorAll(".sticker").forEach((s) => s.classList.remove("is-selected"));
  }

  function pushHistory() {
    state.history.push(JSON.stringify(state.stickers.map((s) => ({ ...s }))));
    if (state.history.length > 20) state.history.shift();
  }

  function addSticker(emoji, xPct, yPct) {
    pushHistory();
    const id = "s" + Date.now() + Math.random().toString(36).slice(2, 6);
    state.stickers.push({ id, emoji, x: xPct, y: yPct, scale: 1 });
    renderStickers();
    toast("So pretty! ✨");
  }

  function renderStickers() {
    els.layer.innerHTML = "";
    state.stickers.forEach((s) => {
      const el = document.createElement("div");
      el.className = "sticker";
      el.dataset.id = s.id;
      el.textContent = s.emoji;
      el.style.left = s.x + "%";
      el.style.top = s.y + "%";
      el.style.transform = `translate(-50%, -50%) scale(${s.scale})`;
      setupDrag(el, s);
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        removeSticker(s.id);
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".sticker").forEach((x) => x.classList.remove("is-selected"));
        el.classList.add("is-selected");
      });
      els.layer.appendChild(el);
    });
  }

  function removeSticker(id) {
    pushHistory();
    state.stickers = state.stickers.filter((s) => s.id !== id);
    renderStickers();
  }

  function setupDrag(el, data) {
    let startX, startY, origX, origY;

    function onStart(e) {
      e.preventDefault();
      e.stopPropagation();
      const pt = e.touches ? e.touches[0] : e;
      startX = pt.clientX;
      startY = pt.clientY;
      origX = data.x;
      origY = data.y;
      pushHistory();
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    }

    function onMove(e) {
      e.preventDefault();
      const pt = e.touches ? e.touches[0] : e;
      const rect = els.canvasWrap.getBoundingClientRect();
      const dx = ((pt.clientX - startX) / rect.width) * 100;
      const dy = ((pt.clientY - startY) / rect.height) * 100;
      data.x = Math.max(5, Math.min(95, origX + dx));
      data.y = Math.max(5, Math.min(95, origY + dy));
      el.style.left = data.x + "%";
      el.style.top = data.y + "%";
    }

    function onEnd() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    }

    el.addEventListener("mousedown", onStart);
    el.addEventListener("touchstart", onStart, { passive: false });
  }

  function setTheme(name) {
    state.theme = name;
    state.color = THEMES[name].colors[0];
    state.pickedSticker = null;
    els.body.dataset.theme = name;
    els.themeLabel.textContent = THEMES[name].label;
    document.querySelectorAll(".theme-btn").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.theme === name);
    });
    renderSwatches();
    renderPalette();
    applyDressStyle();
    els.selectedTip.hidden = true;
    toast(THEMES[name].label + " theme! ✨");
  }

  els.canvasWrap.addEventListener("click", (e) => {
    if (e.target.closest(".sticker")) return;
    if (!state.pickedSticker) return;
    const rect = els.canvasWrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    addSticker(state.pickedSticker, x, y);
  });

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });

  document.querySelectorAll(".pat").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.pattern = btn.dataset.pattern;
      document.querySelectorAll(".pat").forEach((b) => b.classList.toggle("is-active", b === btn));
      applyDressStyle();
    });
  });

  document.getElementById("btnDeselect")?.addEventListener("click", () => pickSticker(null));

  document.getElementById("btnClear")?.addEventListener("click", () => {
    if (!state.stickers.length) return;
    pushHistory();
    state.stickers = [];
    renderStickers();
    toast("All clear! Start fresh 💗");
  });

  document.getElementById("btnUndo")?.addEventListener("click", () => {
    if (!state.history.length) {
      toast("Nothing to undo!");
      return;
    }
    const prev = state.history.pop();
    state.stickers = JSON.parse(prev);
    renderStickers();
    toast("Undone!");
  });

  document.getElementById("btnRandom")?.addEventListener("click", () => {
    const themes = Object.keys(THEMES);
    setTheme(themes[Math.floor(Math.random() * themes.length)]);
    const t = THEMES[state.theme];
    state.color = t.colors[Math.floor(Math.random() * t.colors.length)];
    const pats = ["solid", "dots", "stripes", "stars", "hearts"];
    state.pattern = pats[Math.floor(Math.random() * pats.length)];
    document.querySelectorAll(".pat").forEach((b) => b.classList.toggle("is-active", b.dataset.pattern === state.pattern));
    applyDressStyle();
    renderSwatches();
    state.stickers = [];
    state.history = [];
    const count = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const emoji = t.stickers[Math.floor(Math.random() * t.stickers.length)];
      state.stickers.push({
        id: "s" + Date.now() + i,
        emoji,
        x: 20 + Math.random() * 60,
        y: 25 + Math.random() * 55,
        scale: 1,
      });
    }
    renderStickers();
    toast("Surprise dress! 🎉");
  });

  document.getElementById("btnSave")?.addEventListener("click", async () => {
    toast("Saving your masterpiece...");
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(els.canvasWrap, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = "ceci-dress-" + Date.now() + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Saved! Check your downloads 📸");
    } catch {
      toast("Tap screenshot to save your dress! 📸");
    }
  });

  function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = () => resolve(window.html2canvas);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  setTheme("unicorn");
})();
