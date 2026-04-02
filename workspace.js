const STORAGE_KEY = "savedPrompts";
const sourceTabId = new URLSearchParams(window.location.search).get("sourceTabId");

const workspaceState = {
  prompts: [],
  search: "",
  category: "All",
  selectedIds: []
};

document.addEventListener("DOMContentLoaded", async () => {
  bindWorkspaceEvents();
  await loadPrompts();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      workspaceState.prompts = Array.isArray(changes[STORAGE_KEY].newValue)
        ? changes[STORAGE_KEY].newValue
        : [];
      workspaceState.selectedIds = workspaceState.selectedIds.filter((id) =>
        workspaceState.prompts.some((prompt) => prompt.id === id)
      );
      renderWorkspace();
    }
  });
});

function bindWorkspaceEvents() {
  document.getElementById("workspace-back").addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "PC_BACK_TO_SOURCE",
      sourceTabId
    });
  });

  document.getElementById("workspace-search").addEventListener("input", (event) => {
    workspaceState.search = event.target.value.trim().toLowerCase();
    renderWorkspace();
  });

  document.getElementById("workspace-category-filter").addEventListener("change", (event) => {
    workspaceState.category = event.target.value;
    renderWorkspace();
  });
}

async function loadPrompts() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  workspaceState.prompts = Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  renderWorkspace();
}

function renderWorkspace() {
  renderCategoryFilter();
  renderWorkspaceList();
  renderComparePanel("workspace-compare-a", getSelectedPrompt(0), "Version A");
  renderComparePanel("workspace-compare-b", getSelectedPrompt(1), "Version B");
}

function renderCategoryFilter() {
  const filter = document.getElementById("workspace-category-filter");
  const categories = ["All", ...new Set(workspaceState.prompts.map((prompt) => prompt.category || "Other"))];

  filter.innerHTML = categories
    .map((category) => {
      const selected = workspaceState.category === category ? "selected" : "";
      return `<option value="${escapeHtml(category)}" ${selected}>${escapeHtml(category)}</option>`;
    })
    .join("");
}

function renderWorkspaceList() {
  const list = document.getElementById("workspace-list");
  const prompts = getFilteredPrompts();

  if (!prompts.length) {
    list.innerHTML = `<div class="pc-workspace-empty">No prompts match your current search.</div>`;
    return;
  }

  list.innerHTML = prompts
    .map((prompt) => {
      const isSelected = workspaceState.selectedIds.includes(prompt.id);

      return `
        <button class="pc-workspace-item ${isSelected ? "is-selected" : ""}" data-id="${prompt.id}" type="button">
          <div class="pc-workspace-item-top">
            <span class="pc-workspace-name">${escapeHtml(prompt.name || "Untitled Prompt")}</span>
            <span class="pc-workspace-time">${formatTimestamp(prompt.savedAt)}</span>
          </div>
          <div class="pc-workspace-tags">
            <span class="pc-workspace-tag">${escapeHtml(prompt.platform || "Other")}</span>
            <span class="pc-workspace-tag pc-workspace-tag-muted">${escapeHtml(prompt.category || "Other")}</span>
          </div>
        </button>
      `;
    })
    .join("");

  list.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      updateWorkspaceSelection(button.dataset.id);
      renderWorkspace();
    });
  });
}

function renderComparePanel(containerId, prompt, versionLabel) {
  const container = document.getElementById(containerId);

  if (!prompt) {
    container.innerHTML = `
      <div class="pc-workspace-placeholder">
        <span class="pc-workspace-version">${versionLabel}</span>
        <p>Select a prompt from the left list.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <article class="pc-workspace-card">
      <div class="pc-workspace-card-head">
        <span class="pc-workspace-version">${versionLabel}</span>
        <span class="pc-workspace-time">${formatTimestamp(prompt.savedAt)}</span>
      </div>
      <h2>${escapeHtml(prompt.name || "Untitled Prompt")}</h2>
      <div class="pc-workspace-tags">
        <span class="pc-workspace-tag">${escapeHtml(prompt.platform || "Other")}</span>
        <span class="pc-workspace-tag pc-workspace-tag-muted">${escapeHtml(prompt.category || "Other")}</span>
      </div>
      <pre class="pc-workspace-content">${escapeHtml(prompt.content || "")}</pre>
    </article>
  `;
}

function updateWorkspaceSelection(promptId) {
  workspaceState.selectedIds = [
    ...workspaceState.selectedIds.filter((id) => id !== promptId),
    promptId
  ];

  if (workspaceState.selectedIds.length > 2) {
    workspaceState.selectedIds = workspaceState.selectedIds.slice(-2);
  }
}

function getFilteredPrompts() {
  return workspaceState.prompts
    .slice()
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .filter((prompt) => {
      const matchesCategory =
        workspaceState.category === "All" ||
        (prompt.category || "Other") === workspaceState.category;

      if (!matchesCategory) {
        return false;
      }

      if (!workspaceState.search) {
        return true;
      }

      const haystack = [
        prompt.name,
        prompt.category,
        prompt.platform,
        prompt.content
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(workspaceState.search);
    });
}

function getSelectedPrompt(index) {
  const selectedId = workspaceState.selectedIds[index];
  return workspaceState.prompts.find((prompt) => prompt.id === selectedId);
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
