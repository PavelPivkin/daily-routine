(function () {
  function encode(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decode(value) {
    try {
      const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      if (payload?.version !== 1 || !payload.weekStart || typeof payload.schedule !== "object") return null;
      return payload;
    } catch {
      return null;
    }
  }

  function createUrl(page, payload, extra = {}) {
    const url = new URL(page, location.href);
    Object.entries(extra).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    url.searchParams.set("plan", encode(payload));
    return url.toString();
  }

  function copy(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.left = "-9999px";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("copy-failed");
  }

  function show(url, title) {
    document.querySelector(".share-dialog-backdrop")?.remove();
    const backdrop = document.createElement("div");
    backdrop.className = "share-dialog-backdrop";
    backdrop.innerHTML = `
      <section class="share-dialog" role="dialog" aria-modal="true" aria-label="${title}">
        <button class="close-button share-dialog-close" aria-label="Закрыть">×</button>
        <div class="share-dialog-icon">↗</div>
        <p class="eyebrow">План сохранён прямо в URL</p>
        <h2>${title}</h2>
        <p>Отправьте эту ссылку человеку — план откроется без регистрации и сервера.</p>
        <input class="share-url" value="${url.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" readonly>
        <button class="primary-button share-copy-button">Скопировать ссылку</button>
      </section>
    `;
    document.body.append(backdrop);
    document.body.style.overflow = "hidden";
    const input = backdrop.querySelector(".share-url");
    input.focus();
    input.select();
    const close = () => {
      backdrop.remove();
      document.body.style.overflow = "";
    };
    backdrop.querySelector(".share-dialog-close").addEventListener("click", close);
    backdrop.addEventListener("click", event => { if (event.target === backdrop) close(); });
    backdrop.querySelector(".share-copy-button").addEventListener("click", () => {
      input.select();
      try {
        copy(url);
        backdrop.querySelector(".share-copy-button").textContent = "Скопировано ✓";
      } catch {
        backdrop.querySelector(".share-copy-button").textContent = "Выделено — нажмите Ctrl/Cmd + C";
      }
    });
  }

  window.FamilyShare = { decode, createUrl, copy, show };
})();
