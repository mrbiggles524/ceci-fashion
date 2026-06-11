(function () {
  const LIB = window.CECI_STICKERS;
  const STICKER_MAP = Object.fromEntries(LIB.items.map((s) => [s.id, s]));

  const THEMES = {
    unicorn: { label: "Unicorn Magic", colors: ["#ffc8ec", "#ffb8e8", "#e8b4ff", "#b8d4ff", "#ffd4f0", "#fff0a8", "#ff9ff3", "#c8f0ff"] },
    fairy: { label: "Fairy Garden", colors: ["#c8f5d8", "#b8f0c8", "#ffe8f0", "#e8ffc8", "#d4f5ff", "#fff5c8", "#ffc8e8", "#a8e6cf"] },
    princess: { label: "Royal Princess", colors: ["#e8d4ff", "#ffd4e8", "#fff0c8", "#d4c8ff", "#ffc8d4", "#f0e6ff", "#ffe566", "#ffb8d4"] },
  };

  const GLITTER_COLORS = ["#ffd93d", "#ff6eb4", "#ffffff", "#c56cf0", "#4d96ff", "#5cd85a", "#ff9ff3"];

  const state = {
    theme: "unicorn",
    color: "#ffc8ec",
    pattern: "solid",
    customDress: false,
    uploadUrl: null,
    tool: "sticker",
    stickerCat: "all",
    pickedStickerId: null,
    selectedId: null,
    glitterColor: "#ffd93d",
    textColor: "#ff6eb4",
    textValue: "Ceci",
    stickers: [],
    texts: [],
    glitter: [],
    history: [],
  };

  const els = {
    body: document.body,
    canvasWrap: document.getElementById("canvasWrap"),
    dressPhoto: document.getElementById("dressPhoto"),
    dressSvg: document.getElementById("dressSvg"),
    glitterCanvas: document.getElementById("glitterCanvas"),
    layer: document.getElementById("stickerLayer"),
    textLayer: document.getElementById("textLayer"),
    swatches: document.getElementById("colorSwatches"),
    catTabs: document.getElementById("catTabs"),
    palette: document.getElementById("stickerPalette"),
    themeLabel: document.getElementById("themeLabel"),
    selectedTip: document.getElementById("selectedTip"),
    editBar: document.getElementById("editBar"),
    stageHint: document.getElementById("stageHint"),
    templateControls: document.getElementById("templateControls"),
    btnTemplate: document.getElementById("btnTemplate"),
    toast: document.getElementById("toast"),
    nameInput: document.getElementById("nameInput"),
  };

  const gCtx = els.glitterCanvas.getContext("2d");
  let glitterDrawing = false;

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), 2800);
  }

  function snapshot() {
    return JSON.stringify({
      stickers: state.stickers.map((s) => ({ ...s })),
      texts: state.texts.map((t) => ({ ...t })),
      glitter: state.glitter.map((g) => ({ ...g })),
    });
  }

  function pushHistory() {
    state.history.push(snapshot());
    if (state.history.length > 25) state.history.shift();
  }

  function undo() {
    if (!state.history.length) return toast("Nothing to undo!");
    const prev = JSON.parse(state.history.pop());
    state.stickers = prev.stickers;
    state.texts = prev.texts;
    state.glitter = prev.glitter;
    state.selectedId = null;
    renderAll();
    toast("Undone!");
  }

  function renderAll() {
    renderStickers();
    renderTexts();
    redrawGlitter();
    updateEditBar();
  }

  /* ---- Dress upload / template ---- */
  function setCustomDress(url) {
    state.customDress = true;
    state.uploadUrl = url;
    els.canvasWrap.classList.add("has-upload");
    els.dressSvg.classList.add("is-hidden");
    els.templateControls.hidden = true;
    els.btnTemplate.hidden = false;

    els.dressPhoto.onload = () => {
      els.dressPhoto.classList.add("is-visible");
      resizeGlitterCanvas();
      toast("Your dress is ready to decorate! 📷");
    };
    els.dressPhoto.onerror = () => {
      toast("Couldn't load that photo — try JPG or PNG!");
      useTemplate();
    };
    els.dressPhoto.src = url;
    if (els.dressPhoto.complete) els.dressPhoto.onload();
  }

  function useTemplate() {
    state.customDress = false;
    state.uploadUrl = null;
    els.canvasWrap.classList.remove("has-upload");
    els.dressPhoto.classList.remove("is-visible");
    els.dressPhoto.removeAttribute("src");
    els.dressSvg.classList.remove("is-hidden");
    els.templateControls.hidden = false;
    els.btnTemplate.hidden = true;
    document.getElementById("dressUpload").value = "";
    applyDressStyle();
    resizeGlitterCanvas();
    toast("Template dress is back!");
  }

  document.getElementById("dressUpload")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok =
      (file.type && file.type.startsWith("image/")) ||
      /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name);
    if (!ok) return toast("Please pick a photo (JPG, PNG, etc.)!");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCustomDress(reader.result);
    };
    reader.onerror = () => toast("Couldn't read that file — try again!");
    reader.readAsDataURL(file);
  });

  els.btnTemplate?.addEventListener("click", useTemplate);

  /* ---- Template dress colors ---- */
  function applyDressStyle() {
    document.querySelectorAll(".dress-part").forEach((p) => p.setAttribute("fill", state.color));
    updatePatternOverlay();
  }

  function updatePatternOverlay() {
    let overlay = document.getElementById("patternOverlay");
    const svg = els.dressSvg;
    if (state.pattern === "solid" || state.customDress) {
      overlay?.remove();
      if (!state.customDress) document.querySelectorAll(".dress-part").forEach((p) => p.setAttribute("fill", state.color));
      return;
    }
    if (!overlay) {
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.id = "patternOverlay";
      overlay.setAttribute("pointer-events", "none");
      svg.appendChild(overlay);
    }
    overlay.innerHTML = "";
    [
      "M110 95 L160 75 L210 95 L205 175 L115 175 Z",
      "M115 175 L205 175 L245 420 L75 420 Z",
      "M95 130 m-28 0 a28 22 0 1 0 56 0 a28 22 0 1 0 -56 0",
      "M225 130 m-28 0 a28 22 0 1 0 56 0 a28 22 0 1 0 -56 0",
    ].forEach((d) => {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", `url(#pat-${state.pattern})`);
      overlay.appendChild(p);
    });
    document.querySelectorAll(".dress-part").forEach((p) => p.setAttribute("fill", state.color));
  }

  function renderSwatches() {
    els.swatches.innerHTML = "";
    THEMES[state.theme].colors.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch" + (c === state.color ? " is-active" : "");
      btn.style.background = c;
      btn.addEventListener("click", () => {
        state.color = c;
        renderSwatches();
        applyDressStyle();
      });
      els.swatches.appendChild(btn);
    });
  }

  /* ---- Tools ---- */
  function setTool(tool) {
    state.tool = tool;
    state.pickedStickerId = null;
    state.selectedId = null;
    document.querySelectorAll(".tool").forEach((b) => b.classList.toggle("is-active", b.dataset.tool === tool));
    document.getElementById("stickerTools").hidden = tool !== "sticker";
    document.getElementById("glitterTools").hidden = tool !== "glitter";
    document.getElementById("textTools").hidden = tool !== "text";
    els.selectedTip.hidden = true;
    els.canvasWrap.classList.toggle("tool-glitter", tool === "glitter");
    els.canvasWrap.classList.toggle("tool-text", tool === "text");
    const hints = {
      sticker: "Pick a sticker, then tap your dress to place it",
      glitter: "Click and drag to paint glitter on your dress!",
      text: "Type your name, then tap the dress to add it!",
    };
    els.stageHint.textContent = hints[tool];
    renderPalette();
    updateEditBar();
  }

  document.querySelectorAll(".tool").forEach((b) => b.addEventListener("click", () => setTool(b.dataset.tool)));

  /* ---- Sticker palette ---- */
  function renderCatTabs() {
    els.catTabs.innerHTML = "";
    [{ id: "all", label: "All" }, ...LIB.categories].forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-tab" + (state.stickerCat === cat.id ? " is-active" : "");
      btn.textContent = cat.label;
      btn.addEventListener("click", () => {
        state.stickerCat = cat.id;
        renderCatTabs();
        renderPalette();
      });
      els.catTabs.appendChild(btn);
    });
  }

  function renderPalette() {
    els.palette.innerHTML = "";
    let items = LIB.items;
    if (state.stickerCat !== "all") items = items.filter((s) => s.cat === state.stickerCat);

    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-item" + (state.pickedStickerId === item.id ? " is-picked" : "");
      btn.title = item.name;
      btn.innerHTML = item.svg;
      btn.addEventListener("click", () => {
        if (state.tool !== "sticker") setTool("sticker");
        state.pickedStickerId = state.pickedStickerId === item.id ? null : item.id;
        state.selectedId = null;
        renderPalette();
        els.selectedTip.hidden = !state.pickedStickerId;
        updateEditBar();
      });
      els.palette.appendChild(btn);
    });
  }

  function pickStickerById(id) {
    return STICKER_MAP[id];
  }

  /* ---- Placed stickers ---- */
  function addSticker(stickerId, x, y) {
    pushHistory();
    const def = pickStickerById(stickerId);
    state.stickers.push({
      id: "s" + Date.now(),
      stickerId,
      x,
      y,
      scale: 1,
      rotation: 0,
      flip: 1,
      z: state.stickers.length + 1,
    });
    state.pickedStickerId = null;
    els.selectedTip.hidden = true;
    renderPalette();
    renderStickers();
    toast(def.name + " added! ✨");
  }

  function addText(x, y) {
    const text = (els.nameInput?.value || "Ceci").trim();
    if (!text) return toast("Type a name first!");
    pushHistory();
    state.texts.push({
      id: "t" + Date.now(),
      text,
      x,
      y,
      scale: 1,
      rotation: 0,
      color: state.textColor,
      z: 100 + state.texts.length,
    });
    renderTexts();
    toast('Added "' + text + '"!');
  }

  function getItem(id) {
    return state.stickers.find((s) => s.id === id) || state.texts.find((t) => t.id === id);
  }

  function renderStickers() {
    els.layer.innerHTML = "";
    [...state.stickers].sort((a, b) => a.z - b.z).forEach((s) => {
      const def = pickStickerById(s.stickerId);
      if (!def) return;
      const el = document.createElement("div");
      el.className = "sticker" + (state.selectedId === s.id ? " is-selected" : "");
      el.dataset.id = s.id;
      el.style.left = s.x + "%";
      el.style.top = s.y + "%";
      el.style.zIndex = s.z;
      el.style.width = def.w + "px";
      el.innerHTML = def.svg;
      el.style.transform = `translate(-50%, -50%) scale(${s.scale * s.flip}, ${s.scale}) rotate(${s.rotation}deg)`;
      setupDrag(el, s, "sticker");
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectItem(s.id);
      });
      els.layer.appendChild(el);
    });
  }

  function renderTexts() {
    els.textLayer.innerHTML = "";
    state.texts.forEach((t) => {
      const el = document.createElement("div");
      el.className = "text-deco" + (state.selectedId === t.id ? " is-selected" : "");
      el.dataset.id = t.id;
      el.textContent = t.text;
      el.style.left = t.x + "%";
      el.style.top = t.y + "%";
      el.style.color = t.color;
      el.style.zIndex = t.z;
      el.style.transform = `translate(-50%, -50%) scale(${t.scale}) rotate(${t.rotation}deg)`;
      setupDrag(el, t, "text");
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectItem(t.id);
      });
      els.textLayer.appendChild(el);
    });
  }

  function selectItem(id) {
    state.selectedId = id;
    state.pickedStickerId = null;
    els.selectedTip.hidden = true;
    renderPalette();
    renderStickers();
    renderTexts();
    updateEditBar();
  }

  function updateEditBar() {
    const item = state.selectedId ? getItem(state.selectedId) : null;
    els.editBar.hidden = !item;
  }

  function setupDrag(el, data, kind) {
    let sx, sy, ox, oy;
    function pt(e) {
      return e.touches ? e.touches[0] : e;
    }
    function onStart(e) {
      if (state.tool === "glitter") return;
      e.preventDefault();
      e.stopPropagation();
      selectItem(data.id);
      const p = pt(e);
      sx = p.clientX;
      sy = p.clientY;
      ox = data.x;
      oy = data.y;
      pushHistory();
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    }
    function onMove(e) {
      e.preventDefault();
      const p = pt(e);
      const r = els.canvasWrap.getBoundingClientRect();
      data.x = Math.max(3, Math.min(97, ox + ((p.clientX - sx) / r.width) * 100));
      data.y = Math.max(3, Math.min(97, oy + ((p.clientY - sy) / r.height) * 100));
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
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      pushHistory();
      if (kind === "sticker") state.stickers = state.stickers.filter((s) => s.id !== data.id);
      else state.texts = state.texts.filter((t) => t.id !== data.id);
      state.selectedId = null;
      renderAll();
    });
  }

  /* ---- Glitter ---- */
  function resizeGlitterCanvas() {
    const r = els.canvasWrap.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    els.glitterCanvas.width = Math.round(r.width * dpr);
    els.glitterCanvas.height = Math.round(r.height * dpr);
    els.glitterCanvas.style.width = r.width + "px";
    els.glitterCanvas.style.height = r.height + "px";
    gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawGlitter();
  }

  function drawGlitterPoint(xPct, yPct) {
    const r = els.canvasWrap.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    if (!w || !h) return;
    const x = (xPct / 100) * w;
    const y = (yPct / 100) * h;
    const size = 4 + Math.random() * 8;
    state.glitter.push({ x: xPct, y: yPct, color: state.glitterColor, size });
    gCtx.save();
    gCtx.fillStyle = state.glitterColor;
    gCtx.shadowColor = state.glitterColor;
    gCtx.shadowBlur = 8;
    gCtx.beginPath();
    gCtx.arc(x, y, size, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.fillStyle = "#fff";
    gCtx.globalAlpha = 0.6;
    gCtx.beginPath();
    gCtx.arc(x - size * 0.2, y - size * 0.2, size * 0.3, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.restore();
  }

  function redrawGlitter() {
    const r = els.canvasWrap.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    const c = els.glitterCanvas;
    if (!w || !h || !c.width) return;
    gCtx.save();
    gCtx.setTransform(1, 0, 0, 1, 0, 0);
    gCtx.clearRect(0, 0, c.width, c.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.glitter.forEach((g) => {
      const x = (g.x / 100) * w;
      const y = (g.y / 100) * h;
      gCtx.fillStyle = g.color;
      gCtx.shadowColor = g.color;
      gCtx.shadowBlur = 6;
      gCtx.beginPath();
      gCtx.arc(x, y, g.size, 0, Math.PI * 2);
      gCtx.fill();
    });
    gCtx.restore();
  }

  function clearAllDecorations() {
    const had =
      state.stickers.length > 0 ||
      state.texts.length > 0 ||
      state.glitter.length > 0;
    if (had) pushHistory();

    state.stickers = [];
    state.texts = [];
    state.glitter = [];
    state.selectedId = null;
    state.pickedStickerId = null;

    els.layer.innerHTML = "";
    els.textLayer.innerHTML = "";
    redrawGlitter();
    updateEditBar();
    renderPalette();
    els.selectedTip.hidden = true;

    toast(had ? "All decorations cleared!" : "Nothing to clear yet!");
  }

  function canvasPoint(e) {
    const r = els.canvasWrap.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: ((p.clientX - r.left) / r.width) * 100,
      y: ((p.clientY - r.top) / r.height) * 100,
    };
  }

  els.canvasWrap.addEventListener("mousedown", onCanvasDown);
  els.canvasWrap.addEventListener("touchstart", onCanvasDown, { passive: false });

  function onCanvasDown(e) {
    if (e.target.closest(".sticker, .text-deco")) return;
    const pt = canvasPoint(e);

    if (state.tool === "glitter") {
      pushHistory();
      glitterDrawing = true;
      drawGlitterPoint(pt.x, pt.y);
      const onMove = (ev) => {
        ev.preventDefault();
        drawGlitterPoint(canvasPoint(ev).x, canvasPoint(ev).y);
      };
      const onEnd = () => {
        glitterDrawing = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
      return;
    }

    if (state.tool === "text") {
      addText(pt.x, pt.y);
      return;
    }

    if (state.pickedStickerId) addSticker(state.pickedStickerId, pt.x, pt.y);
    else {
      state.selectedId = null;
      updateEditBar();
      renderStickers();
      renderTexts();
    }
  }

  /* Glitter colors */
  const gc = document.getElementById("glitterColors");
  GLITTER_COLORS.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (c === state.glitterColor ? " is-active" : "");
    b.style.background = c;
    if (c === "#ffffff") b.style.border = "2px solid #ddd";
    b.addEventListener("click", () => {
      state.glitterColor = c;
      gc.querySelectorAll(".swatch").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
    });
    gc.appendChild(b);
  });

  const tc = document.getElementById("textColors");
  ["#ff6eb4", "#c56cf0", "#ffd93d", "#4d96ff", "#ffffff", "#e84393", "#5cd85a"].forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (c === state.textColor ? " is-active" : "");
    b.style.background = c;
    b.addEventListener("click", () => {
      state.textColor = c;
      tc.querySelectorAll(".swatch").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
    });
    tc.appendChild(b);
  });

  els.nameInput?.addEventListener("input", (e) => {
    state.textValue = e.target.value;
  });

  document.getElementById("btnClearGlitter")?.addEventListener("click", () => {
    if (!state.glitter.length) return;
    pushHistory();
    state.glitter = [];
    redrawGlitter();
    toast("Glitter cleared!");
  });

  /* ---- Edit bar ---- */
  function editSelected(fn) {
    const item = getItem(state.selectedId);
    if (!item) return;
    pushHistory();
    fn(item);
    renderAll();
  }

  document.getElementById("btnBigger")?.addEventListener("click", () => editSelected((i) => (i.scale = Math.min(2.5, i.scale + 0.15))));
  document.getElementById("btnSmaller")?.addEventListener("click", () => editSelected((i) => (i.scale = Math.max(0.4, i.scale - 0.15))));
  document.getElementById("btnRotate")?.addEventListener("click", () => editSelected((i) => (i.rotation = (i.rotation + 25) % 360)));
  document.getElementById("btnFlip")?.addEventListener("click", () => editSelected((i) => { if ("flip" in i) i.flip *= -1; }));
  document.getElementById("btnFront")?.addEventListener("click", () => editSelected((i) => (i.z = Math.max(...state.stickers.map((s) => s.z), ...state.texts.map((t) => t.z), 0) + 1)));
  document.getElementById("btnDelete")?.addEventListener("click", () => {
    if (!state.selectedId) return;
    pushHistory();
    state.stickers = state.stickers.filter((s) => s.id !== state.selectedId);
    state.texts = state.texts.filter((t) => t.id !== state.selectedId);
    state.selectedId = null;
    renderAll();
    toast("Deleted!");
  });

  document.getElementById("btnDeselect")?.addEventListener("click", () => {
    state.pickedStickerId = null;
    els.selectedTip.hidden = true;
    renderPalette();
  });

  document.getElementById("btnClearDeco")?.addEventListener("click", clearAllDecorations);

  document.getElementById("btnUndo")?.addEventListener("click", undo);

  document.getElementById("btnRandom")?.addEventListener("click", () => {
    const themes = Object.keys(THEMES);
    setTheme(themes[Math.floor(Math.random() * themes.length)]);
    if (!state.customDress) {
      state.color = THEMES[state.theme].colors[Math.floor(Math.random() * THEMES[state.theme].colors.length)];
      const pats = ["solid", "dots", "stripes", "stars", "hearts"];
      state.pattern = pats[Math.floor(Math.random() * pats.length)];
      document.querySelectorAll(".pat").forEach((b) => b.classList.toggle("is-active", b.dataset.pattern === state.pattern));
      applyDressStyle();
      renderSwatches();
    }
    state.stickers = [];
    state.texts = [];
    state.glitter = [];
    state.history = [];
    const fav = LIB.byTheme[state.theme];
    for (let i = 0; i < 5; i++) {
      const id = fav[Math.floor(Math.random() * fav.length)];
      state.stickers.push({
        id: "s" + Date.now() + i,
        stickerId: id,
        x: 15 + Math.random() * 70,
        y: 20 + Math.random() * 60,
        scale: 0.8 + Math.random() * 0.6,
        rotation: Math.floor(Math.random() * 40 - 20),
        flip: 1,
        z: i,
      });
    }
    for (let i = 0; i < 30; i++) {
      state.glitter.push({
        x: 10 + Math.random() * 80,
        y: 15 + Math.random() * 75,
        color: GLITTER_COLORS[Math.floor(Math.random() * GLITTER_COLORS.length)],
        size: 4 + Math.random() * 6,
      });
    }
    renderAll();
    toast("Surprise outfit! 🎉");
  });

  document.getElementById("btnSave")?.addEventListener("click", async () => {
    toast("Saving...");
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(els.canvasWrap, { backgroundColor: "#fff5fc", scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = "ceci-dress-" + Date.now() + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Saved! Check downloads 📸");
    } catch {
      toast("Try a screenshot to save!");
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

  function setTheme(name) {
    state.theme = name;
    if (!state.customDress) state.color = THEMES[name].colors[0];
    els.body.dataset.theme = name;
    els.themeLabel.textContent = THEMES[name].label;
    document.querySelectorAll(".theme-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.theme === name));
    renderSwatches();
    if (!state.customDress) applyDressStyle();
    toast(THEMES[name].label + "!");
  }

  document.querySelectorAll(".theme-btn").forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme)));
  document.querySelectorAll(".pat").forEach((b) => b.addEventListener("click", () => {
    state.pattern = b.dataset.pattern;
    document.querySelectorAll(".pat").forEach((x) => x.classList.toggle("is-active", x === b));
    applyDressStyle();
  }));

  window.addEventListener("resize", resizeGlitterCanvas);

  renderCatTabs();
  renderPalette();
  renderSwatches();
  setTheme("unicorn");
  setTool("sticker");
  requestAnimationFrame(resizeGlitterCanvas);
})();
