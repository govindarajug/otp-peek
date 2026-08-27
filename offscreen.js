"use strict";
// Chrome offscreen document: the only place a MV3 service worker can reach
// the clipboard from. navigator.clipboard needs focus, which offscreen docs
// never have — execCommand("copy") is the supported route here.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "copyToClipboard") return;
  const textarea = document.createElement("textarea");
  document.body.append(textarea);
  textarea.value = msg.text;
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  sendResponse(true);
});
