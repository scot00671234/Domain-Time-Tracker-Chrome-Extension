import { formatTime, COLORS } from './utils.js';

function createCircleSegment(percentage, color, index, total) {
  const segment = document.createElement('div');
  segment.className = 'circle-segment';
  const rotation = (index * (360 / total)) + (percentage * 360 / (2 * total));
  segment.style.transform = `rotate(${rotation}deg)`;
  segment.style.backgroundColor = color;
  return segment;
}

function createLegendItem(domain, time, color) {
  const item = document.createElement('div');
  item.className = 'legend-item';
  
  const dot = document.createElement('span');
  dot.className = 'legend-dot';
  dot.style.backgroundColor = color;
  
  const text = document.createElement('span');
  text.className = 'legend-text';
  text.textContent = `${domain} (${formatTime(time)})`;
  
  item.appendChild(dot);
  item.appendChild(text);
  return item;
}

export function updateVisualChart(data) {
  const chartContainer = document.getElementById('visualChart');
  const legendContainer = document.getElementById('chartLegend');
  if (!chartContainer || !legendContainer) return;

  chartContainer.innerHTML = '';
  legendContainer.innerHTML = '';

  const circle = document.createElement('div');
  circle.className = 'circle';

  const sites = Object.entries(data)
    .filter(([, time]) => time > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sites.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'No activity tracked today';
    chartContainer.appendChild(emptyMsg);
    return;
  }

  const total = sites.reduce((sum, [, time]) => sum + time, 0);
  
  sites.forEach(([domain, time], index) => {
    const percentage = time / total;
    const segment = createCircleSegment(percentage, COLORS[index], index, sites.length);
    circle.appendChild(segment);
    
    const legendItem = createLegendItem(domain, time, COLORS[index]);
    legendContainer.appendChild(legendItem);
  });

  const innerCircle = document.createElement('div');
  innerCircle.className = 'inner-circle';
  innerCircle.textContent = formatTime(total);
  circle.appendChild(innerCircle);

  chartContainer.appendChild(circle);
}