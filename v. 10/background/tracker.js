import { getStorageData, saveStorageData } from './storage.js';
import { isNewDay } from './timeUtils.js';

class TimeTracker {
  constructor() {
    this.activeSession = null;
    this.updateInterval = null;
    this.lastUpdate = Date.now();
  }

  startSession(domain, tabId) {
    this.stopSession(); // Stop any existing session
    
    if (!domain) return;
    
    this.activeSession = {
      domain,
      tabId,
      startTime: Date.now(),
      isActive: true
    };
    
    // Start precise interval for time tracking
    this.updateInterval = setInterval(() => this.updateTime(), 1000);
  }

  async stopSession() {
    if (this.activeSession?.isActive) {
      await this.updateTime();
      this.activeSession.isActive = false;
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.activeSession = null;
  }

  pauseSession() {
    if (this.activeSession) {
      this.activeSession.isActive = false;
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  resumeSession() {
    if (this.activeSession) {
      this.activeSession.isActive = true;
      this.activeSession.startTime = Date.now();
      this.updateInterval = setInterval(() => this.updateTime(), 1000);
    }
  }

  async updateTime() {
    if (!this.activeSession?.isActive) return;

    const now = Date.now();
    const timeSpent = now - this.lastUpdate;
    
    if (timeSpent < 500) return; // Prevent micro-updates
    
    const { timeData = {}, todayData = {}, lastUpdate } = await getStorageData();

    // Check for day change
    if (isNewDay(lastUpdate)) {
      await saveStorageData(timeData, {});
      return;
    }

    const domain = this.activeSession.domain;
    timeData[domain] = (timeData[domain] || 0) + timeSpent;
    todayData[domain] = (todayData[domain] || 0) + timeSpent;

    await saveStorageData(timeData, todayData);
    this.lastUpdate = now;
  }

  getCurrentSession() {
    return this.activeSession;
  }
}

export const tracker = new TimeTracker();