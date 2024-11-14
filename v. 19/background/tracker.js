import { getStorageData, saveStorageData } from './storage.js';
import { isNewDay, getDomain } from './timeUtils.js';

class TimeTracker {
  constructor() {
    this.currentSession = null;
    this.updateInterval = null;
    this.lastSaveTime = Date.now();
    this.SAVE_INTERVAL = 1000; // Save every second
  }

  async startSession(url) {
    if (!url) return;
    
    const domain = getDomain(url);
    if (!domain) return;

    // If same domain and session is active, continue
    if (this.currentSession?.domain === domain && this.isSessionActive()) {
      return;
    }

    // Only stop and save previous session if domain actually changed
    if (this.currentSession?.domain !== domain) {
      await this.stopSession();

      // Start new session
      this.currentSession = {
        domain,
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        totalTime: 0
      };

      // Load existing time for today
      const { todayData = {} } = await getStorageData();
      this.currentSession.totalTime = todayData[domain] || 0;

      // Start update interval
      this.startUpdateInterval();
    }
  }

  startUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      await this.updateCurrentSession();
    }, 1000);
  }

  isSessionActive() {
    return this.currentSession && 
           (Date.now() - this.currentSession.lastUpdateTime) < 2000;
  }

  async updateCurrentSession() {
    if (!this.currentSession) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - this.currentSession.lastUpdateTime;
    
    // Update session time
    this.currentSession.totalTime += timeSinceLastUpdate;
    this.currentSession.lastUpdateTime = now;

    // Save to storage periodically
    if (now - this.lastSaveTime >= this.SAVE_INTERVAL) {
      await this.saveCurrentSession();
      this.lastSaveTime = now;
    }
  }

  async saveCurrentSession() {
    if (!this.currentSession) return;

    const { timeData = {}, todayData = {}, lastUpdate } = await getStorageData();

    // Reset day if needed
    if (isNewDay(lastUpdate)) {
      await saveStorageData(timeData, {});
      this.currentSession.totalTime = 0;
      return;
    }

    // Update storage
    const domain = this.currentSession.domain;
    timeData[domain] = (timeData[domain] || 0) + this.SAVE_INTERVAL;
    todayData[domain] = this.currentSession.totalTime;
    
    await saveStorageData(timeData, todayData);
  }

  async stopSession() {
    if (!this.currentSession) return;

    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Save final session state
    await this.saveCurrentSession();

    // Reset session
    this.currentSession = null;
  }

  getCurrentSession() {
    if (!this.currentSession) return null;
    return {
      domain: this.currentSession.domain,
      startTime: this.currentSession.startTime,
      totalTime: this.currentSession.totalTime,
      isActive: this.isSessionActive()
    };
  }
}

export const tracker = new TimeTracker();