let startTime = Date.now();
let currentUrl = '';
let activeTabId = null;
let trackingInterval = null;

function getDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function formatBadgeText(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

async function updateTime() {
  if (!currentUrl) return;

  const timeSpent = Date.now() - startTime;
  const domain = getDomain(currentUrl);

  if (!domain) return;

  const { timeData = {}, todayData = {} } = await chrome.storage.local.get(['timeData', 'todayData']);
  
  timeData[domain] = (timeData[domain] || 0) + 1000; // Add exactly 1 second
  todayData[domain] = (todayData[domain] || 0) + 1000; // Add exactly 1 second

  await chrome.storage.local.set({ timeData, todayData, lastUpdate: Date.now() });
  
  // Update badge
  chrome.action.setBadgeText({ text: formatBadgeText(todayData[domain]) });
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
}

async function startTracking(url, tabId) {
  // Stop existing tracking
  if (trackingInterval) {
    clearInterval(trackingInterval);
  }

  // Reset tracking state
  currentUrl = url;
  activeTabId = tabId;
  startTime = Date.now();

  // Start new tracking interval - exactly 1 second
  trackingInterval = setInterval(updateTime, 1000);
}

async function stopTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  currentUrl = '';
  activeTabId = null;
}

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab?.url) {
    await startTracking(tab.url, activeInfo.tabId);
  } else {
    await stopTracking();
  }
});

// Track URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    if (tab?.url) {
      await startTracking(tab.url, tabId);
    } else {
      await stopTracking();
    }
  }
});

// Track window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await stopTracking();
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await startTracking(tab.url, tab.id);
    }
  }
});