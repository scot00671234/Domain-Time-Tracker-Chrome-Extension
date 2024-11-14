import { getStorageData, saveStorageData } from './storage.js';
import { isNewDay } from './timeUtils.js';

class TimeTracker {
  constructor() {
    this.activeSession = null;
    this.updateInterval = null;
    this.lastTick = null;
  }

  startSession(domain, tabId) {
    if (this.activeSession?.domain === domain) return;
    
    this.stopSession();
    
    if (!domain) return;
    
    this.lastTick = Date.now();
    this.activeSession = {
      domain,
      tabId,
      startTime: this.lastTick,
      isActive: true
    };
    
    this.startTracking();
  }

  startTracking() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    
    // Update exactly every second
    this.updateInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastTick;
      
      // Ensure we only count full seconds
      if (elapsed >= 1000) {
        this.updateTime(Math.floor(elapsed / 1000));
        this.lastTick = now;
      }
    }, 100); // Check more frequently for precise timing
  }

  async stopSession() {
    if (this.activeSession?.isActive) {
      const now = Date.now();
      const elapsed = now - this.lastTick;
      if (elapsed >= 1000) {
        await this.updateTime(Math.floor(elapsed / 1000));
      }
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.activeSession = null;
    this.lastTick = null;
  }

  async updateTime(seconds) {
    if (!this.activeSession?.isActive) return;

    const { timeData = {}, todayData = {}, lastUpdate } = await getStorageData();
    const domain = this.activeSession.domain;

    if (isNewDay(lastUpdate)) {
      await saveStorageData(timeData, {});
      return;
    }

    // Add exact seconds to both storages
    const milliseconds = seconds * 1000;
    timeData[domain] = (timeData[domain] || 0) + milliseconds;
    todayData[domain] = (todayData[domain] || 0) + milliseconds;

    await saveStorageData(timeData, todayData);
    
    // Update badge with current domain total time
    chrome.action.setBadgeText({ 
      text: this.formatBadgeTime(todayData[domain])
    });
  }

  formatBadgeTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  getCurrentSession() {
    if (!this.activeSession) return null;
    
    const { domain, startTime, isActive } = this.activeSession;
    return { domain, startTime, isActive };
  }
}

export const tracker = new TimeTracker();