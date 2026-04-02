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
