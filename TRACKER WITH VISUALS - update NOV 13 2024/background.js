let startTime = Date.now();
let currentUrl = '';
let isWindowFocused = true;
let currentTabId = null;

function getDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function isNewDay(lastUpdate) {
  const last = new Date(lastUpdate);
  const now = new Date();
  return last.getDate() !== now.getDate() ||
         last.getMonth() !== now.getMonth() ||
         last.getFullYear() !== now.getFullYear();
}

async function updateTime() {
  if (!currentUrl || !isWindowFocused || !currentTabId) return;
  
  const domain = getDomain(currentUrl);
  if (!domain) return;
  
  const timeSpent = Math.max(0, Date.now() - startTime);
  
  const { timeData = {}, todayData = {}, lastUpdate = Date.now() } = 
    await chrome.storage.local.get(['timeData', 'todayData', 'lastUpdate']);
  
  // Check if it's a new day
  if (isNewDay(lastUpdate)) {
    await chrome.storage.local.set({ todayData: {} });
  }
  
  // Update all-time data
  timeData[domain] = (timeData[domain] || 0) + timeSpent;
  todayData[domain] = (todayData[domain] || 0) + timeSpent;
  
  await chrome.storage.local.set({
    timeData,
    todayData,
    lastUpdate: Date.now()
  });
  
  startTime = Date.now();
}

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTime();
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      currentUrl = tab.url;
      currentTabId = activeInfo.tabId;
      startTime = Date.now();
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
    startTime = Date.now();
  }
});

// Track tab visibility changes
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === currentTabId) {
    await updateTime();
    currentUrl = '';
    currentTabId = null;
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
        startTime = Date.now();
      }
    } catch (error) {
      console.error('Error querying tabs:', error);
    }
  }
});

// Update more frequently for better accuracy
setInterval(async () => {
  if (isWindowFocused && currentTabId) {
    await updateTime();
  }
}, 1000); // Update every second