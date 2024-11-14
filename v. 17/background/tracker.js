import { getStorageData, saveStorageData } from './storage.js';
import { isNewDay } from './timeUtils.js';

class TimeTracker {
  constructor() {
    this.currentDomain = null;
    this.startTime = null;
    this.totalTime = 0;
  }

  startSession(domain) {
    if (!domain) return;
    
    // If same domain, keep counting
    if (this.currentDomain === domain) return;
    
    // Save previous session if exists
    this.stopSession();
    
    // Start new session
    this.currentDomain = domain;
    this.startTime = Date.now();
    this.loadExistingTime();
    
    // Start counting
    this.updateTime();
  }

  async loadExistingTime() {
    const { todayData = {} } = await getStorageData();
    this.totalTime = todayData[this.currentDomain] || 0;
  }

  updateTime() {
    if (!this.currentDomain || !this.startTime) return;

    const now = Date.now();
    const sessionTime = now - this.startTime;
    const total = this.totalTime + sessionTime;
    
    // Update badge
    const seconds = Math.floor(total / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    let text;
    if (hours > 0) {
      text = `${hours}h`;
    } else if (minutes > 0) {
      text = `${minutes}m`;
    } else {
      text = `${seconds}s`;
    }

    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#1e293b' });

    // Schedule next update exactly at next second
    setTimeout(() => this.updateTime(), 1000);
  }

  async stopSession() {
    if (!this.currentDomain || !this.startTime) return;

    const { timeData = {}, todayData = {}, lastUpdate } = await getStorageData();
    
    // Calculate final time
    const sessionTime = Date.now() - this.startTime;
    const finalTime = this.totalTime + sessionTime;

    // Reset day if needed
    if (isNewDay(lastUpdate)) {
      await saveStorageData(timeData, {});
      this.totalTime = 0;
      return;
    }

    // Save times
    timeData[this.currentDomain] = finalTime;
    todayData[this.currentDomain] = finalTime;
    await saveStorageData(timeData, todayData);

    // Reset state
    this.currentDomain = null;
    this.startTime = null;
    this.totalTime = 0;
    
    // Clear badge
    chrome.action.setBadgeText({ text: '' });
  }

  getCurrentSession() {
    if (!this.currentDomain) return null;
    return {
      domain: this.currentDomain,
      startTime: this.startTime,
      isActive: true
    };
  }
}

export const tracker = new TimeTracker();