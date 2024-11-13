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
  
  const { timeData = {}, todayData = {}, dailyData = {}, lastUpdate = Date.now() } = 
    await chrome.storage.local.get(['timeData', 'todayData', 'dailyData', 'lastUpdate']);
  
  // Check if it's a new day
  const today = new Date().toISOString().split('T')[0];
  if (isNewDay(lastUpdate)) {
    if (Object.keys(todayData).length > 0) {
      dailyData[today] = todayData;
    }
    await chrome.storage.local.set({ todayData: {}, dailyData });
  }
  
  // Update all-time data
  timeData[domain] = (timeData[domain] || 0) + timeSpent;
  todayData[domain] = (todayData[domain] || 0) + timeSpent;
  
  await chrome.storage.local.set({
    timeData,
    todayData,
    dailyData,
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

// Set extension icon
chrome.action.setIcon({
  path: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
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

// Track URL changes within the same tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tabId === currentTabId) {
    await updateTime();
    currentUrl = changeInfo.url;
    lastUpdateTime = Date.now();
    await updateBadge();
  }
});

// Track tab visibility changes
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === currentTabId) {
    await updateTime();
    currentUrl = '';
    currentTabId = null;
    await updateBadge();
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

// Update every second for badge and time tracking
setInterval(updateTime, 1000);