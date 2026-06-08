const DEFAULT_CONFIG = {
  branchSelector: 'a[href*="odoo-dev"]',
  pullRequestBodySelector: '.js-command-palette-pull-body',
};

const loadConfig = (callback) => {
  try {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      callback(DEFAULT_CONFIG);
      return;
    }
  } catch (e) {
    // `chrome` not available (e.g. running directly in page) – use defaults
    callback(DEFAULT_CONFIG);
    return;
  }

  chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
    // In case of any error, silently fall back to defaults
    if (chrome.runtime && chrome.runtime.lastError) {
      console.warn("Odoo github extension: using default config", chrome.runtime.lastError);
      callback(DEFAULT_CONFIG);
      return;
    }
    callback(items || DEFAULT_CONFIG);
  });
};

const extractId = (text, prefix) => {
  const match = text?.match(new RegExp(`${prefix}-(\\d+)`, "i"));
  return match ? match[1] : null;
};

const findId = (text, prefixes) => {
  return prefixes.map(prefix => extractId(text, prefix)).find(Boolean)
}

const linkifyIdsInNode = (root, prefixes) => {
  if (!root) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.match(/(opw-\d+|task-\d+)/i)) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        // Avoid code blocks / existing links / our own links
        if (["CODE", "PRE", "A"].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest(".odoo-task-linkified")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
    false
  );

  const regex = /(opw-(\d+)|task-(\d+))/gi;

  const toProcess = [];
  let current;
  while ((current = walker.nextNode())) {
    toProcess.push(current);
  }

  toProcess.forEach((textNode) => {
    const original = textNode.nodeValue;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(original))) {
      const full = match[0]; // e.g. "opw-1234"
      const rawId = match[2] || match[3]; // digits

      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(original.slice(lastIndex, match.index)));
      }

      const link = document.createElement("a");
      link.textContent = full;
      link.href = `https://www.odoo.com/odoo/all-tasks/${rawId}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.classList.add("odoo-task-linkified");
      Object.assign(link.style, {
        color: "#58a6ff",
        textDecoration: "underline",
        cursor: "pointer",
      });

      frag.appendChild(link);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < original.length) {
      frag.appendChild(document.createTextNode(original.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(frag, textNode);
  });
};

const getRunbotBatchUrl = () => {
  const link = document.querySelector('a[href*="runbot.odoo.com/runbot/batch/"]');
  if (!link) return null;
  const href = link.getAttribute("href");
  const match = href.match(/(https:\/\/runbot\.odoo\.com\/runbot\/batch\/\d+)/);
  return match ? match[1] : null;
};

const createButtons = (ticketId, runbotTicketId, branchName, runbotBatchUrl) => {
  const showTaskButton = ticketId || runbotTicketId;
  const buttons = [];

  if (showTaskButton) {
    const openTaskButton = document.createElement("a");
    openTaskButton.className = "odoo-task-button";
    openTaskButton.textContent = "🔗 Task";
    openTaskButton.title = "Open corresponding Odoo task";
    
    Object.assign(openTaskButton.style, {
      background: "#714B67",
      color: "white",
      border: "none",
      borderRadius: "6px",
      padding: "5px 12px",
      fontSize: "12px",
      fontWeight: "500",
      marginLeft: "8px",
      cursor: "pointer",
      transition: "background 0.2s ease, transform 0.1s ease",
    });

    const openTaskListener = () => {
      let url;
      if (ticketId) {
        url = `https://www.odoo.com/odoo/all-tasks/${ticketId}`;
      } else {
        url = `https://runbot.odoo.com/odoo/runbot.build.error/${runbotTicketId}`
      }
      window.open(url, "_blank");
    }
    openTaskButton.addEventListener("click", openTaskListener);
    buttons.push(openTaskButton);
  }

  const odooCopyButton = document.createElement("a");
  odooCopyButton.className = "odoo-branch-button";
  odooCopyButton.textContent = "📋 Branch";
  odooCopyButton.title = "Copy branch name";
  Object.assign(odooCopyButton.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "8px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "500",
    textDecoration: "none",
    color: "#ffffff",
    background: "#238636",
    border: "1px solid rgba(240,246,252,0.1)",
    borderRadius: "6px",
    cursor: "pointer",
  });

  odooCopyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(branchName);
      odooCopyButton.textContent = "✅ Copied!";
      setTimeout(() => (odooCopyButton.textContent = "📋 Branch"), 1500);
    } catch (err) {
      console.error(err);
    }
  });
  buttons.push(odooCopyButton);

  if (runbotBatchUrl) {
    const runbotButton = document.createElement("a");
    runbotButton.className = "odoo-runbot-button";
    runbotButton.textContent = "🤖 Runbot";
    runbotButton.title = "Open Runbot batch";
    runbotButton.href = runbotBatchUrl;
    runbotButton.target = "_blank";
    runbotButton.rel = "noopener noreferrer";
    Object.assign(runbotButton.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "8px",
      padding: "4px 10px",
      fontSize: "12px",
      fontWeight: "500",
      textDecoration: "none",
      color: "#ffffff",
      background: "#1f6feb",
      border: "1px solid rgba(240,246,252,0.1)",
      borderRadius: "6px",
      cursor: "pointer",
    });
    buttons.push(runbotButton);
  }

  return buttons;
};

const run = (config) => {
  try {
    const { branchSelector, pullRequestBodySelector } = config || DEFAULT_CONFIG;

    const [branchElement, stickyBranchElement] = document.querySelectorAll(branchSelector);
    const pullRequestBodyElement = document.querySelector(pullRequestBodySelector);
    const pullRequestBody = pullRequestBodyElement?.textContent;
    const branchTitle = (branchElement?.getAttribute("href") || stickyBranchElement?.getAttribute("href"))?.split("/").pop();
    const ticketId = findId(branchTitle, ["opw", "task"]) || findId(pullRequestBody, ["opw", "task"]);
    const runbotTicketId = findId(branchTitle, ["runbot"]) || findId(pullRequestBody, ["runbot"]);
    const runbotBatchUrl = getRunbotBatchUrl();

    // Make opw-XXX / task-XXX in the PR body clickable (handles multiple IDs)
    if (pullRequestBodyElement) {
      linkifyIdsInNode(pullRequestBodyElement, ["opw", "task"]);
    }

    // Add buttons to main header
    if (branchElement && !branchElement.closest("div").querySelector(".odoo-task-button, .odoo-branch-button")) {
      const container = branchElement;
      const buttons = createButtons(ticketId, runbotTicketId, branchTitle, runbotBatchUrl);
      buttons.forEach(button => container.closest("div").lastElementChild.after(button));
    }

    // Add buttons to sticky header
    if (stickyBranchElement && !stickyBranchElement.closest("div").querySelector(".odoo-task-button, .odoo-branch-button")) {
      const stickyContainer = stickyBranchElement;
      const buttons = createButtons(ticketId, runbotTicketId, branchTitle, runbotBatchUrl);
      buttons.forEach(button => stickyContainer.closest("div").lastElementChild.after(button));
    }
  } catch (error) {
    console.log("Odoo github extension", error)
  }
}

window.addEventListener('load', () => {
  loadConfig(run);
});
