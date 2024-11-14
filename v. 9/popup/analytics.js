import { formatTime, COLORS } from './utils.js';

function createBarChart(canvas, data) {
  const ctx = canvas.getContext('2d');
  const padding = 40;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  // Clear canvas
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw axes
  ctx.beginPath();
  ctx.strokeStyle = '#94a3b8';
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  if (Object.keys(data).length === 0) return;

  // Calculate scales
  const dates = Object.keys(data).sort();
  const maxValue = Math.max(...Object.values(data));
  const barWidth = width / dates.length;

  // Draw bars
  dates.forEach((date, i) => {
    const value = data[date];
    const barHeight = (value / maxValue) * height;
    const x = padding + i * barWidth;
    const y = canvas.height - padding - barHeight;

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, y, barWidth - 2, barHeight);

    // Draw date label
    if (i % Math.ceil(dates.length / 10) === 0) {
      ctx.save();
      ctx.translate(x + barWidth / 2, canvas.height - padding + 10);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(new Date(date).toLocaleDateString(), 0, 0);
      ctx.restore();
    }
  });

  // Draw y-axis labels
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const value = (maxValue / steps) * i;
    const y = canvas.height - padding - (height / steps) * i;
    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(value), padding - 5, y + 3);
  }
}

function createCircleDiagram(container, data) {
  // Clear existing content
  container.innerHTML = '';

  const circle = document.createElement('div');
  circle.className = 'circle';

  const total = Object.values(data).reduce((sum, time) => sum + time, 0);
  let currentAngle = 0;

  Object.entries(data).forEach(([domain, time], index) => {
    const percentage = time / total;
    const segment = document.createElement('div');
    segment.className = 'circle-segment';
    
    // Calculate rotation and skew for the segment
    const angle = percentage * 360;
    const rotation = currentAngle + (angle / 2);
    segment.style.transform = `rotate(${rotation}deg)`;
    segment.style.backgroundColor = COLORS[index % COLORS.length];
    
    // Create legend item
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    
    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.backgroundColor = COLORS[index % COLORS.length];
    
    const text = document.createElement('span');
    text.className = 'legend-text';
    text.textContent = `${domain} (${formatTime(time)})`;
    
    legendItem.appendChild(dot);
    legendItem.appendChild(text);
    container.appendChild(legendItem);
    
    currentAngle += angle;
    circle.appendChild(segment);
  });

  const innerCircle = document.createElement('div');
  innerCircle.className = 'inner-circle';
  circle.appendChild(innerCircle);

  // Insert circle before legend items
  container.insertBefore(circle, container.firstChild);
}

export function updateAnalytics(dailyData, startDate = null, endDate = null) {
  const analyticsStats = document.getElementById('analyticsStats');
  const analyticsChart = document.getElementById('analyticsChart');
  const domainChart = document.getElementById('domainChart');
  
  if (!analyticsStats || !analyticsChart || !domainChart) return;
  
  analyticsStats.innerHTML = '';
  analyticsChart.innerHTML = '';
  domainChart.innerHTML = '';
  
  if (Object.keys(dailyData).length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = 'No historical data available';
    analyticsStats.appendChild(emptyMsg);
    return;
  }
  
  // Filter data by date range if provided
  const filteredData = {};
  Object.entries(dailyData).forEach(([date, data]) => {
    if ((!startDate || date >= startDate) && (!endDate || date <= endDate)) {
      filteredData[date] = data;
    }
  });
  
  // Aggregate data by domain
  const domainTotals = {};
  const dailyTotals = {};
  
  Object.entries(filteredData).forEach(([date, data]) => {
    let dayTotal = 0;
    Object.entries(data).forEach(([domain, time]) => {
      domainTotals[domain] = (domainTotals[domain] || 0) + time;
      dayTotal += time;
    });
    dailyTotals[date] = dayTotal;
  });
  
  // Create bar chart for daily totals
  const canvas = document.createElement('canvas');
  canvas.width = analyticsChart.clientWidth;
  canvas.height = analyticsChart.clientHeight;
  analyticsChart.appendChild(canvas);
  createBarChart(canvas, dailyTotals);
  
  // Create circle diagram for domain distribution
  const sortedDomains = Object.fromEntries(
    Object.entries(domainTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  );
  
  createCircleDiagram(domainChart, sortedDomains);
}