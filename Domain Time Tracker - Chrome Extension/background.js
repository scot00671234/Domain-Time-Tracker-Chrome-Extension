let currentDomain = null;
let startTime = null;
const domainTimes = {};

// Utility function to get the domain from a URL
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

// Start tracking time for a domain
function startTracking(domain) {
  currentDomain = domain;
  startTime = Date.now();
}

// Stop tracking time for the current domain
function stopTracking() {
  if (currentDomain && startTime) {
    const timeSpent = Date.now() - startTime;
    domainTimes[currentDomain] = (domainTimes[currentDomain] || 0) + timeSpent;
    startTime = null;
    currentDomain = null;
  }
}

// Listen for tab changes to update the active domain
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  stopTracking();
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const domain = getDomain(tab.url);
  startTracking(domain);
});

// Listen for URL updates within the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    stopTracking();
    const domain = getDomain(changeInfo.url);
    startTracking(domain);
  }
});

// Listen for the browser being idle or closed
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopTracking();
  }
});

// Save the tracked time data in storage periodically
chrome.runtime.onSuspend.addListener(() => {
  stopTracking();
  chrome.storage.local.set({ domainTimes });
});
