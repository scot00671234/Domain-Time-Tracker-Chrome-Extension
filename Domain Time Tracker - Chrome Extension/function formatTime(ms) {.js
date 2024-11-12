function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('domainTimes', (data) => {
    const domainList = document.getElementById('domain-list');
    const domainTimes = data.domainTimes || {};

    for (const domain in domainTimes) {
      const div = document.createElement('div');
      div.className = 'domain';
      div.textContent = `${domain}: ${formatTime(domainTimes[domain])}`;
      domainList.appendChild(div);
    }
  });
});
