let startTime = Date.now();
let currentUrl = '';
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const domain = getDomain(tab.url);
  if (!domain) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const { todayData = {} } = await chrome.storage.local.get(['todayData']);
  const currentTime = todayData[domain] || 0;
  const timeSpent = currentTime + (Date.now() - lastUpdateTime);
  
  chrome.action.setBadgeText({ text: formatBadgeText(timeSpent) });
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
}

async function updateTime() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  
  const domain = getDomain(tab.url);
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

// Initialize alarm for periodic updates
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('updateTimer', { periodInMinutes: 0.05 }); // Updates every 3 seconds
});

// Handle alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateTimer') {
    await updateTime();
  }
});

// Update on window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    lastUpdateTime = Date.now();
    await updateBadge();
  }
});