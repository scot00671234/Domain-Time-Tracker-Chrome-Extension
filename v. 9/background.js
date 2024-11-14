import { tracker } from './background/tracker.js';
import { updateBadge } from './background/badge.js';
import { getDomain } from './background/timeUtils.js';

async function handleTabChange(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const domain = tab?.url ? getDomain(tab.url) : '';
    
    if (domain) {
      tracker.startSession(domain, tabId);
    } else {
      tracker.stopSession();
    }
    
    await updateBadge();
  } catch (error) {
    console.error('Error handling tab change:', error);
    tracker.stopSession();
    await updateBadge();
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('badgeUpdate', { periodInMinutes: 0.05 });
});

// Update badge periodically
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'badgeUpdate') {
    await updateBadge();
  }
});

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabChange(activeInfo.tabId);
});

// Track URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const session = tracker.getCurrentSession();
  if (changeInfo.status === 'complete' && session?.tabId === tabId) {
    await handleTabChange(tabId);
  }
});

// Track window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    tracker.pauseSession();
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const session = tracker.getCurrentSession();
      if (session?.tabId === tab.id) {
        tracker.resumeSession();
      } else {
        await handleTabChange(tab.id);
      }
    }
  }
});