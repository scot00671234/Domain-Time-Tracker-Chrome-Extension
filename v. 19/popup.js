import { updateVisualChart } from './popup/chart.js';
import { updateStats } from './popup/stats.js';

let updateInterval = null;

async function updatePopup() {
  const { timeData = {}, todayData = {} } = await chrome.storage.local.get(['timeData', 'todayData']);
  updateVisualChart(todayData);
  updateStats(todayData, timeData);
}

document.getElementById('resetBtn')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset all tracking data?')) {
    await chrome.storage.local.clear();
    updatePopup();
  }
});

// Update popup when opened
document.addEventListener('DOMContentLoaded', () => {
  updatePopup();
  // Start interval when popup opens
  updateInterval = setInterval(updatePopup, 1000);
});

// Cleanup interval when popup closes
window.addEventListener('unload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
});