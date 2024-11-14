import { formatTime } from './utils.js';

export function createSiteElement(domain, time) {
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

export function updateStats(todayData, timeData) {
  const todayStats = document.getElementById('todayStats');
  const allTimeStats = document.getElementById('allTimeStats');
  
  if (!todayStats || !allTimeStats) return;
  
  todayStats.innerHTML = '';
  allTimeStats.innerHTML = '';
  
  const todaySites = Object.entries(todayData)
    .filter(([, time]) => time > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
    
  const allTimeSites = Object.entries(timeData)
    .filter(([, time]) => time > 0)
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