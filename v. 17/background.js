let currentDomain = '';
let startTime = 0;
let trackingInterval = null;

function getDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

async function updateBadgeAndStorage() {
  if (!currentDomain || !startTime) return;
  
  const secondsSpent = Math.floor((Date.now() - startTime) / 1000);
  chrome.action.setBadgeText({ text: formatTime(secondsSpent) });
  
  // Store the exact time spent since last update (1 second)
  const { timeData = {}, todayData = {} } = await chrome.storage.local.get(['timeData', 'todayData']);
  timeData[currentDomain] = (timeData[currentDomain] || 0) + 1000; // Exactly 1 second in milliseconds
  todayData[currentDomain] = (todayData[currentDomain] || 0) + 1000; // Exactly 1 second in milliseconds
  
  await chrome.storage.local.set({ timeData, todayData, lastUpdate: Date.now() });
}

function startTrackingDomain(domain) {
  if (trackingInterval) {
    clearInterval(trackingInterval);
  }

  currentDomain = domain;
  startTime = Date.now();
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
  
  // Update exactly every 1000ms (1 second)
  trackingInterval = setInterval(updateBadgeAndStorage, 1000);
}

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab?.url) {
    startTrackingDomain(getDomain(tab.url));
  }
});

// Track URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
    startTrackingDomain(getDomain(tab.url));
  }
});

// Handle window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
    chrome.action.setBadgeText({ text: '' });
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      startTrackingDomain(getDomain(tab.url));
    }
  }
});