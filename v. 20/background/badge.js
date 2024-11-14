import { getStorageData } from './storage.js';
import { formatBadgeText } from './timeUtils.js';
import { tracker } from './tracker.js';

export async function updateBadge() {
  const session = tracker.getCurrentSession();
  
  if (!session?.domain) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const { todayData = {} } = await getStorageData();
  const currentTime = todayData[session.domain] || 0;
  const activeTime = session.isActive ? (Date.now() - session.startTime) : 0;
  const totalTime = currentTime + activeTime;
  
  chrome.action.setBadgeText({ text: formatBadgeText(totalTime) });
  chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });
}