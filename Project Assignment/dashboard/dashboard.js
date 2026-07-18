
'use strict';

// ===== GLOBALS =====
let hospitalData = null;
let cdcData = null;
const tooltip = d3.select('#globalTooltip');
const COLORS = {
  purple: '#4f46e5', cyan: '#0284c7', pink: '#db2777',
  amber: '#d97706', emerald: '#059669', rose: '#e11d48',
  indigo: '#6366F1', teal: '#14B8A6', orange: '#F97316',
  violet: '#8B5CF6'
};
const DIAG_COLORS = {
  'Circulatory':'#F43F5E','Respiratory':'#0284c7','Digestive':'#d97706',
  'Diabetes':'#4f46e5','Neoplasms':'#db2777','Injury':'#F97316',
  'Musculoskeletal':'#059669','Genitourinary':'#6366F1','Other':'#6B7A99','Infectious':'#14B8A6'
};
const READMIT_COLORS = { 'NO':'#059669', '<30':'#F43F5E', '>30':'#d97706' };

// Cross-filter state
let cfState = { race: null, gender: null };

// ===== TOOLTIP HELPERS =====
function showTooltip(html, event) {
  tooltip.classed('visible', true).html(html);
  positionTooltip(event);
}
function hideTooltip() { tooltip.classed('visible', false); }
function positionTooltip(event) {
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = event.clientX + 14, y = event.clientY - 10;
  const node = tooltip.node();
  const tw = node ? node.offsetWidth + 20 : 220;
  const th = node ? node.offsetHeight + 10 : 100;
  if (x + tw > vw) x = event.clientX - tw;
  if (y + th > vh) y = event.clientY - th;
  tooltip.style('left', x + 'px').style('top', y + 'px');
}
document.addEventListener('mousemove', (e) => {
  if (tooltip.classed('visible')) positionTooltip(e);
});

// ===== NAV =====
function initNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-' + section).classList.add('active');
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
      if (section === 'dashboard' && hospitalData) {
        renderReadmitByAge(document.querySelector('[data-chart="readmit-age"].active')?.dataset.view || 'stacked');
        renderDiagCategory(document.querySelector('[data-chart="diag"].active')?.dataset.view || 'total');
        renderA1C(); renderAdmissionTypes(); renderLOS();
        renderNationalTrend(trendView);
        if (usGeo) drawMap(document.getElementById('mapYearSelect').value, usGeo);
      } else if (section === 'interactive' && hospitalData) {
        renderCFRace(); renderCFGender(); renderCFInsulin(); renderCFDischarge();
        if (selectedDiag) renderDrilldown(selectedDiag);
        if (selectedAge) renderAgeDetail(selectedAge);
      } else if (section === 'advanced' && hospitalData) {
        renderHeatmap(); renderPCP();
      } else if (section === 'timeline') {
        initTimeline();
      }
    });
  });
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  document.getElementById('userGroupSelect').addEventListener('change', function() {
    document.body.className = 'mode-' + this.value;
  });
}

// ===== LOAD DATA =====
async function loadData() {
  try {
    const [hosp, cdc] = await Promise.all([
      d3.json('../data/hospital_data.json'),
      d3.json('../data/cdc_data.json')
    ]);
    hospitalData = hosp;
    cdcData = cdc;
    initDashboard();
    initInteractive();
  } catch(e) {
    console.error('Data load error:', e);
    document.getElementById('kpiGrid').innerHTML = '<div style="color:#F43F5E;padding:20px">Error loading data. Please ensure hospital_data.json and cdc_data.json are in the same folder as index.html.</div>';
  }
}

// ===== SECTION 1: DASHBOARD =====
function initDashboard() {
  renderKPIs();
  renderReadmitByAge('stacked');
  renderDiagCategory('total');
  renderA1C();
  renderAdmissionTypes();
  renderLOS();
  renderNationalTrend('overall');
  renderMap('2008');
  initDashboardControls();
}

function renderKPIs() {
  const k = hospitalData.kpis;
  const kpis = [
    { label: 'Total Visits', value: k.total_visits.toLocaleString(), icon: '<i data-lucide="activity"></i>', color: 'purple', sub: '130 US hospitals' },
    { label: '30-Day Readmit', value: k.readmit_30.toLocaleString(), icon: '🔄', color: 'rose', sub: k.readmit_30_pct + '% of visits' },
    { label: 'Any Readmission', value: k.readmit_any_pct + '%', icon: '<i data-lucide="bar-chart-2"></i>', color: 'amber', sub: 'Readmitted (any time)' },
    { label: 'Avg. Stay (days)', value: k.avg_time, icon: '📅', color: 'cyan', sub: 'Per hospital visit' },
    { label: 'Avg. Medications', value: k.avg_meds, icon: '<i data-lucide="pill"></i>', color: 'emerald', sub: 'Per hospital visit' },
    { label: 'Avg. Lab Tests', value: k.avg_lab, icon: '<i data-lucide="flask-conical"></i>', color: 'pink', sub: 'Per hospital visit' },
  ];
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpis.map(k => `
    <div class="kpi-card ${k.color}">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

function renderReadmitByAge(view) {
  const container = document.getElementById('chart-readmit-age');
  container.innerHTML = '';
  const data = hospitalData.age_readmit;
  const margin = { top: 40, right: 20, bottom: 60, left: 55 };
  const w = container.clientWidth || 400;
  const h = 280;
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;

  const svg = d3.select(container).append('svg')
    .attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  if (view === 'stacked') {
    const keys = ['no_readmit', 'readmit_30plus', 'readmit_30'];
    const stack = d3.stack().keys(keys)(data);
    const x = d3.scaleBand().domain(data.map(d => d.age)).range([0, width]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).nice().range([height, 0]);
    const colors = { no_readmit: '#059669', readmit_30plus: '#d97706', readmit_30: '#F43F5E' };
    svg.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''));
    stack.forEach(layer => {
      svg.selectAll(`.bar-${layer.key}`)
        .data(layer).enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.data.age)).attr('width', x.bandwidth())
        .attr('y', d => y(d[1])).attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
        .attr('fill', colors[layer.key]).attr('rx', 2)
        .on('mouseover', (e, d) => {
          const lbl = { no_readmit: 'Not Readmitted', readmit_30plus: 'Readmitted >30d', readmit_30: 'Readmitted <30d' };
          showTooltip(`<strong>${d.data.age}</strong><br>${lbl[layer.key]}: ${(d[1]-d[0]).toLocaleString()}`, e);
        }).on('mouseout', hideTooltip);
    });
    svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll('text').attr('transform','rotate(-35)').style('text-anchor','end');
    svg.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? d/1000+'k' : d));
    // Legend
    const lgd = svg.append('g').attr('transform', `translate(${width/2 - 150}, -30)`);
    [['no_readmit','Not Readmitted','#059669'],['readmit_30plus','>30 Days','#d97706'],['readmit_30','<30 Days','#F43F5E']].forEach(([k,l,c], i) => {
      lgd.append('rect').attr('x', i*110).attr('y', 0).attr('width',10).attr('height',10).attr('fill',c).attr('rx',2);
      lgd.append('text').attr('x', i*110 + 14).attr('y', 9).attr('fill','var(--text-muted)').attr('font-size',10).text(l);
    });
  } else {
    const x = d3.scaleBand().domain(data.map(d => d.age)).range([0, width]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.pct_30) + 2]).nice().range([height, 0]);
    svg.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''));
    const bars = svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar')
      .attr('x', d => x(d.age)).attr('width', x.bandwidth())
      .attr('y', d => y(d.pct_30)).attr('height', d => height - y(d.pct_30))
      .attr('fill', d => d3.interpolateRdYlGn(1 - d.pct_30 / 20)).attr('rx', 3);
    bars.on('mouseover', (e,d) => showTooltip(`<strong>${d.age}</strong><br>30-day readmit: ${d.pct_30}%<br>Count: ${d.readmit_30.toLocaleString()}`, e))
        .on('mouseout', hideTooltip);
    svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll('text').attr('transform','rotate(-35)').style('text-anchor','end');
    svg.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));
    svg.append('text').attr('x', -margin.left + 5).attr('y', -8).attr('fill','var(--text-muted)').attr('font-size',10).text('Readmit %');
  }
}

function renderDiagCategory(view) {
  const container = document.getElementById('chart-diag-category');
  container.innerHTML = '';
  const rawData = hospitalData.diagnosis_category;
  const data = view === 'readmit'
    ? [...rawData].sort((a,b) => b.pct_30 - a.pct_30)
    : rawData;
  const margin = { top: 20, right: 20, bottom: 80, left: 60 };
  const w = container.clientWidth || 400;
  const h = 280;
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;

  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(data.map(d => d.category)).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([0, view === 'readmit' ? d3.max(data, d => d.pct_30) + 2 : d3.max(data, d => d.total)]).nice().range([height, 0]);

  svg.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''));

  svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar')
    .attr('x', d => x(d.category)).attr('width', x.bandwidth())
    .attr('y', d => y(view === 'readmit' ? d.pct_30 : d.total))
    .attr('height', d => height - y(view === 'readmit' ? d.pct_30 : d.total))
    .attr('fill', d => DIAG_COLORS[d.category] || '#6B7A99').attr('rx', 3)
    .on('mouseover', (e,d) => showTooltip(`<strong>${d.category}</strong><br>Visits: ${d.total.toLocaleString()}<br>30-day readmit: ${d.pct_30}%<br>Avg stay: ${d.avg_time}d, Avg meds: ${d.avg_meds}`, e))
    .on('mouseout', hideTooltip);

  svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll('text').attr('transform','rotate(-40)').style('text-anchor','end').attr('font-size',10);
  svg.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => view === 'readmit' ? d+'%' : (d >= 1000 ? d/1000+'k' : d)));
}

function renderA1C() {
  const container = document.getElementById('chart-a1c');
  container.innerHTML = '';
  const data = hospitalData.a1c_readmit;
  const margin = { top: 20, right: 10, bottom: 60, left: 55 };
  const w = container.clientWidth || 300, h = 220;
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(data.map(d => d.a1c)).range([0, width]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.pct_30) + 2]).nice().range([height, 0]);
  svg.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(''));
  const aColors = ['#059669','#d97706','#F43F5E','#4f46e5'];
  svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar')
    .attr('x', d => x(d.a1c)).attr('width', x.bandwidth())
    .attr('y', d => y(d.pct_30)).attr('height', d => height - y(d.pct_30))
    .attr('fill', (d,i) => aColors[i % aColors.length]).attr('rx',3)
    .on('mouseover', (e,d) => showTooltip(`<strong>${d.a1c}</strong><br>Patients: ${d.total.toLocaleString()}<br>30-day readmit: ${d.pct_30}%`, e))
    .on('mouseout', hideTooltip);
  svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll('text').attr('transform','rotate(-30)').style('text-anchor','end').attr('font-size',9);
  svg.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(d => d+'%'));
}

function renderAdmissionTypes() {
  const container = document.getElementById('chart-admission');
  container.innerHTML = '';
  const data = hospitalData.admission_type;
  const w = container.clientWidth || 300, h = 220;
  const radius = Math.min(w, h) / 2 - 20;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${w/2 - 50},${h/2})`);
  const pie = d3.pie().value(d => d.total).sort(null);
  const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);
  const arcHover = d3.arc().innerRadius(radius * 0.5).outerRadius(radius + 8);
  const pColors = [COLORS.rose, COLORS.amber, COLORS.cyan, COLORS.emerald, COLORS.violet];
  const arcs = svg.selectAll('.arc').data(pie(data)).enter().append('g').attr('class','arc');
  arcs.append('path').attr('d', arc).attr('fill', (d,i) => pColors[i % pColors.length]).attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
    .on('mouseover', function(e,d) {
      d3.select(this).attr('d', arcHover);
      showTooltip(`<strong>${d.data.type}</strong><br>Visits: ${d.data.total.toLocaleString()}<br>30-day readmit: ${d.data.pct_30}%`, e);
    }).on('mouseout', function(e,d) { d3.select(this).attr('d', arc); hideTooltip(); });
  // Center label
  svg.append('text').attr('text-anchor','middle').attr('dy','0.35em').attr('fill','var(--text-primary)').attr('font-size',13).attr('font-weight',700)
    .text(data.find(d => d.type === 'Emergency') ? data.find(d => d.type === 'Emergency').pct_30 + '%' : '');
  svg.append('text').attr('text-anchor','middle').attr('dy','1.8em').attr('fill','var(--text-muted)').attr('font-size',9).text('Emergency');
  svg.append('text').attr('text-anchor','middle').attr('dy','2.8em').attr('fill','var(--text-muted)').attr('font-size',9).text('readmit');
  
  // Legend
  const lgd = svg.append('g').attr('transform', `translate(${radius + 20}, ${-radius + 15})`);
  data.forEach((d, i) => {
    lgd.append('rect').attr('x', 0).attr('y', i*18).attr('width', 10).attr('height', 10).attr('fill', pColors[i % pColors.length]).attr('rx', 2);
    lgd.append('text').attr('x', 16).attr('y', i*18+9).attr('fill','var(--text-muted)').attr('font-size', 11)
       .text(d.type.length > 15 ? d.type.substring(0,15)+'...' : d.type);
  });
}

function renderLOS() {
  const container = document.getElementById('chart-los');
  container.innerHTML = '';
  const data = hospitalData.time_distribution;
  const margin = { top: 20, right: 10, bottom: 40, left: 50 };
  const w = container.clientWidth || 300, h = 220;
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(data.map(d => d.days)).range([0, width]).padding(0.15);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([height, 0]);
  const colorScale = d3.scaleSequential(d3.interpolatePlasma).domain([1, 14]);
  svg.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(''));
  svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar')
    .attr('x', d => x(d.days)).attr('width', x.bandwidth())
    .attr('y', d => y(d.count)).attr('height', d => height - y(d.count))
    .attr('fill', d => colorScale(d.days)).attr('rx', 2)
    .on('mouseover', (e,d) => showTooltip(`<strong>${d.days} day stay</strong><br>Visits: ${d.count.toLocaleString()}`, e))
    .on('mouseout', hideTooltip);
  svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickValues([1,3,5,7,10,14]));
  svg.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(d => d >= 1000 ? d/1000+'k' : d));
  svg.append('text').attr('x', width/2).attr('y', height + 36).attr('text-anchor','middle').attr('fill','var(--text-muted)').attr('font-size',10).text('Days in Hospital');
}

let trendView = 'overall';
function renderNationalTrend(view) {
  trendView = view;
  const container = document.getElementById('chart-national-trend');
  container.innerHTML = '';
  const data = cdcData.national_trend;
  const margin = { top: 20, right: 80, bottom: 40, left: 50 };
  const w = container.clientWidth || 600, h = 300;
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([2000, 2008]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 12]).range([height, 0]);
  svg.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''));

  const lineGen = d3.line().x(d => x(d.year)).y(d => y(d.value || d.overall)).curve(d3.curveMonotoneX);
  const area = d3.area().x(d => x(d.year)).y0(height).y1(d => y(d.overall || 0)).curve(d3.curveMonotoneX);

  if (view === 'overall') {
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id','areaGrad').attr('x1','0').attr('y1','0').attr('x2','0').attr('y2','1');
    grad.append('stop').attr('offset','0%').attr('stop-color',COLORS.cyan);
    grad.append('stop').attr('offset','100%').attr('stop-color','transparent');
    svg.append('path').datum(data).attr('fill', 'url(#areaGrad)').attr('opacity', 0.3).attr('d', area);
    svg.append('path').datum(data).attr('class','line-path').attr('d', lineGen)
      .attr('stroke', COLORS.cyan).attr('stroke-width', 3).attr('fill','none');
    svg.selectAll('.dot').data(data).enter().append('circle').attr('cx', d => x(d.year)).attr('cy', d => y(d.overall))
      .attr('r', 5).attr('fill', COLORS.cyan).attr('stroke', 'var(--surface-1)').attr('stroke-width', 2)
      .on('mouseover', (e,d) => showTooltip(`<strong>${d.year}</strong><br>Prevalence: ${d.overall}%`, e))
      .on('mouseout', hideTooltip);
    svg.append('text').attr('x', x(2008)+8).attr('y', y(data[data.length-1].overall)+4).attr('fill',COLORS.cyan).attr('font-size',11).text('Overall');
  } else {
    const sexLines = [
      { key: 'male', color: COLORS.purple, label: 'Male' },
      { key: 'female', color: COLORS.pink, label: 'Female' }
    ];
    sexLines.forEach(sl => {
      const lineData = data.filter(d => d[sl.key] != null).map(d => ({ year: d.year, value: d[sl.key] }));
      svg.append('path').datum(lineData).attr('class','line-path').attr('d', lineGen)
        .attr('stroke', sl.color).attr('stroke-width', 2.5).attr('fill','none');
      svg.selectAll('.dot-'+sl.key).data(lineData).enter().append('circle')
        .attr('cx', d => x(d.year)).attr('cy', d => y(d.value)).attr('r', 4)
        .attr('fill', sl.color).attr('stroke','var(--surface-1)').attr('stroke-width',2)
        .on('mouseover', (e,d) => showTooltip(`<strong>${sl.label} ${d.year}</strong><br>${d.value}%`, e))
        .on('mouseout', hideTooltip);
      if (lineData.length > 0) {
        const last = lineData[lineData.length-1];
        svg.append('text').attr('x', x(last.year)+8).attr('y', y(last.value)+4).attr('fill',sl.color).attr('font-size',11).text(sl.label);
      }
    });
  }
  svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(9));
  svg.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));
}

// ===== MAP =====
let usGeo = null;
let stateDataMap = {};

function renderMap(year) {
  const container = document.getElementById('chart-map');
  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:380px;color:var(--text-muted);font-size:13px">Loading US map...</div>';

  // Build state data lookup for all years
  cdcData.state_trends.forEach(st => {
    if (!stateDataMap[st.state]) stateDataMap[st.state] = {};
    st.data.forEach(d => { stateDataMap[st.state][d.year] = d.value; });
  });
  // Also from state_2008
  cdcData.state_2008.forEach(s => {
    if (!stateDataMap[s.state]) stateDataMap[s.state] = {};
    stateDataMap[s.state][2008] = s.value;
  });

  fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
    .then(r => r.json()).then(us => {
      usGeo = us;
      drawMap(year, us);
    }).catch(() => {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:380px;color:var(--text-muted);font-size:13px">Map unavailable (requires internet). Data is available in the other views.</div>';
    });
}

const STATE_ABBR = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC',
  '12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY',
  '22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT',
  '31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH',
  '40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT',
  '50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'
};

function drawMap(year, us) {
  const container = document.getElementById('chart-map');
  container.innerHTML = '';
  const w = container.clientWidth || 700, h = 380;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h);
  const projection = d3.geoAlbersUsa().fitSize([w, h - 40], topojson.feature(us, us.objects.states));
  const path = d3.geoPath().projection(projection);
  const yr = parseInt(year);

  const vals = Object.values(stateDataMap).map(d => d[yr]).filter(v => v != null);
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([d3.min(vals) || 0, d3.max(vals) || 10]);

  const states = topojson.feature(us, us.objects.states);
  const g = svg.append('g');

  // Zoom behavior
  const zoom = d3.zoom().scaleExtent([1, 8]).on('zoom', e => { g.attr('transform', e.transform); });
  svg.call(zoom);

  g.selectAll('path').data(states.features).enter().append('path')
    .attr('d', path)
    .attr('fill', d => {
      const abbr = STATE_ABBR[String(d.id).padStart(2,'0')];
      const val = abbr && stateDataMap[abbr] ? stateDataMap[abbr][yr] : null;
      return val ? colorScale(val) : 'var(--surface-3)';
    })
    .attr('stroke', 'var(--surface-1)').attr('stroke-width', 0.8)
    .style('cursor','pointer')
    .on('mouseover', function(e, d) {
      d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1.5);
      const abbr = STATE_ABBR[String(d.id).padStart(2,'0')];
      const val = abbr && stateDataMap[abbr] ? stateDataMap[abbr][yr] : null;
      showTooltip(`<strong>${abbr || 'Unknown'}</strong><br>Year: ${yr}<br>Prevalence: ${val ? val + '%' : 'N/A'}`, e);
    })
    .on('mouseout', function() {
      d3.select(this).attr('stroke','var(--surface-1)').attr('stroke-width', 0.8);
      hideTooltip();
    });

  // Color legend
  const legendW = 180, legendH = 10;
  const lx = w - legendW - 20, ly = h - 30;
  const defs = svg.append('defs');
  const lg = defs.append('linearGradient').attr('id','mapGrad').attr('x1','0').attr('x2','1').attr('y1','0').attr('y2','0');
  lg.append('stop').attr('offset','0%').attr('stop-color', colorScale(d3.min(vals) || 0));
  lg.append('stop').attr('offset','100%').attr('stop-color', colorScale(d3.max(vals) || 10));
  svg.append('rect').attr('x',lx).attr('y',ly).attr('width',legendW).attr('height',legendH).attr('fill','url(#mapGrad)').attr('rx',3);
  svg.append('text').attr('x',lx).attr('y',ly-4).attr('fill','var(--text-muted)').attr('font-size',9).text((d3.min(vals)||0).toFixed(1)+'%');
  svg.append('text').attr('x',lx+legendW).attr('y',ly-4).attr('text-anchor','end').attr('fill','var(--text-muted)').attr('font-size',9).text((d3.max(vals)||10).toFixed(1)+'%');
  svg.append('text').attr('x',lx+legendW/2).attr('y',ly+legendH+12).attr('text-anchor','middle').attr('fill','var(--text-muted)').attr('font-size',9).text('Diabetes Prevalence');
}

function initDashboardControls() {
  document.querySelectorAll('[data-chart="readmit-age"]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-chart="readmit-age"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderReadmitByAge(this.dataset.view);
    });
  });
  document.querySelectorAll('[data-chart="diag"]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-chart="diag"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderDiagCategory(this.dataset.view);
    });
  });
  document.querySelectorAll('[data-chart="trend"]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-chart="trend"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderNationalTrend(this.dataset.view);
    });
  });
  document.getElementById('mapYearSelect').addEventListener('change', function() {
    if (usGeo) drawMap(this.value, usGeo);
    else renderMap(this.value);
  });
  document.getElementById('raceFilter').addEventListener('change', updateDashboardFilters);
  document.getElementById('genderFilter').addEventListener('change', updateDashboardFilters);
}

function updateDashboardFilters() {
  const race = document.getElementById('raceFilter').value;
  const gender = document.getElementById('genderFilter').value;
  const subEl = document.querySelector('.kpi-grid .kpi-card.rose .kpi-sub');
  if (!subEl) return;
  const raceData = hospitalData.race_readmit.find(r => r.race === race);
  const genderData = hospitalData.gender_readmit.find(g => g.gender === gender);
  if (race !== 'all' && raceData) {
    subEl.textContent = `${raceData.pct_30}% for ${race}`;
  } else if (gender !== 'all' && genderData) {
    subEl.textContent = `${genderData.pct_30}% for ${gender}`;
  } else {
    subEl.textContent = hospitalData.kpis.readmit_30_pct + '% of visits';
  }
}

// ===== SECTION 2: INTERACTIVE FEATURES =====
function initInteractive() {
  initDrilldown();
  initAgeExplorer();
  document.getElementById('crossFilterReset').addEventListener('click', resetCrossFilter);
}

function renderCFRace() {
  const container = document.getElementById('cf-race');
  container.innerHTML = '';
  const data = hospitalData.race_readmit.filter(d => d.race !== 'Unknown');
  const margin = { top: 15, right: 30, bottom: 40, left: 110 };
  const w = container.clientWidth || 400, h = 280;
  const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const y = d3.scaleBand().domain(data.map(d => d.race)).range([0, height]).padding(0.3);
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).nice().range([0, width]);
  svg.append('g').attr('class','grid').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickSize(-height).tickFormat(''));
  const rColors = [COLORS.purple, COLORS.cyan, COLORS.amber, COLORS.pink, COLORS.emerald];
  svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar cf-race-bar')
    .attr('y', d => y(d.race)).attr('height', y.bandwidth())
    .attr('x', 0).attr('width', d => x(d.total))
    .attr('fill', (d,i) => rColors[i % rColors.length]).attr('rx', 3)
    .attr('data-race', d => d.race)
    .style('cursor','pointer')
    .on('click', function(e, d) {
      const isActive = cfState.race === d.race;
      cfState.race = isActive ? null : d.race;
      applyCrossFilter();
    })
    .on('mouseover', (e,d) => showTooltip(`<strong>${d.race}</strong><br>Visits: ${d.total.toLocaleString()}<br>30-day readmit: ${d.pct_30}%`, e))
    .on('mouseout', hideTooltip);
  svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d >= 1000 ? d/1000+'k' : d));
  svg.append('g').attr('class','axis').call(d3.axisLeft(y)).selectAll('text').attr('font-size',11);
}

function renderCFGender() {
  const container = document.getElementById('cf-gender');
  container.innerHTML = '';
  const data = hospitalData.gender_readmit;
  const w = container.clientWidth || 400, h = 280;
  const radius = Math.min(w, h) / 2 - 30;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${w/2},${h/2})`);
  const pie = d3.pie().value(d => d.total).sort(null);
  const arc = d3.arc().innerRadius(radius * 0.45).outerRadius(radius);
  const arcHover = d3.arc().innerRadius(radius * 0.45).outerRadius(radius + 10);
  const gColors = [COLORS.pink, COLORS.cyan];
  svg.selectAll('.arc').data(pie(data)).enter().append('path')
    .attr('d', arc).attr('fill', (d,i) => gColors[i]).attr('stroke','var(--surface-1)').attr('stroke-width',2)
    .style('cursor','pointer')
    .on('click', function(e,d) {
      cfState.gender = cfState.gender === d.data.gender ? null : d.data.gender;
      applyCrossFilter();
      d3.select(this).attr('d', cfState.gender === d.data.gender ? arcHover : arc);
    })
    .on('mouseover', function(e,d) {
      d3.select(this).attr('d', arcHover);
      showTooltip(`<strong>${d.data.gender}</strong><br>Visits: ${d.data.total.toLocaleString()}<br>30-day readmit: ${d.data.pct_30}%`, e);
    })
    .on('mouseout', function(e,d) {
      if (cfState.gender !== d.data.gender) d3.select(this).attr('d', arc);
      hideTooltip();
    });
  // Labels
  svg.selectAll('.pie-label').data(pie(data)).enter().append('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor','middle').attr('fill', '#1e293b').attr('font-size',12).attr('font-weight',600)
    .text(d => d.data.gender);
}

function renderCFInsulin() {
  const container = document.getElementById('cf-insulin');
  container.innerHTML = '';
  const data = hospitalData.insulin_readmit.filter(d => d.total > 1000);
  const margin = { top: 15, right: 10, bottom: 50, left: 55 };
  const w = container.clientWidth || 400, h = 280;
  const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(data.map(d => d.insulin)).range([0, width]).padding(0.35);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.pct_30) + 3]).nice().range([height, 0]);
  svg.append('g').attr('class','grid').call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(''));
  const iColors = [COLORS.emerald, COLORS.amber, COLORS.cyan, COLORS.rose];
  svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar')
    .attr('x', d => x(d.insulin)).attr('width', x.bandwidth())
    .attr('y', d => y(d.pct_30)).attr('height', d => height - y(d.pct_30))
    .attr('fill', (d,i) => iColors[i % iColors.length]).attr('rx',3)
    .on('mouseover', (e,d) => showTooltip(`<strong>${d.insulin}</strong><br>Patients: ${d.total.toLocaleString()}<br>30-day readmit: ${d.pct_30}%`, e))
    .on('mouseout', hideTooltip);
  svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll('text').style('text-anchor','middle').attr('font-size',11);
  svg.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d => d+'%'));
  svg.append('text').attr('x', width/2).attr('y', height + 45).attr('text-anchor','middle').attr('fill','var(--text-muted)').attr('font-size',10).text('Insulin Dosage Change');
}

function renderCFDischarge() {
  const container = document.getElementById('cf-discharge');
  container.innerHTML = '';
  const data = hospitalData.discharge_distribution.slice(0, 7);
  const margin = { top: 15, right: 30, bottom: 40, left: 160 };
  const w = container.clientWidth || 400, h = 280;
  const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, height]).padding(0.3);
  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([0, width]);
  const colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, data.length]);
  svg.append('g').attr('class','grid').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickSize(-height).tickFormat(''));
  svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar')
    .attr('y', d => y(d.label)).attr('height', y.bandwidth())
    .attr('x', 0).attr('width', d => x(d.count))
    .attr('fill', (d,i) => colorScale(i)).attr('rx',3)
    .on('mouseover', (e,d) => showTooltip(`<strong>${d.label}</strong><br>Patients: ${d.count.toLocaleString()}`, e))
    .on('mouseout', hideTooltip);
  svg.append('g').attr('class','axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d >= 1000 ? d/1000+'k' : d));
  svg.append('g').attr('class','axis').call(d3.axisLeft(y)).selectAll('text')
    .attr('font-size',10).text(d => d.length > 25 ? d.substring(0,25)+'...' : d);
}

function applyCrossFilter() {
  const rBars = document.querySelectorAll('.cf-race-bar');
  rBars.forEach(bar => {
    if (cfState.race) {
      bar.classList.toggle('dimmed', bar.dataset.race !== cfState.race);
    } else {
      bar.classList.remove('dimmed');
    }
  });
}

function resetCrossFilter() {
  cfState = { race: null, gender: null };
  document.querySelectorAll('.bar').forEach(b => b.classList.remove('dimmed'));
  renderCFGender();
}

// Drilldown
let selectedDiag = null;
function initDrilldown() {
  const diagData = hospitalData.diagnosis_category;
  const pills = document.getElementById('diagPills');
  pills.innerHTML = '';
  diagData.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'diag-pill';
    btn.textContent = d.category;
    btn.style.borderColor = DIAG_COLORS[d.category] || 'var(--border)';
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diag-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      selectedDiag = d;
      renderDrilldown(d);
    });
    pills.appendChild(btn);
  });
  // Default select first
  pills.querySelector('.diag-pill').click();
}

function renderDrilldown(diag) {
  renderGaugeChart('dd-readmit', diag.pct_30, 20, '30d Readmit', COLORS.rose);
  renderGaugeChart('dd-time', diag.avg_time, 14, 'Days', COLORS.cyan);
  renderGaugeChart('dd-meds', diag.avg_meds, 40, 'Meds', COLORS.purple);
}

function renderGaugeChart(containerId, value, maxVal, unit, color) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const w = container.clientWidth || 200, h = 180;
  const radius = Math.min(w, h) / 2 - 20;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${w/2},${h/2 + 20})`);
  const arcGen = d3.arc().innerRadius(radius * 0.7).outerRadius(radius);
  const startAngle = -Math.PI * 0.75;
  const endAngle = Math.PI * 0.75;
  // Background
  svg.append('path').datum({ startAngle, endAngle }).attr('d', arcGen).attr('fill', 'var(--surface-3)');
  // Value arc
  const valueAngle = startAngle + (endAngle - startAngle) * (Math.min(value, maxVal) / maxVal);
  svg.append('path').datum({ startAngle, endAngle: valueAngle })
    .attr('d', arcGen).attr('fill', color).attr('opacity', 0.9);
  // Value text
  svg.append('text').attr('text-anchor','middle').attr('dy','-0.2em').attr('fill','var(--text-primary)').attr('font-size',22).attr('font-weight',700).text(value);
  svg.append('text').attr('text-anchor','middle').attr('dy','1.4em').attr('fill','var(--text-muted)').attr('font-size',11).text(unit);
}

// Age Explorer
let selectedAge = null;
function initAgeExplorer() {
  const ageData = hospitalData.age_readmit;
  const selector = document.getElementById('ageSelector');
  selector.innerHTML = '';
  ageData.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'age-btn';
    btn.textContent = d.age;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAge = d;
      renderAgeDetail(d);
    });
    selector.appendChild(btn);
  });
  // Default
  selector.querySelectorAll('.age-btn')[5].click();
}

function renderAgeDetail(ageD) {
  const container = document.getElementById('age-detail-chart');
  container.innerHTML = '';
  const data = [
    { label: 'Not Readmitted', value: ageD.no_readmit, color: COLORS.emerald, pct: Math.round(ageD.no_readmit / ageD.total * 100) },
    { label: 'Readmit > 30d', value: ageD.readmit_30plus, color: COLORS.amber, pct: Math.round(ageD.readmit_30plus / ageD.total * 100) },
    { label: 'Readmit < 30d', value: ageD.readmit_30, color: COLORS.rose, pct: ageD.pct_30 }
  ];
  const margin = { top: 20, right: 40, bottom: 40, left: 120 };
  const w = container.clientWidth || 500, h = 200;
  const width = w - margin.left - margin.right, height = h - margin.top - margin.bottom;
  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, height]).padding(0.35);
  const x = d3.scaleLinear().domain([0, ageD.total]).range([0, width]);
  svg.append('g').attr('class','grid').call(d3.axisTop(x).ticks(5).tickSize(-height).tickFormat(d => d >= 1000 ? d/1000+'k' : d));
  svg.selectAll('.bar').data(data).enter().append('rect').attr('class','bar')
    .attr('y', d => y(d.label)).attr('height', y.bandwidth())
    .attr('x', 0).attr('width', 0)
    .attr('fill', d => d.color).attr('rx', 4)
    .transition().duration(600).attr('width', d => x(d.value));
  svg.selectAll('.bar-label').data(data).enter().append('text')
    .attr('y', d => y(d.label) + y.bandwidth() / 2 + 4)
    .attr('x', d => x(d.value) + 6)
    .attr('fill','var(--text-secondary)').attr('font-size',11)
    .text(d => `${d.value.toLocaleString()} (${d.pct}%)`);
  svg.append('g').attr('class','axis').call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
  svg.append('text').attr('x', width/2).attr('y', height + 25).attr('text-anchor','middle').attr('fill','var(--text-muted)').attr('font-size',10).text(`Age ${ageD.age} — Total: ${ageD.total.toLocaleString()} visits`);
}

// ===== SECTION 3: ADVANCED VISUALIZATIONS =====
let heatmapView = 'pct_30';
let pcpColorBy = 'pct_30';

function renderHeatmap(view) {
  if (view) heatmapView = view;
  const container = document.getElementById('chart-heatmap');
  if (!container) return;
  container.innerHTML = '';
  const data = hospitalData.heatmap;
  if (!data || data.length === 0) { container.innerHTML = '<div style="padding:40px;color:var(--text-muted)">No heatmap data.</div>'; return; }

  const ages = ['[0-10)','[10-20)','[20-30)','[30-40)','[40-50)','[50-60)','[60-70)','[70-80)','[80-90)','[90-100)'];
  const diags = ['Circulatory','Respiratory','Digestive','Diabetes','Neoplasms','Injury','Musculoskeletal','Genitourinary','Other'];

  const margin = { top: 60, right: 30, bottom: 45, left: 110 };
  const w = container.clientWidth || 700;
  const cellW = Math.max(40, (w - margin.left - margin.right) / diags.length);
  const cellH = 42;
  const h = ages.length * cellH + margin.top + margin.bottom;

  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const val = heatmapView === 'pct_30' ? 'pct_30' : 'total';
  const allVals = data.map(d => d[val]).filter(v => v != null);
  const colorScale = heatmapView === 'pct_30'
    ? d3.scaleSequential(d3.interpolateYlOrRd).domain([0, d3.max(allVals)])
    : d3.scaleSequential(d3.interpolatePurples).domain([0, d3.max(allVals)]);

  // X axis (diag labels)
  svg.selectAll('.x-label').data(diags).enter().append('text')
    .attr('x', (d,i) => i * cellW + cellW / 2).attr('y', -10)
    .attr('text-anchor','middle').attr('fill','var(--text-muted)').attr('font-size', 11)
    .text(d => d.length > 9 ? d.substring(0,9) : d);

  // Y axis (age labels)
  svg.selectAll('.y-label').data(ages).enter().append('text')
    .attr('x', -10).attr('y', (d,i) => i * cellH + cellH / 2 + 4)
    .attr('text-anchor','end').attr('fill','var(--text-muted)').attr('font-size', 11)
    .text(d => d);

  // Cells
  const cells = svg.selectAll('.heatmap-cell').data(data).enter().append('g').attr('class','heatmap-cell');
  cells.append('rect')
    .attr('x', d => diags.indexOf(d.category) * cellW + 2)
    .attr('y', d => ages.indexOf(d.age) * cellH + 2)
    .attr('width', cellW - 4).attr('height', cellH - 4)
    .attr('rx', 4)
    .attr('fill', d => (diags.indexOf(d.category) >= 0 && ages.indexOf(d.age) >= 0) ? colorScale(d[val]) : 'var(--surface-3)')
    .attr('stroke','transparent').attr('stroke-width', 0)
    .on('mouseover', function(e,d) {
      d3.select(this).attr('stroke','#fff').attr('stroke-width', 1.5);
      showTooltip(`<strong>${d.age} — ${d.category}</strong><br>Visits: ${d.total.toLocaleString()}<br>30-day readmit: ${d.pct_30}%`, e);
    }).on('mouseout', function() { d3.select(this).attr('stroke','transparent'); hideTooltip(); });

  // Cell value text
  cells.append('text')
    .attr('x', d => diags.indexOf(d.category) * cellW + cellW / 2)
    .attr('y', d => ages.indexOf(d.age) * cellH + cellH / 2 + 4)
    .attr('text-anchor','middle').attr('fill', '#1e293b').attr('font-size', 10).attr('font-weight', 600)
    .attr('pointer-events','none')
    .text(d => heatmapView === 'pct_30' ? d.pct_30 + '%' : (d.total >= 1000 ? (d.total/1000).toFixed(1)+'k' : d.total));

  // Color legend bar
  const lw = 150, lh = 8;
  const lx = (w - margin.left - margin.right) / 2 - lw / 2, ly = ages.length * cellH + 16;
  const defs = svg.append('defs');
  const lg = defs.append('linearGradient').attr('id','hmGrad').attr('x1','0').attr('x2','1').attr('y1','0').attr('y2','0');
  lg.append('stop').attr('offset','0%').attr('stop-color', colorScale(0));
  lg.append('stop').attr('offset','100%').attr('stop-color', colorScale(d3.max(allVals)));
  svg.append('rect').attr('x',lx).attr('y',ly).attr('width',lw).attr('height',lh).attr('fill','url(#hmGrad)').attr('rx',4);
  svg.append('text').attr('x',lx).attr('y',ly-4).attr('fill','var(--text-muted)').attr('font-size',9).text('Low');
  svg.append('text').attr('x',lx+lw).attr('y',ly-4).attr('text-anchor','end').attr('fill','var(--text-muted)').attr('font-size',9).text('High');
}

function renderPCP(colorBy) {
  if (colorBy) pcpColorBy = colorBy;
  const container = document.getElementById('chart-pcp');
  if (!container) return;
  container.innerHTML = '';
  const data = hospitalData.diagnosis_category.filter(d => d.total > 500);

  const dimensions = [
    { key: 'total', label: 'Total Visits' },
    { key: 'avg_time', label: 'Avg Days' },
    { key: 'avg_meds', label: 'Avg Meds' },
    { key: 'avg_lab', label: 'Avg Lab Tests' },
    { key: 'pct_30', label: 'Readmit %' }
  ];

  const margin = { top: 60, right: 80, bottom: 40, left: 40 };
  const w = container.clientWidth || 700, h = 300;
  const width = w - margin.left - margin.right;
  const height = h - margin.top - margin.bottom;

  const svg = d3.select(container).append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint().domain(dimensions.map(d => d.key)).range([0, width]).padding(0.1);
  const yScales = {};
  dimensions.forEach(dim => {
    const vals = data.map(d => d[dim.key]).filter(v => v != null);
    yScales[dim.key] = d3.scaleLinear().domain([d3.min(vals), d3.max(vals)]).range([height, 0]).nice();
  });

  const colorVals = data.map(d => d[pcpColorBy]);
  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([d3.max(colorVals), d3.min(colorVals)]);

  function lineGen(d) {
    return d3.line()(dimensions.map(dim => [x(dim.key), yScales[dim.key](d[dim.key] || 0)]));
  }

  // Draw lines
  const lines = svg.selectAll('.pcp-line').data(data).enter().append('path').attr('class','pcp-line')
    .attr('d', lineGen)
    .attr('fill','none')
    .attr('stroke', d => colorScale(d[pcpColorBy]))
    .attr('stroke-width', 2.5)
    .attr('opacity', 0.75)
    .attr('stroke-linecap','round')
    .on('mouseover', function(e,d) {
      d3.select(this).attr('stroke-width', 4).attr('opacity', 1);
      showTooltip(`<strong>${d.category}</strong><br>Readmit: ${d.pct_30}%<br>Avg Stay: ${d.avg_time}d<br>Avg Meds: ${d.avg_meds}<br>Avg Lab: ${d.avg_lab}<br>Visits: ${d.total.toLocaleString()}`, e);
    }).on('mouseout', function() {
      d3.select(this).attr('stroke-width', 2.5).attr('opacity', 0.75);
      hideTooltip();
    });

  // Draw axes
  dimensions.forEach(dim => {
    const axisG = svg.append('g').attr('transform', `translate(${x(dim.key)},0)`);
    axisG.call(d3.axisLeft(yScales[dim.key]).ticks(4)).select('.domain').attr('stroke','var(--border)');
    axisG.selectAll('.tick text').attr('fill','var(--text-muted)').attr('font-size',10).attr('x',-4);
    axisG.selectAll('.tick line').attr('stroke','var(--border)');
    axisG.append('text').attr('y',-15).attr('text-anchor','middle').attr('fill','var(--text-secondary)').attr('font-size',12).attr('font-weight',600).text(dim.label);

    // Dots on axes
    data.forEach(d => {
      axisG.append('circle').attr('cy', yScales[dim.key](d[dim.key] || 0)).attr('r', 4)
        .attr('fill', colorScale(d[pcpColorBy])).attr('stroke','var(--surface-1)').attr('stroke-width',1.5)
        .attr('opacity', 0.9);
    });
  });

  // Labels on lines (right end - category names)
  const lastDim = dimensions[dimensions.length - 1];
  svg.selectAll('.pcp-label').data(data).enter().append('text')
    .attr('x', x(lastDim.key) + 6)
    .attr('y', d => yScales[lastDim.key](d[lastDim.key] || 0) + 4)
    .attr('fill', d => colorScale(d[pcpColorBy])).attr('font-size', 10).attr('font-weight', 600)
    .text(d => d.category.substring(0,8));
}

// Heatmap and PCP controls
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-chart="heatmap"]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-chart="heatmap"]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderHeatmap(this.dataset.view);
    });
  });
  const pcpSelect = document.getElementById('pcpColorBy');
  if (pcpSelect) {
    pcpSelect.addEventListener('change', function() { renderPCP(this.value); });
  }
});

// ===== SECTION 4: TIMELINE =====
let timelineInstance = null;
let timelineInitialized = false;

function initTimeline() {
  if (timelineInitialized) return;
  timelineInitialized = true;

  const groups = new vis.DataSet([
    { id: 1, content: '<span style="color:#a78bfa;font-weight:600">Planning</span>' },
    { id: 2, content: '<span style="color:#06B6D4;font-weight:600">Data Work</span>' },
    { id: 3, content: '<span style="color:#F59E0B;font-weight:600">Development</span>' },
    { id: 4, content: '<span style="color:#10B981;font-weight:600">Testing</span>' },
    { id: 5, content: '<span style="color:#EC4899;font-weight:600">Delivery</span>' },
  ]);

  const items = new vis.DataSet([
    // Planning
    { id:1, group:1, content:'Project Initiation', start:'2026-02-10', end:'2026-02-20', title:'<strong>Project Initiation</strong><br>Define scope, domain selection (Healthcare), team roles and responsibilities assigned.', className:'item-planning' },
    { id:2, group:1, content:'Requirements Analysis', start:'2026-02-18', end:'2026-02-28', title:'<strong>Requirements Analysis</strong><br>Stakeholder requirements gathered. Visualization goals and user groups identified.', className:'item-planning' },
    { id:3, group:1, content:'Tool Selection', start:'2026-02-25', end:'2026-03-05', title:'<strong>Tool Selection</strong><br>D3.js, vis.js Timeline selected. TopoJSON for maps. Tech stack finalized.', className:'item-planning' },
    // Data Work
    { id:4, group:2, content:'Data Collection', start:'2026-03-01', end:'2026-03-15', title:'<strong>Data Collection</strong><br>UCI Hospital Dataset (101,766 records) and CDC Diabetes Surveillance data downloaded and reviewed.', className:'item-data' },
    { id:5, group:2, content:'Data Understanding', start:'2026-03-10', end:'2026-03-20', title:'<strong>Data Understanding</strong><br>Exploratory analysis of diabetic_data.csv and cdc_diabetes_state.csv. DATA_UNDERSTANDING.md created.', className:'item-data' },
    { id:6, group:2, content:'Data Cleaning', start:'2026-03-18', end:'2026-04-05', title:'<strong>Data Cleaning</strong><br>Handling ? values, IDS_mapping applied, diagnosis categorization implemented. 0% fabrication policy enforced.', className:'item-data' },
    { id:7, group:2, content:'Data Aggregation', start:'2026-04-02', end:'2026-04-12', title:'<strong>Data Aggregation</strong><br>JSON pre-aggregation via Python scripts. hospital_data.json and cdc_data.json generated.', className:'item-data' },
    // Development
    { id:8, group:3, content:'Dashboard Design', start:'2026-04-10', end:'2026-04-20', title:'<strong>Dashboard Design</strong><br>UI/UX wireframing. Dark theme design system created. User-centered design for Adult, Child, Elderly.', className:'item-dev' },
    { id:9, group:3, content:'Core Charts (D3)', start:'2026-04-18', end:'2026-05-05', title:'<strong>Core Charts</strong><br>D3.js v7 charts: stacked bar, donut, line, histogram, map with zoom. KPI cards implemented.', className:'item-dev' },
    { id:10, group:3, content:'Interactive Features', start:'2026-05-01', end:'2026-05-18', title:'<strong>Interactive Features</strong><br>Cross-filtering, drill-down, tooltips, dynamic age explorer, filter controls all implemented.', className:'item-dev' },
    { id:11, group:3, content:'Advanced Visualizations', start:'2026-05-15', end:'2026-05-28', title:'<strong>Advanced Visualizations</strong><br>Heatmap (Age x Diagnosis) and Parallel Coordinates Plot implemented with D3.', className:'item-dev' },
    { id:12, group:3, content:'Timeline Module', start:'2026-05-25', end:'2026-06-05', title:'<strong>Timeline Module</strong><br>vis.js Timeline integrated with 6 project phases, interactive zoom/pan, milestone cards.', className:'item-dev' },
    // Testing
    { id:13, group:4, content:'Unit Testing', start:'2026-06-01', end:'2026-06-12', title:'<strong>Unit Testing</strong><br>All D3 chart renders verified. Cross-filter state management tested. Edge cases handled.', className:'item-test' },
    { id:14, group:4, content:'Accessibility Review', start:'2026-06-08', end:'2026-06-18', title:'<strong>Accessibility Review</strong><br>User mode switching tested (Child/Adult/Elderly). Font sizes, contrast ratios reviewed.', className:'item-test' },
    { id:15, group:4, content:'Validation', start:'2026-06-15', end:'2026-06-25', title:'<strong>Validation</strong><br>Data accuracy cross-checked against source CSVs. All chart values verified.', className:'item-test' },
    // Delivery
    { id:16, group:5, content:'Report Writing', start:'2026-06-20', end:'2026-07-05', title:'<strong>Report Writing</strong><br>5-10 page project report with data storytelling, methodology, and insights documented.', className:'item-delivery' },
    { id:17, group:5, content:'Poster Design', start:'2026-07-01', end:'2026-07-10', title:'<strong>Poster Design</strong><br>Soft-copy poster created for demonstration. Highlights key insights and visualizations.', className:'item-delivery' },
    { id:18, group:5, content:'Deployment', start:'2026-07-08', end:'2026-07-18', title:'<strong>Deployment/Presentation</strong><br>Dashboard deployed. Final testing completed. Ready for Week 11 class demonstration.', className:'item-delivery' },
    { id:19, group:5, content:'Class Presentation', start:'2026-07-20', type:'point', title:'<strong>Class Presentation</strong><br>Live demonstration of DiabeticsInsight dashboard. Due date: 20 July 2026.', className:'item-delivery' },
  ]);

  const options = {
    start: '2026-02-01',
    end: '2026-08-01',
    min: '2026-01-15',
    max: '2026-08-15',
    height: '380px',
    groupOrder: 'id',
    stack: false,
    showCurrentTime: true,
    zoomMin: 1000 * 60 * 60 * 24 * 7,
    zoomMax: 1000 * 60 * 60 * 24 * 200,
    orientation: { axis: 'top' },
    tooltip: { followMouse: true, overflowMethod: 'cap' },
    selectable: true,
    multiselect: false,
  };

  const container = document.getElementById('vis-timeline');
  timelineInstance = new vis.Timeline(container, items, groups, options);

  // Buttons
  document.getElementById('tlFitBtn').addEventListener('click', () => timelineInstance.fit());
  document.getElementById('tlTodayBtn').addEventListener('click', () => timelineInstance.moveTo(new Date()));

  // Legend
  const legendData = [
    { color: '#4f46e5', label: 'Planning' },
    { color: '#0284c7', label: 'Data Work' },
    { color: '#d97706', label: 'Development' },
    { color: '#059669', label: 'Testing' },
    { color: '#db2777', label: 'Delivery' },
  ];
  const legend = document.getElementById('timelineLegend');
  legend.innerHTML = legendData.map(l => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${l.color}"></div>
      <span>${l.label}</span>
    </div>
  `).join('');

  // Milestones
  renderMilestones();
}

function renderMilestones() {
  const milestones = [
    { icon: '<i data-lucide="rocket"></i>', title: 'Project Initiation', date: 'Feb 10, 2026', desc: 'Healthcare domain selected. Diabetes dataset identified. Team roles assigned and project scope defined.', color: '#4f46e5', status: 'done' },
    { icon: '<i data-lucide="bar-chart-2"></i>', title: 'Data Collection', date: 'Mar 1–15, 2026', desc: 'UCI Hospital dataset (101,766 records) and CDC State Diabetes Indicators (2000–2024) downloaded and reviewed.', color: '#0284c7', status: 'done' },
    { icon: '<i data-lucide="sparkles"></i>', title: 'Data Cleaning', date: 'Mar 18 – Apr 5, 2026', desc: 'IDS_mapping applied. Diagnosis codes categorized. Messy values labeled (not dropped). JSON aggregations generated.', color: '#0284c7', status: 'done' },
    { icon: '<i data-lucide="monitor-play"></i>', title: 'Dashboard Development', date: 'Apr 10 – Jun 5, 2026', desc: 'D3.js dashboard built with KPIs, interactive charts, cross-filtering, drill-down, heatmap, parallel coordinates, and vis.js timeline.', color: '#d97706', status: 'done' },
    { icon: '<i data-lucide="check-square"></i>', title: 'Testing & Validation', date: 'Jun 1–25, 2026', desc: 'All charts verified against source data. Accessibility review for Child/Adult/Elderly modes. Edge cases handled.', color: '#059669', status: 'active' },
    { icon: '<i data-lucide="target"></i>', title: 'Deployment & Presentation', date: 'Jul 8–20, 2026', desc: 'Dashboard finalized and deployed. Report and poster completed. Live class demonstration scheduled for Jul 20, 2026.', color: '#db2777', status: 'upcoming' },
  ];
  const grid = document.getElementById('milestoneGrid');
  grid.innerHTML = milestones.map(m => `
    <div class="milestone-card" style="border-top-color:${m.color}">
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-title">${m.title}</div>
      <div class="milestone-date">${m.date}</div>
      <div class="milestone-desc">${m.desc}</div>
      <span class="milestone-status status-${m.status}">
        ${m.status === 'done' ? '✓ Completed' : m.status === 'active' ? '● In Progress' : '○ Upcoming'}
      </span>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

// ===== VIS.JS TIMELINE ITEM STYLES =====
(function injectTimelineStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .item-planning { background: rgba(79,70,229,0.9) !important; border-color: #7C3AED !important; color: #fff !important; }
    .item-data     { background: rgba(2,132,199,0.9) !important;  border-color: #06B6D4 !important; color: #fff !important; }
    .item-dev      { background: rgba(217,119,6,0.9) !important; border-color: #F59E0B !important; color: #fff !important; }
    .item-test     { background: rgba(5,150,105,0.9) !important; border-color: #10B981 !important; color: #fff !important; }
    .item-delivery { background: rgba(219,39,119,0.9) !important; border-color: #EC4899 !important; color: #fff !important; }
    .vis-item.vis-selected { border-width: 2px !important; box-shadow: 0 0 12px rgba(255,255,255,0.3) !important; }
    .vis-panel.vis-left .vis-label { padding: 0 8px; display: flex; align-items: center; font-size:13px; }
    .vis-panel.vis-left { background: rgba(241,245,249,0.9) !important; border-right: 1px solid rgba(226,232,240,1) !important; }
    .vis-time-axis .vis-text { color: #475569 !important; }
    .vis-time-axis .vis-grid.vis-minor { border-color: #f1f5f9 !important; }
    .vis-time-axis .vis-grid.vis-major { border-color: #e2e8f0 !important; }
    .vis-background { background: #f8fafc !important; }
    .vis-current-time { background: #06B6D4 !important; }
  `;
  document.head.appendChild(style);
})();

// ===== ENTRY POINT =====
let resizeTimer = null;
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  loadData();
  // Debounced resize handler
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const active = document.querySelector('.page-section.active');
      if (active && hospitalData) {
        if (active.id === 'section-dashboard') {
          renderReadmitByAge(document.querySelector('[data-chart="readmit-age"].active')?.dataset.view || 'stacked');
          renderDiagCategory(document.querySelector('[data-chart="diag"].active')?.dataset.view || 'total');
          renderA1C(); renderAdmissionTypes(); renderLOS();
          renderNationalTrend(trendView);
          if (usGeo) drawMap(document.getElementById('mapYearSelect').value, usGeo);
        } else if (active.id === 'section-interactive') {
          renderCFRace(); renderCFGender(); renderCFInsulin(); renderCFDischarge();
          if (selectedDiag) renderDrilldown(selectedDiag);
          if (selectedAge) renderAgeDetail(selectedAge);
        } else if (active.id === 'section-advanced') {
          renderHeatmap(); renderPCP();
        }
      }
    }, 250);
  });
});
