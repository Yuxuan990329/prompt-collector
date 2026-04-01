const STORAGE_KEY = "savedPrompts";
const PREVIEW_LIMIT = 50;

document.addEventListener("DOMContentLoaded", async () => {
  bindComposerEvents();
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

async function handleSavePrompt() {
  const textarea = document.getElementById("prompt-input");
  const platformSelect = document.getElementById("platform-select");
  const feedback = document.getElementById("save-feedback");
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
  feedback.dataset.state = "success";
  showFeedback("Prompt saved.");
  textarea.focus();
}

async function renderPrompts() {
  const promptList = document.getElementById("prompt-list");
  const emptyState = document.getElementById("empty-state");
  const countBadge = document.getElementById("prompt-count");
  const prompts = await getSavedPrompts();

  countBadge.textContent = String(prompts.length);
  promptList.innerHTML = "";

  if (prompts.length === 0) {
    emptyState.hidden = false;
    promptList.hidden = true;
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
      item.append(meta, content, actions);
      promptList.append(item);
    });
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
