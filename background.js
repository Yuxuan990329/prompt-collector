chrome.runtime.onInstalled.addListener(() => {
  console.log("Prompt Collector installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PROMPT_SAVED") {
    console.log("Prompt saved from tab:", sender.tab?.id, message.payload);
    sendResponse({ ok: true });
  }

  return true;
});
