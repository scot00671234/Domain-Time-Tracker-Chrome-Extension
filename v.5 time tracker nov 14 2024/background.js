let startTime = Date.now();
let currentUrl = '';
let isWindowFocused = true;
let currentTabId = null;
let lastUpdateTime = Date.now();

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

async function updateBadge() {
  if (!currentUrl || !isWindowFocused || !currentTabId) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const domain = getDomain(currentUrl);
  if (!domain) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const { todayData = {} } = await chrome.storage.local.get(['todayData']);
  const currentTime = todayData[domain] || 0;
  const elapsedTime = Date.now() - lastUpdateTime;
  const timeSpent = currentTime + elapsedTime;
  
  chrome.action.setBadgeText({ text: formatBadgeText(timeSpent) });
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
}

async function updateTime() {
  if (!currentUrl || !isWindowFocused || !currentTabId) return;
  
  const domain = getDomain(currentUrl);
  if (!domain) return;
  
  const now = Date.now();
  const timeSpent = now - lastUpdateTime;
  
  const { timeData = {}, todayData = {}, lastUpdate = Date.now() } = 
    await chrome.storage.local.get(['timeData', 'todayData', 'lastUpdate']);
  
  if (isNewDay(lastUpdate)) {
    await chrome.storage.local.set({ todayData: {} });
  }
  
  timeData[domain] = (timeData[domain] || 0) + timeSpent;
  todayData[domain] = (todayData[domain] || 0) + timeSpent;
  
  await chrome.storage.local.set({
    timeData,
    todayData,
    lastUpdate: now
  });
  
  lastUpdateTime = now;
  await updateBadge();
}

function isNewDay(lastUpdate) {
  const last = new Date(lastUpdate);
  const now = new Date();
  return last.getDate() !== now.getDate() ||
         last.getMonth() !== now.getMonth() ||
         last.getFullYear() !== now.getFullYear();
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  startTracking();
});

// Start tracking on browser startup
chrome.runtime.onStartup.addListener(() => {
  startTracking();
});

function startTracking() {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0] && tabs[0].url) {
      currentUrl = tabs[0].url;
      currentTabId = tabs[0].id;
      lastUpdateTime = Date.now();
      await updateBadge();
    }
  });
}

// Set extension icon
chrome.action.setIcon({
  path: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
});

// Start tracking immediately when a tab is loaded or updated
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tabId === currentTabId) {
      await updateTime();
    }
    currentUrl = tab.url;
    currentTabId = tabId;
    lastUpdateTime = Date.now();
    await updateBadge();
  }
});

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTime();
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      currentUrl = tab.url;
      currentTabId = activeInfo.tabId;
      lastUpdateTime = Date.now();
      await updateBadge();
    }
  } catch (error) {
    console.error('Error getting tab:', error);
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  const wasWindowFocused = isWindowFocused;
  isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
  
  if (wasWindowFocused && !isWindowFocused) {
    await updateTime();
  } else if (!wasWindowFocused && isWindowFocused) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        currentUrl = tab.url;
        currentTabId = tab.id;
        lastUpdateTime = Date.now();
        await updateBadge();
      }
    } catch (error) {
      console.error('Error querying tabs:', error);
    }
  }
});

// Update every second for accurate time tracking
setInterval(updateTime, 1000);