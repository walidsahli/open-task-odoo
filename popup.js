const DEFAULT_CONFIG = {
  branchSelector: 'a[href*="odoo-dev"][title^="odoo-dev"]',
  pullRequestBodySelector: '.js-command-palette-pull-body',
};

const branchInput = document.getElementById("branchSelector");
const bodyInput = document.getElementById("pullRequestBodySelector");
const saveButton = document.getElementById("saveButton");
const resetButton = document.getElementById("resetButton");
const statusEl = document.getElementById("status");

const setStatus = (text, timeout = 1800) => {
  statusEl.textContent = text || "";
  if (text && timeout) {
    setTimeout(() => {
      if (statusEl.textContent === text) {
        statusEl.textContent = "";
      }
    }, timeout);
  }
};

const load = () => {
  chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
    if (chrome.runtime.lastError) {
      console.warn("Odoo github extension: could not load config", chrome.runtime.lastError);
      branchInput.value = DEFAULT_CONFIG.branchSelector;
      bodyInput.value = DEFAULT_CONFIG.pullRequestBodySelector;
      return;
    }
    branchInput.value = items.branchSelector || DEFAULT_CONFIG.branchSelector;
    bodyInput.value = items.pullRequestBodySelector || DEFAULT_CONFIG.pullRequestBodySelector;
  });
};

const save = () => {
  saveButton.disabled = true;
  setStatus("Saving…", 0);

  const value = {
    branchSelector: branchInput.value.trim() || DEFAULT_CONFIG.branchSelector,
    pullRequestBodySelector: bodyInput.value.trim() || DEFAULT_CONFIG.pullRequestBodySelector,
  };

  chrome.storage.sync.set(value, () => {
    saveButton.disabled = false;
    if (chrome.runtime.lastError) {
      console.error("Odoo github extension: could not save config", chrome.runtime.lastError);
      setStatus("Save failed", 2500);
      return;
    }
    setStatus("Saved ✔", 2000);
  });
};

const resetDefaults = () => {
  branchInput.value = DEFAULT_CONFIG.branchSelector;
  bodyInput.value = DEFAULT_CONFIG.pullRequestBodySelector;
  save();
};

saveButton.addEventListener("click", save);
resetButton.addEventListener("click", resetDefaults);

document.addEventListener("DOMContentLoaded", load);

