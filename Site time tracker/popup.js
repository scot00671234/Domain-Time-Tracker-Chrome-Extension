function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function createSiteElement(domain, time) {
  const div = document.createElement('div');
  div.className = 'site-stat';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'site-name';
  nameSpan.textContent = domain;
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'site-time';
  timeSpan.textContent = formatTime(time);
  
  div.appendChild(nameSpan);
  div.appendChild(timeSpan);
  return div;
}

async function updatePopup() {
  const { timeData = {}, todayData = {} } = await chrome.storage.local.get(['timeData', 'todayData']);
  
  const todayStats = document.getElementById('todayStats');
  const allTimeStats = document.getElementById('allTimeStats');
  
  todayStats.innerHTML = '';
  allTimeStats.innerHTML = '';
  
  // Sort sites by time spent (descending)
  const todaySites = Object.entries(todayData)
    .filter(([domain, time]) => time > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
    
  const allTimeSites = Object.entries(timeData)
    .filter(([domain, time]) => time > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  if (todaySites.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'No activity tracked today';
    todayStats.appendChild(emptyMsg);
  } else {
    todaySites.forEach(([domain, time]) => {
      todayStats.appendChild(createSiteElement(domain, time));
    });
  }
  
  if (allTimeSites.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'No activity tracked yet';
    allTimeStats.appendChild(emptyMsg);
  } else {
    allTimeSites.forEach(([domain, time]) => {
      allTimeStats.appendChild(createSiteElement(domain, time));
    });
  }
}

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset all tracking data?')) {
    await chrome.storage.local.clear();
    updatePopup();
  }
});

// Update popup when opened
document.addEventListener('DOMContentLoaded', updatePopup);

// Update popup every second while it's open
setInterval(updatePopup, 1000);