import { tracker } from './background/tracker.js';
import { formatBadgeText } from './background/timeUtils.js';

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab?.url) {
    await tracker.startSession(tab.url);
    updateBadge();
  }
});

// Track URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && tab.url) {
    await tracker.startSession(tab.url);
    updateBadge();
  }
});

// Handle window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await tracker.stopSession();
    chrome.action.setBadgeText({ text: '' });
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await tracker.startSession(tab.url);
      updateBadge();
    }
  }
});

// Update badge
function updateBadge() {
  const session = tracker.getCurrentSession();
  if (!session) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  chrome.action.setBadgeText({ 
    text: formatBadgeText(session.totalTime)
  });
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
}

// Update badge periodically
setInterval(updateBadge, 1000);