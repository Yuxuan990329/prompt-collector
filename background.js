chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "PC_TOGGLE_SIDEBAR" });
  } catch (error) {
    console.warn("Prompt Collector toggle failed:", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "PC_OPEN_WORKSPACE") {
    const sourceTabId = sender.tab?.id;
    const url = new URL(chrome.runtime.getURL("workspace.html"));

    if (sourceTabId) {
      url.searchParams.set("sourceTabId", String(sourceTabId));
    }

    chrome.tabs.create({ url: url.toString() });
  }

  if (message?.type === "PC_BACK_TO_SOURCE") {
    const sourceTabId = Number(message.sourceTabId);
    const workspaceTabId = sender.tab?.id;

    if (sourceTabId) {
      chrome.tabs.update(sourceTabId, { active: true }, () => {
        if (!chrome.runtime.lastError && workspaceTabId) {
          chrome.tabs.remove(workspaceTabId);
        }
      });
      return;
    }

    if (workspaceTabId) {
      chrome.tabs.remove(workspaceTabId);
    }
  }
});
