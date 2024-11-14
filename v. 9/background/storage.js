export async function getStorageData() {
  return await chrome.storage.local.get(['timeData', 'todayData', 'lastUpdate']);
}

export async function saveStorageData(timeData, todayData) {
  await chrome.storage.local.set({
    timeData,
    todayData,
    lastUpdate: Date.now()
  });
}

export async function clearStorageData() {
  await chrome.storage.local.clear();
}