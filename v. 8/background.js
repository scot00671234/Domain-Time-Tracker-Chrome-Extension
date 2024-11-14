let activeTabData = {
  id: null,
  domain: '',
  startTime: null
};

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

async function updateTimeForDomain() {
  if (!activeTabData.domain || !activeTabData.startTime) return;

  const timeSpent = Date.now() - activeTabData.startTime;
  const { timeData = {}, todayData = {}, lastUpdate = Date.now() } = 
    await chrome.storage.local.get(['timeData', 'todayData', 'lastUpdate']);

  if (isNewDay(lastUpdate)) {
    await chrome.storage.local.set({ todayData: {} });
  }

  timeData[activeTabData.domain] = (timeData[activeTabData.domain] || 0) + timeSpent;
  todayData[activeTabData.domain] = (todayData[activeTabData.domain] || 0) + timeSpent;

  await chrome.storage.local.set({
    timeData,
    todayData,
    lastUpdate: Date.now()
  });

  // Reset start time for next interval
  activeTabData.startTime = Date.now();
}

async function updateBadge() {
  if (!activeTabData.domain) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const { todayData = {} } = await chrome.storage.local.get(['todayData']);
  const currentTime = todayData[activeTabData.domain] || 0;
  const timeSpent = currentTime + (activeTabData.startTime ? Date.now() - activeTabData.startTime : 0);
  
  chrome.action.setBadgeText({ text: formatBadgeText(timeSpent) });
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
}

function isNewDay(lastUpdate) {
  const last = new Date(lastUpdate);
  const now = new Date();
  return last.getDate() !== now.getDate() ||
         last.getMonth() !== now.getMonth() ||
         last.getFullYear() !== now.getFullYear();
}

async function handleTabChange(tabId) {
  // Save time for previous domain
  if (activeTabData.domain && activeTabData.startTime) {
    await updateTimeForDomain();
  }

  // Get new tab info
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab?.url) {
      activeTabData = { id: null, domain: '', startTime: null };
    } else {
      const domain = getDomain(tab.url);
      activeTabData = {
        id: tabId,
        domain,
        startTime: Date.now()
      };
    }
  } catch {
    activeTabData = { id: null, domain: '', startTime: null };
  }

  await updateBadge();
}

// Initialize alarm for periodic updates
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('updateTimer', { periodInMinutes: 0.05 }); // Updates every 3 seconds
});

// Handle alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateTimer' && activeTabData.domain) {
    await updateTimeForDomain();
    await updateBadge();
  }
});

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabChange(activeInfo.tabId);
});

// Track URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabId === activeTabData.id) {
    await handleTabChange(tabId);
  }
});

// Track window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus, save current time
    if (activeTabData.domain && activeTabData.startTime) {
      await updateTimeForDomain();
      activeTabData.startTime = null;
    }
  } else {
    // Window gained focus, start tracking current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await handleTabChange(tab.id);
    }
  }
});