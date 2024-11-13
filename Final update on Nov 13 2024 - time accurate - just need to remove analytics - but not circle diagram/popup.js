import { updateVisualChart } from './popup/chart.js';
import { updateStats } from './popup/stats.js';
import { updateAnalytics } from './popup/analytics.js';

let updateInterval = null;
let currentView = 'main';

function showView(viewId) {
  document.getElementById('mainView').classList.toggle('hidden', viewId !== 'main');
  document.getElementById('analyticsView').classList.toggle('hidden', viewId !== 'analytics');
  currentView = viewId;
}

async function updatePopup() {
  const { timeData = {}, todayData = {}, dailyData = {} } = 
    await chrome.storage.local.get(['timeData', 'todayData', 'dailyData']);
  
  if (currentView === 'main') {
    updateVisualChart(todayData);
    updateStats(todayData, timeData);
  } else {
    updateAnalytics(dailyData);
  }
}

document.getElementById('analyticsBtn')?.addEventListener('click', () => {
  showView('analytics');
  updatePopup();
});

document.getElementById('backBtn')?.addEventListener('click', () => {
  showView('main');
  updatePopup();
});

document.getElementById('resetBtn')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset all tracking data?')) {
    await chrome.storage.local.clear();
    updatePopup();
  }
});

document.getElementById('applyRange')?.addEventListener('click', async () => {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  if (startDate && endDate) {
    const { dailyData = {} } = await chrome.storage.local.get(['dailyData']);
    updateAnalytics(dailyData, startDate, endDate);
  }
});

// Update popup when opened
document.addEventListener('DOMContentLoaded', () => {
  // Set date range to current date by default
  const today = new Date().toISOString().split('T')[0];
  
  document.getElementById('startDate').value = today;
  document.getElementById('endDate').value = today;
  
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