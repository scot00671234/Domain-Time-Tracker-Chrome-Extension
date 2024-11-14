let currentDomain = '';
let trackingInterval = null;
let counter = 0;

function getDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function formatBadgeText(seconds) {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${remainingSeconds}s`;
}

async function updateStorage(domain, secondsToAdd) {
  const { timeData = {}, todayData = {} } = await chrome.storage.local.get(['timeData', 'todayData']);
  
  timeData[domain] = (timeData[domain] || 0) + secondsToAdd * 1000;
  todayData[domain] = (todayData[domain] || 0) + secondsToAdd * 1000;

  await chrome.storage.local.set({ 
    timeData, 
    todayData, 
    lastUpdate: Date.now() 
  });
}

function updateBadge() {
  if (!currentDomain) return;
  chrome.action.setBadgeText({ text: formatBadgeText(counter) });
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
}

async function trackTime() {
  if (!currentDomain) return;
  
  counter++;
  updateBadge();
  await updateStorage(currentDomain, 1);
}

async function startTracking(url) {
  const newDomain = getDomain(url);
  
  if (newDomain !== currentDomain) {
    // Stop current tracking
    if (trackingInterval) {
      clearInterval(trackingInterval);
    }
    
    // Reset for new domain
    currentDomain = newDomain;
    counter = 0;
    updateBadge();
    
    // Start fresh tracking
    if (currentDomain) {
      trackingInterval = setInterval(trackTime, 1000);
    }
  }
}

async function stopTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  currentDomain = '';
  counter = 0;
  chrome.action.setBadgeText({ text: '' });
}

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab?.url) {
    await startTracking(tab.url);
  } else {
    await stopTracking();
  }
});

// Track URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    if (tab?.url) {
      await startTracking(tab.url);
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
      await startTracking(tab.url);
    }
  }
});