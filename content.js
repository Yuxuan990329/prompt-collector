const STORAGE_KEY = "savedPrompts";
const WIDTH_KEY = "sidebarWidth";
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 320;
const MAX_WIDTH = 1400;
const CATEGORY_OPTIONS = [
  "Writing",
  "Analysis",
  "Coding",
  "Research",
  "Prompt Engineering",
  "Other"
];

const state = {
  isOpen: false,
  view: "list",
  width: DEFAULT_WIDTH,
  prompts: [],
  selectedIds: []
};

let host;
let mounted = false;

bootstrap();

async function bootstrap() {
  const stored = await chrome.storage.local.get([STORAGE_KEY, WIDTH_KEY]);
  state.prompts = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  state.width = clampWidth(stored[WIDTH_KEY]);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "PC_TOGGLE_SIDEBAR") {
      toggleSidebar();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[STORAGE_KEY]) {
      state.prompts = Array.isArray(changes[STORAGE_KEY].newValue)
        ? changes[STORAGE_KEY].newValue
        : [];
      state.selectedIds = state.selectedIds.filter((id) =>
        state.prompts.some((prompt) => prompt.id === id)
      );

      if (state.view === "compare" && state.selectedIds.length !== 2) {
        state.view = "list";
      }

      if (state.isOpen) {
        render();
      }
    }

    if (changes[WIDTH_KEY]) {
      state.width = clampWidth(changes[WIDTH_KEY].newValue);

      if (state.isOpen) {
        applySidebarWidth();
      }
    }
  });
}

function toggleSidebar() {
  if (!mounted) {
    mountSidebar();
  }

  state.isOpen = !state.isOpen;
  state.view = "list";
  render();
}

function mountSidebar() {
  host = document.createElement("div");
  host.id = "pc-sidebar-host";
  document.body.appendChild(host);
  mounted = true;
}

function render() {
  if (!host) {
    return;
  }

  host.hidden = !state.isOpen;
  document.documentElement.classList.toggle("pc-sidebar-open", state.isOpen);
  applySidebarWidth();

  if (!state.isOpen) {
    return;
  }

  host.innerHTML = `
    <div class="pc-sidebar">
      <div class="pc-resizer" id="pc-resizer" title="Drag to resize"></div>
      <button class="pc-sidebar-toggle" id="pc-sidebar-toggle" type="button">
        &rsaquo;
      </button>
      <div class="pc-shell">
        <header class="pc-header">
          <div>
            <p class="pc-eyebrow">Prompt Vault</p>
            <h2>Prompt Collector</h2>
          </div>
          <button class="pc-icon-button" id="pc-close-button" type="button">X</button>
        </header>

        ${
          state.view === "list"
            ? renderListView()
            : renderCompareView()
        }
      </div>
    </div>
  `;

  bindEvents();
}

function renderListView() {
  const compareBar = state.selectedIds.length === 2
    ? `
      <div class="pc-compare-bar">
        <span>2 prompts selected</span>
        <button class="pc-primary-button" id="pc-compare-button" type="button">Compare Selected</button>
      </div>
    `
    : "";

  const promptItems = state.prompts
    .slice()
    .reverse()
    .map((prompt) => {
      const checked = state.selectedIds.includes(prompt.id) ? "checked" : "";

      return `
        <li class="pc-card">
          <label class="pc-compare-toggle">
            <input data-role="compare" data-id="${prompt.id}" type="checkbox" ${checked} />
            <span>Compare</span>
          </label>
          <div class="pc-meta">
            <span class="pc-tag">${escapeHtml(prompt.platform)}</span>
            <span class="pc-tag pc-tag-muted">${escapeHtml(prompt.category || "Other")}</span>
            <span class="pc-time">${formatTimestamp(prompt.savedAt)}</span>
          </div>
          <h4 class="pc-title">${escapeHtml(prompt.name || "Untitled Prompt")}</h4>
          <p class="pc-content">${escapeHtml(createPreview(prompt.content))}</p>
          <div class="pc-actions">
            <button class="pc-secondary-button" data-role="copy" data-id="${prompt.id}" type="button">Copy</button>
            <button class="pc-danger-button" data-role="delete" data-id="${prompt.id}" type="button">Delete</button>
          </div>
        </li>
      `;
    })
    .join("");

  return `
    <section class="pc-panel pc-form-panel">
      <div class="pc-form-grid">
        <div>
          <label class="pc-label" for="pc-platform">Platform</label>
          <select id="pc-platform" class="pc-select">
            ${["ChatGPT", "Claude", "Gemini", "Other"]
              .map((item) => `<option value="${item}">${item}</option>`)
              .join("")}
          </select>
        </div>

        <div>
          <label class="pc-label" for="pc-name">Prompt Name</label>
          <input id="pc-name" class="pc-input" type="text" placeholder="e.g. Travel Planner" />
        </div>

        <div>
          <label class="pc-label" for="pc-category">Category</label>
          <select id="pc-category" class="pc-select">
            ${CATEGORY_OPTIONS.map((item) => `<option value="${item}">${item}</option>`).join("")}
          </select>
        </div>
      </div>

      <div id="pc-custom-platform-wrap" class="pc-custom-field" hidden>
        <label class="pc-label" for="pc-custom-platform">Custom Platform</label>
        <input
          id="pc-custom-platform"
          class="pc-input"
          type="text"
          placeholder="Type your platform here"
        />
      </div>

      <div id="pc-custom-category-wrap" class="pc-custom-field" hidden>
        <label class="pc-label" for="pc-custom-category">Custom Category</label>
        <input
          id="pc-custom-category"
          class="pc-input"
          type="text"
          placeholder="Type your category here"
        />
      </div>

      <label class="pc-label" for="pc-input">Prompt</label>
      <textarea id="pc-input" class="pc-textarea" placeholder="Paste your prompt here..."></textarea>
      <button class="pc-primary-button" id="pc-save-button" type="button">Save Prompt</button>
      <p class="pc-feedback" id="pc-feedback"></p>
    </section>

    <section class="pc-list-section">
      <div class="pc-list-head">
        <div>
          <h3>Saved Prompts</h3>
          <p>Select up to two prompts to compare.</p>
        </div>
        <div class="pc-list-head-actions">
          <button class="pc-head-button" id="pc-open-workspace-button" type="button">
            Open Workspace
          </button>
          <span class="pc-count">${state.prompts.length}</span>
        </div>
      </div>
      ${
        state.prompts.length
          ? `<ul class="pc-list">${promptItems}</ul>`
          : `<div class="pc-empty">No prompts saved yet.</div>`
      }
    </section>

    ${compareBar}
  `;
}

function renderCompareView() {
  const selectedPrompts = getSelectedPrompts();

  return `
    <section class="pc-compare-view">
      <div class="pc-compare-head">
        <button class="pc-back-button" id="pc-back-button" type="button">&larr; Back</button>
        <div>
          <h3>Compare Versions</h3>
          <p>Full content side by side.</p>
        </div>
      </div>
      <div class="pc-compare-grid">
        ${selectedPrompts
          .map((prompt, index) => {
            const title = index === 0 ? "Version A" : "Version B";

            return `
              <article class="pc-card pc-compare-card">
                <div class="pc-meta">
                  <span class="pc-version">${title}</span>
                  <span class="pc-tag">${escapeHtml(prompt.platform)}</span>
                </div>
                <h4 class="pc-title">${escapeHtml(prompt.name || "Untitled Prompt")}</h4>
                <p class="pc-compare-category">${escapeHtml(prompt.category || "Other")}</p>
                <p class="pc-time pc-time-block">${formatTimestamp(prompt.savedAt)}</p>
                <pre class="pc-compare-content">${escapeHtml(prompt.content)}</pre>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function bindEvents() {
  host.querySelector("#pc-sidebar-toggle")?.addEventListener("click", () => {
    state.isOpen = false;
    render();
  });

  host.querySelector("#pc-close-button")?.addEventListener("click", () => {
    state.isOpen = false;
    render();
  });

  host.querySelector("#pc-save-button")?.addEventListener("click", savePrompt);
  host.querySelector("#pc-open-workspace-button")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "PC_OPEN_WORKSPACE" });
  });
  host.querySelector("#pc-platform")?.addEventListener("change", toggleCustomPlatform);
  host.querySelector("#pc-category")?.addEventListener("change", toggleCustomCategory);
  host.querySelector("#pc-compare-button")?.addEventListener("click", () => {
    state.view = "compare";
    render();
  });
  host.querySelector("#pc-back-button")?.addEventListener("click", () => {
    state.view = "list";
    render();
  });

  host.querySelectorAll("[data-role='compare']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const { id } = event.currentTarget.dataset;
      updateSelection(id, event.currentTarget.checked);
      render();
    });
  });

  host.querySelectorAll("[data-role='copy']").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const prompt = findPrompt(event.currentTarget.dataset.id);

      if (!prompt) {
        return;
      }

      await navigator.clipboard.writeText(prompt.content);
      setFeedback("Prompt copied.");
    });
  });

  host.querySelectorAll("[data-role='delete']").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const promptId = event.currentTarget.dataset.id;
      state.selectedIds = state.selectedIds.filter((id) => id !== promptId);
      await chrome.storage.local.set({
        [STORAGE_KEY]: state.prompts.filter((prompt) => prompt.id !== promptId)
      });
      setFeedback("Prompt deleted.");
    });
  });

  host.querySelector("#pc-resizer")?.addEventListener("mousedown", startResize);
  toggleCustomPlatform();
  toggleCustomCategory();
}

async function savePrompt() {
  const textarea = host.querySelector("#pc-input");
  const platform = host.querySelector("#pc-platform");
  const customPlatformInput = host.querySelector("#pc-custom-platform");
  const nameInput = host.querySelector("#pc-name");
  const categorySelect = host.querySelector("#pc-category");
  const customCategoryInput = host.querySelector("#pc-custom-category");
  const content = textarea.value.trim();
  const platformValue =
    platform.value === "Other"
      ? customPlatformInput.value.trim()
      : platform.value;
  const name = nameInput.value.trim();
  const category =
    categorySelect.value === "Other"
      ? customCategoryInput.value.trim()
      : categorySelect.value;

  if (!platformValue) {
    setFeedback("Enter a platform before saving.", true);
    customPlatformInput.focus();
    return;
  }

  if (!name) {
    setFeedback("Enter a prompt name before saving.", true);
    nameInput.focus();
    return;
  }

  if (!category) {
    setFeedback("Enter a category before saving.", true);
    customCategoryInput.focus();
    return;
  }

  if (!content) {
    setFeedback("Enter a prompt before saving.", true);
    textarea.focus();
    return;
  }

  const nextPrompts = [
    ...state.prompts,
    {
      id: crypto.randomUUID(),
      name,
      category,
      content,
      platform: platformValue,
      savedAt: new Date().toISOString()
    }
  ];

  await chrome.storage.local.set({ [STORAGE_KEY]: nextPrompts });
  platform.value = "ChatGPT";
  customPlatformInput.value = "";
  nameInput.value = "";
  categorySelect.value = CATEGORY_OPTIONS[0];
  customCategoryInput.value = "";
  textarea.value = "";
  setFeedback("Prompt saved.");
  toggleCustomPlatform();
  toggleCustomCategory();
  nameInput.focus();
}

function updateSelection(promptId, checked) {
  if (checked) {
    state.selectedIds = [...state.selectedIds.filter((id) => id !== promptId), promptId];

    if (state.selectedIds.length > 2) {
      state.selectedIds = state.selectedIds.slice(-2);
    }

    return;
  }

  state.selectedIds = state.selectedIds.filter((id) => id !== promptId);
}

function startResize(event) {
  event.preventDefault();

  const startX = event.clientX;
  const startWidth = state.width;

  const onMove = (moveEvent) => {
    state.width = clampWidth(startWidth + (moveEvent.clientX - startX));
    applySidebarWidth();
  };

  const onUp = async () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    await chrome.storage.local.set({ [WIDTH_KEY]: state.width });
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function applySidebarWidth() {
  const width = state.isOpen ? `${state.width}px` : "0px";
  document.documentElement.style.setProperty("--pc-sidebar-width", width);

  if (host) {
    host.style.width = width;
  }
}

function getSelectedPrompts() {
  return state.selectedIds
    .map((id) => findPrompt(id))
    .filter(Boolean)
    .slice(0, 2);
}

function findPrompt(id) {
  return state.prompts.find((prompt) => prompt.id === id);
}

function createPreview(content) {
  return content.length > 50 ? `${content.slice(0, 50)}...` : content;
}

function toggleCustomCategory() {
  const categorySelect = host?.querySelector("#pc-category");
  const customCategoryWrap = host?.querySelector("#pc-custom-category-wrap");
  const customCategoryInput = host?.querySelector("#pc-custom-category");

  if (!categorySelect || !customCategoryWrap || !customCategoryInput) {
    return;
  }

  const isOther = categorySelect.value === "Other";
  customCategoryWrap.hidden = !isOther;
  customCategoryInput.required = isOther;
}

function toggleCustomPlatform() {
  const platformSelect = host?.querySelector("#pc-platform");
  const customPlatformWrap = host?.querySelector("#pc-custom-platform-wrap");
  const customPlatformInput = host?.querySelector("#pc-custom-platform");

  if (!platformSelect || !customPlatformWrap || !customPlatformInput) {
    return;
  }

  const isOther = platformSelect.value === "Other";
  customPlatformWrap.hidden = !isOther;
  customPlatformInput.required = isOther;
}

function setFeedback(message, isError = false) {
  const feedback = host?.querySelector("#pc-feedback");

  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.dataset.state = isError ? "error" : "success";
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function clampWidth(value) {
  const width = Number(value) || DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
