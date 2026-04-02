const STORAGE_KEY = "savedPrompts";
const PREVIEW_LIMIT = 50;

let selectedPromptIds = [];
let activeView = "list";

document.addEventListener("DOMContentLoaded", async () => {
  bindComposerEvents();
  bindCompareEvents();
  await renderPrompts();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      renderPrompts();
    }
  });
});

function bindComposerEvents() {
  const saveButton = document.getElementById("save-prompt-button");
  const textarea = document.getElementById("prompt-input");

  saveButton.addEventListener("click", handleSavePrompt);
  textarea.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      handleSavePrompt();
    }
  });
}

function bindCompareEvents() {
  const compareButton = document.getElementById("compare-selected-button");
  const backButton = document.getElementById("back-to-list-button");

  compareButton.addEventListener("click", handleCompareSelected);
  backButton.addEventListener("click", () => {
    activeView = "list";
    updateView();
  });
}

async function handleSavePrompt() {
  const textarea = document.getElementById("prompt-input");
  const platformSelect = document.getElementById("platform-select");
  const content = textarea.value.trim();

  if (!content) {
    showFeedback("Enter a prompt before saving.", true);
    textarea.focus();
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    content,
    platform: platformSelect.value,
    savedAt: new Date().toISOString()
  };

  const prompts = await getSavedPrompts();
  prompts.push(entry);

  await chrome.storage.local.set({ [STORAGE_KEY]: prompts });

  textarea.value = "";
  showFeedback("Prompt saved.");
  textarea.focus();
}

async function handleCompareSelected() {
  const prompts = await getSavedPrompts();
  const selectedPrompts = getSelectedPrompts(prompts);

  if (selectedPrompts.length !== 2) {
    showFeedback("Select exactly 2 prompts to compare.", true);
    return;
  }

  activeView = "compare";
  renderCompareView(selectedPrompts);
  updateView();
}

async function renderPrompts() {
  const promptList = document.getElementById("prompt-list");
  const emptyState = document.getElementById("empty-state");
  const countBadge = document.getElementById("prompt-count");
  const prompts = await getSavedPrompts();

  selectedPromptIds = selectedPromptIds.filter((id) =>
    prompts.some((prompt) => prompt.id === id)
  );

  countBadge.textContent = String(prompts.length);
  promptList.innerHTML = "";

  if (prompts.length === 0) {
    emptyState.hidden = false;
    promptList.hidden = true;
    activeView = "list";
    updateCompareBar();
    updateView();
    return;
  }

  emptyState.hidden = true;
  promptList.hidden = false;

  prompts
    .slice()
    .reverse()
    .forEach((prompt) => {
      const item = document.createElement("li");
      item.className = "pc-prompt-item";

      const compareRow = document.createElement("div");
      compareRow.className = "pc-compare-toggle-row";

      const compareLabel = document.createElement("label");
      compareLabel.className = "pc-compare-toggle";

      const compareCheckbox = document.createElement("input");
      compareCheckbox.type = "checkbox";
      compareCheckbox.checked = selectedPromptIds.includes(prompt.id);
      compareCheckbox.addEventListener("change", () => {
        handleCompareToggle(prompt.id, compareCheckbox.checked);
      });

      const compareText = document.createElement("span");
      compareText.textContent = "Compare";

      compareLabel.append(compareCheckbox, compareText);
      compareRow.append(compareLabel);

      const meta = document.createElement("div");
      meta.className = "pc-prompt-meta";

      const platform = document.createElement("span");
      platform.className = "pc-platform-tag";
      platform.textContent = prompt.platform;

      const time = document.createElement("span");
      time.className = "pc-prompt-time";
      time.textContent = formatTimestamp(prompt.savedAt);

      meta.append(platform, time);

      const content = document.createElement("p");
      content.className = "pc-prompt-content";
      content.textContent = createPromptPreview(prompt.content);

      const actions = document.createElement("div");
      actions.className = "pc-prompt-actions";

      const copyButton = document.createElement("button");
      copyButton.className = "pc-secondary-button";
      copyButton.type = "button";
      copyButton.textContent = "Copy";
      copyButton.addEventListener("click", async () => {
        await navigator.clipboard.writeText(prompt.content);
        showFeedback("Prompt copied.");
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "pc-delete-button";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        await deletePrompt(prompt.id);
        showFeedback("Prompt deleted.");
      });

      actions.append(copyButton, deleteButton);
      item.append(compareRow, meta, content, actions);
      promptList.append(item);
    });

  updateCompareBar();

  if (activeView === "compare") {
    const selectedPrompts = getSelectedPrompts(prompts);

    if (selectedPrompts.length === 2) {
      renderCompareView(selectedPrompts);
    } else {
      activeView = "list";
    }
  }

  updateView();
}

function handleCompareToggle(promptId, isChecked) {
  if (isChecked) {
    selectedPromptIds = [...selectedPromptIds.filter((id) => id !== promptId), promptId];

    if (selectedPromptIds.length > 2) {
      selectedPromptIds = selectedPromptIds.slice(selectedPromptIds.length - 2);
    }
  } else {
    selectedPromptIds = selectedPromptIds.filter((id) => id !== promptId);
  }

  renderPrompts();
}

function updateCompareBar() {
  const compareBar = document.getElementById("compare-bar");
  const compareSummary = document.getElementById("compare-summary");
  const selectedCount = selectedPromptIds.length;

  compareSummary.textContent =
    selectedCount === 2 ? "2 prompts selected" : `${selectedCount} prompt selected`;
  compareBar.hidden = selectedCount !== 2;
}

function renderCompareView(selectedPrompts) {
  const compareGrid = document.getElementById("compare-grid");
  const versionLabels = ["Version A", "Version B"];

  compareGrid.innerHTML = "";

  selectedPrompts.forEach((prompt, index) => {
    const card = document.createElement("article");
    card.className = "pc-compare-card";

    const cardHeader = document.createElement("div");
    cardHeader.className = "pc-compare-card-header";

    const versionBadge = document.createElement("span");
    versionBadge.className = "pc-version-badge";
    versionBadge.textContent = versionLabels[index];

    const platform = document.createElement("span");
    platform.className = "pc-platform-tag";
    platform.textContent = prompt.platform;

    cardHeader.append(versionBadge, platform);

    const time = document.createElement("p");
    time.className = "pc-compare-time";
    time.textContent = formatTimestamp(prompt.savedAt);

    const content = document.createElement("pre");
    content.className = "pc-compare-content";
    content.textContent = prompt.content;

    card.append(cardHeader, time, content);
    compareGrid.append(card);
  });
}

function updateView() {
  const listView = document.getElementById("list-view");
  const compareView = document.getElementById("compare-view");

  listView.hidden = activeView !== "list";
  compareView.hidden = activeView !== "compare";
}

async function getSavedPrompts() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
}

async function deletePrompt(promptId) {
  const prompts = await getSavedPrompts();
  const nextPrompts = prompts.filter((prompt) => prompt.id !== promptId);
  await chrome.storage.local.set({ [STORAGE_KEY]: nextPrompts });
}

function getSelectedPrompts(prompts) {
  return selectedPromptIds
    .map((id) => prompts.find((prompt) => prompt.id === id))
    .filter(Boolean);
}

function createPromptPreview(content) {
  if (content.length <= PREVIEW_LIMIT) {
    return content;
  }

  return `${content.slice(0, PREVIEW_LIMIT)}...`;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function showFeedback(message, isError = false) {
  const feedback = document.getElementById("save-feedback");
  feedback.textContent = message;
  feedback.dataset.state = isError ? "error" : "success";
}
