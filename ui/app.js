'use strict';
// Page logic. Data comes from Python through window.pywebview.api (app.pyw Api); every value is computed there,
// this file only formats and draws.

const C = {};  // colors and fonts, read from the CSS variables in app.css by loadTheme()
const RING = 2 * Math.PI * 91, MINI = 2 * Math.PI * 19;

let api, meta, state = null, page = null, lastRev = null, ticking = false;
let range = '24h', weekOffset = 0, settings = null, deviceBusy = false, deviceNote = '';
const charts = {}, segments = {};
const $ = id => document.getElementById(id);
window.__errors = [];
window.addEventListener('error', e => window.__errors.push(String(e.message)));
window.addEventListener('unhandledrejection', e => window.__errors.push(String(e.reason)));

// ---- formatting ----
const pad = n => String(n).padStart(2, '0');
const dec = (x, n = 1) => {
  const s = Number(x).toFixed(n);
  return currentLang() === 'en' ? s : s.replace('.', ',');
};
function fmtDur(s) {
  const m = Math.floor(s / 60);
  if (m < 1) return t('dur.lt1');
  const d = Math.floor(m / 1440), h = Math.floor(m / 60) % 24, mm = m % 60;
  if (d) return h ? t('dur.dh', { d, h }) : t('dur.d', { d });
  return h ? (mm ? t('dur.hm', { h, mm }) : t('dur.h', { h })) : t('dur.m', { mm });
}
const fmtHours = s => { const h = s / 3600; return !h ? '0' : h < 10 ? dec(h) : String(Math.round(h)); };
const fmtTime = ts => { const d = new Date(ts * 1000); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtClock = ts => { const d = new Date(ts * 1000); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const isoDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = date => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
const fmtPct = n => `${n}%`;
const fmtRate = r => t('rate', { v: dec(r) });
const ago = ts => { const s = Date.now() / 1000 - ts; return s < 60 ? t('ago.now') : t('ago.dur', { dur: fmtDur(s) }); };
const now = () => Date.now() / 1000;

// ---- small components ----
const icon = name => `<svg class="icon" viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;

function tiles(id, specs) {
  $(id).innerHTML = specs.map(([key, title, ic, tone]) => `
    <div class="stat">
      <div class="stat-top"><span>${title}</span><span class="badge tone-${tone}">${icon(ic)}</span></div>
      <div class="stat-value" id="v-${key}">—</div>
      <div class="stat-sub" id="s-${key}">&nbsp;</div>
    </div>`).join('');
}

function setStat(key, value, sub) {
  const v = $('v-' + key);
  if (v.textContent !== value) {
    v.textContent = value;
    v.classList.remove('flash');
    void v.offsetWidth;  // restart the animation
    v.classList.add('flash');
  }
  if (sub !== undefined) $('s-' + key).textContent = sub || ' ';
}

function segmented(id, options, onChange) {
  const el = $(id);
  if (onChange) el._on = onChange;
  el.innerHTML = '<div class="thumb"></div>' + options.map(([v, label]) => `<button data-v="${v}">${label}</button>`).join('');
  if (!el._bound) {
    el._bound = true;
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.classList.contains('active')) return;
      setSegment(id, b.dataset.v);
      el._on(b.dataset.v);
    });
  }
  if (id in segments) setSegment(id, segments[id]);
}

function setSegment(id, value) {
  segments[id] = value == null ? null : String(value);
  const el = $(id), thumb = el.querySelector('.thumb');
  let on = null;
  el.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', b.dataset.v === segments[id]);
    if (b.dataset.v === segments[id]) on = b;
  });
  thumb.style.opacity = on && on.offsetWidth ? 1 : 0;
  if (on) {
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.transform = `translateX(${on.offsetLeft}px)`;
  }
}

function toast(text, kind = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = icon(kind === 'ok' ? 'check' : 'circle-alert');
  el.append(text);
  $('toasts').append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2800);
}

function countTo(el, to) {
  cancelAnimationFrame(el._raf);
  if (to == null) { el.textContent = '--'; delete el.dataset.v; return; }
  const from = el.dataset.v ? Number(el.dataset.v) : 0, t0 = performance.now();
  el.dataset.v = to;
  const step = t => {
    const p = Math.min(1, (t - t0) / 1100);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3));
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

// ---- theme ----
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

function loadTheme() {
  const css = getComputedStyle(document.documentElement), v = name => css.getPropertyValue(name).trim();
  Object.assign(C, {
    green: v('--c-battery'), blue: v('--c-charging'), red: v('--c-low'), violet: v('--c-alt'), amber: v('--amber'),
    eqUp: v('--c-eq-up'), eqDown: v('--c-eq-down'), text: v('--text'), muted: v('--muted'), faint: v('--faint'),
    grid: v('--c-grid'), card: v('--c-card'), font: v('--font'), bar: Number(v('--c-bar-radius')),
  });
  Chart.defaults.font.family = C.font;
  Chart.defaults.color = C.muted;
  Chart.defaults.borderColor = C.grid;
  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: v('--c-tooltip'), borderColor: v('--c-tooltip-border'), cornerRadius: Number(v('--c-tooltip-radius')),
    titleColor: C.text,
  });
}

function renderLegends() {
  document.querySelectorAll('[data-legend]').forEach(el => {
    el.innerHTML = `<span><i style="background:${C.green}"></i>${t('legend.battery')}</span><span><i style="background:${C.blue}"></i>${t('legend.charge')}</span>`;
  });
}

function placeNav() {
  const btn = document.querySelector(`#nav button[data-page="${page}"]`), ind = $('nav-indicator');
  ind.style.transform = `translateY(${btn.offsetTop}px)`;
  ind.style.height = `${btn.offsetHeight}px`;
}

// ---- charts ----
Chart.defaults.font.size = 11.5;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation.duration = 850;
Chart.defaults.animation.easing = 'easeOutQuart';
Chart.defaults.plugins.legend.display = false;
Object.assign(Chart.defaults.plugins.tooltip, {
  borderWidth: 1, padding: 12, bodyColor: '#c4cad6', displayColors: false, caretSize: 0,
  titleFont: { weight: '600', size: 12.5 }, bodyFont: { size: 12.5 },
});

function render(id, cfg) {
  let chart = charts[id];
  if (chart) {
    chart.data = cfg.data;
    chart.options = cfg.options;
    chart.$valueText = cfg.$valueText;
    chart.update();
  } else {
    chart = charts[id] = new Chart($(id), cfg);
    chart.$valueText = cfg.$valueText;
  }
  return chart;
}

function replay(ids) {
  for (const id of ids) if (charts[id]) { charts[id].reset(); charts[id].update(); }
}

function timeTicks(t0, t1, max = 8) {
  const steps = [1, 2, 3, 6, 12].map(h => h * 3600).concat([1, 2, 5, 7, 14, 30, 60, 90, 180].map(d => d * 86400));
  const step = steps.find(s => (t1 - t0) / s <= max) || steps[steps.length - 1];
  const d = new Date(t0 * 1000);
  d.setMinutes(0, 0, 0);
  if (step < 86400) while (d / 1000 < t0 || d.getHours() % (step / 3600)) d.setHours(d.getHours() + 1);
  else { d.setHours(0); while (d / 1000 < t0) d.setDate(d.getDate() + 1); }
  const values = [];
  while (d / 1000 <= t1) {
    values.push(d / 1000);
    if (step < 86400) d.setHours(d.getHours() + step / 3600); else d.setDate(d.getDate() + step / 86400);
  }
  return { step, values };
}
const tickLabel = (v, step) => {
  const d = new Date(v * 1000);
  return step >= 86400 || d.getHours() === 0 ? fmtDay(d) : `${pad(d.getHours())}:00`;
};

function fillFor(chart, charging) {
  const a = chart.chartArea;
  if (!a) return 'transparent';
  const key = `${charging}${a.top}-${a.bottom}`;
  chart.$fills = chart.$fills || {};
  if (!chart.$fills[key]) {
    const g = chart.ctx.createLinearGradient(0, a.top, 0, a.bottom), color = charging ? C.blue : C.green;
    g.addColorStop(0, rgba(color, 0.30));
    g.addColorStop(1, rgba(color, 0));
    chart.$fills[key] = g;
  }
  return chart.$fills[key];
}

const lowLine = {
  id: 'lowLine',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea: a, scales: { y } } = chart, py = y.getPixelForValue(meta.low_percent);
    ctx.save();
    ctx.strokeStyle = rgba(C.red, 0.45);
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke();
    ctx.restore();
  },
};

const crosshair = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip && chart.tooltip.getActiveElements();
    if (!active || !active.length) return;
    const { ctx, chartArea: a } = chart, x = active[0].element.x;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom); ctx.stroke();
    ctx.restore();
  },
};

const valueLabels = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const text = chart.$valueText;
    if (!text) return;
    const { ctx } = chart, metas = chart.data.datasets.map((_, i) => chart.getDatasetMeta(i));
    ctx.save();
    ctx.font = `600 11px ${C.font}`;
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    chart.data.labels.forEach((_, i) => {
      const t = text(i);
      if (!t) return;
      let top = Infinity, x = 0;
      for (const m of metas) {
        const el = m.data[i];
        if (el && el.y < top) { top = el.y; x = el.x; }
      }
      const lines = String(t).split('\n');
      lines.forEach((line, k) => ctx.fillText(line, x, top - 6 - (lines.length - 1 - k) * 13));
    });
    ctx.restore();
  },
};

// Lines and bars get a soft glow in the battery color.
const glow = {
  id: 'glow',
  beforeDatasetDraw(chart) {
    chart.ctx.save();
    chart.ctx.shadowColor = rgba(C.green, 0.55);
    chart.ctx.shadowBlur = 12;
  },
  afterDatasetDraw(chart) { chart.ctx.restore(); },
};

function levelPoints(series) {
  const pts = [];
  series.forEach((s, i) => {
    // A gap breaks the line; a switch between charging and battery doesn't, it only changes its color.
    if (i && s.points[0][0] - series[i - 1].points[series[i - 1].points.length - 1][0] > meta.gap)
      pts.push({ x: s.points[0][0] - 1, y: null });
    for (const [t, p] of s.points) pts.push({ x: t, y: p, c: s.charging, solo: s.points.length === 1 });
  });
  return pts;
}

function levelChart(id, data) {
  const ticks = timeTicks(data.t0, data.t1);
  return render(id, {
    type: 'line',
    data: {
      datasets: [{
        data: levelPoints(data.series), parsing: false, spanGaps: false, fill: 'origin',
        borderWidth: 2.2, tension: 0.3, cubicInterpolationMode: 'monotone',
        pointRadius: ctx => ctx.raw && ctx.raw.solo ? 3 : 0,  // a lone reading has no line to show it
        pointBackgroundColor: ctx => ctx.raw && ctx.raw.c ? C.blue : C.green, pointBorderWidth: 0,
        pointHoverRadius: 6, pointHoverBorderWidth: 3, pointHoverBorderColor: C.card,
        pointHoverBackgroundColor: ctx => ctx.raw && ctx.raw.c ? C.blue : C.green,
        segment: {
          borderColor: ctx => ctx.p0.raw.c ? C.blue : C.green,
          backgroundColor: ctx => fillFor(ctx.chart, ctx.p0.raw.c),
        },
      }],
    },
    options: {
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: {
          type: 'linear', min: data.t0, max: data.t1, border: { display: false }, grid: { color: C.grid, drawTicks: false },
          afterBuildTicks: axis => { axis.ticks = ticks.values.map(value => ({ value })); },
          ticks: { callback: v => tickLabel(v, ticks.step), maxRotation: 0, padding: 10 },
        },
        y: {
          min: 0, max: 100, border: { display: false }, grid: { color: C.grid, drawTicks: false },
          ticks: { stepSize: 25, callback: v => fmtPct(v), padding: 10 },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: items => fmtTime(items[0].raw.x),
            label: item => `${fmtPct(item.raw.y)}${item.raw.c ? '   ·   ' + t('legend.charge') : ''}`,
          },
        },
      },
    },
    plugins: [lowLine, crosshair, glow],
  });
}

// datasets: [{label, data (hours), color (or one per bar)}], stacked from the first one up.
function barChart(id, labels, datasets, { valueText, titles, headroom = '18%' } = {}) {
  return render(id, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label, data: d.data, backgroundColor: d.color, hoverBackgroundColor: d.color, stack: 's',
        borderRadius: i === datasets.length - 1 ? { topLeft: C.bar, topRight: C.bar } : 0, borderSkipped: false,
        maxBarThickness: 36, categoryPercentage: 0.72, barPercentage: 0.9,
      })),
    },
    options: {
      scales: {
        x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: false } },
        y: {
          stacked: true, beginAtZero: true, grace: headroom, border: { display: false },
          grid: { color: C.grid, drawTicks: false },
          ticks: { maxTicksLimit: 4, padding: 10, callback: v => `${v % 1 ? dec(v) : v} ${t('unit.h')}` },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: items => titles ? titles[items[0].dataIndex] : items[0].label,
            label: item => item.raw ? `${item.dataset.label}: ${fmtDur(item.raw * 3600)}` : null,
          },
        },
      },
    },
    plugins: [valueLabels, glow],
    $valueText: valueText,
  });
}

// ---- state: ring, sidebar, hero ----
function setRing(pct, tone, charging) {
  const off = RING * (1 - (pct || 0) / 100);
  $('ring-fill').style.strokeDashoffset = off;
  $('mask-fill').style.strokeDashoffset = off;
  $('ring-fill').setAttribute('stroke', `url(#g-${tone})`);
  $('hero').classList.toggle('charging', charging);
  const halo = { green: rgba(C.green, 0.14), blue: rgba(C.blue, 0.16), red: rgba(C.red, 0.14), gray: 'rgba(140,150,170,0.08)' };
  $('hero').style.setProperty('--hero-glow', halo[tone]);
  countTo($('ring-pct'), pct);
  $('mini-fill').style.strokeDashoffset = MINI * (1 - (pct || 0) / 100);
  $('mini-fill').style.stroke = { green: C.green, blue: C.blue, red: C.red, gray: C.faint }[tone];
}

function problem(s) {
  if (!s.checked || now() - s.checked > 180) return t('err.trayDown');
  if (!s.message || s.state === 'no_answer') return t('err.noAnswer');
  return translateError(s.message);
}

function renderState(s) {
  const r = s.reading, live = s.live, pct = r ? r.percent : null;
  const charging = live && r.charging, full = charging && pct >= 100;
  const tone = !live ? 'gray' : charging ? 'blue' : pct <= meta.low_percent ? 'red' : 'green';
  const changed = !state || JSON.stringify([state.live, state.reading]) !== JSON.stringify([s.live, s.reading]);
  state = s;
  if (changed) setRing(pct, tone, charging && !full);

  $('ring-label').innerHTML = charging ? `${icon('zap')}${full ? t('state.full') : t('state.charging')}`
    : live ? t('state.onBattery') : r ? t('state.lastKnown', { time: fmtClock(r.ts) }) : t('state.noData');
  const pill = $('hero-pill');
  pill.className = `pill ${!live ? '' : charging ? 'blue' : tone}`;
  pill.innerHTML = icon(!live ? 'circle-alert' : charging ? 'plug-zap' : pct <= meta.low_percent ? 'battery-low' : 'battery-medium');
  pill.append(!live ? t('state.noLink') : full ? t('state.fullCable') : charging ? t('state.charging') : t('state.running'));

  let eta = '—', etaSub = '';
  if (!live) etaSub = problem(s);
  else if (full) { eta = t('state.full'); etaSub = t('state.unplug'); }
  else if (s.eta_hours == null) etaSub = t('state.collecting');
  else { eta = `~${fmtDur(s.eta_hours * 3600)}`; etaSub = charging ? t('state.etaFull') : t('state.etaLeft'); }
  $('hero-eta').textContent = eta;
  $('hero-eta-sub').textContent = etaSub;

  $('mini-pct').innerHTML = pct == null ? '--' : `${pct}<small>%</small>`;
  $('mini-state').textContent = !live ? t('state.noLink') : full ? t('state.full') : charging ? t('state.charging') : t('state.onBattery');
  $('checked').textContent = s.checked && now() - s.checked <= 180 ? t('state.lastCheck', { time: fmtClock(s.checked) }) : problem(s);
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const s = await api.state();
    renderState(s);
    const rev = JSON.stringify(s.rev);
    if (lastRev !== null && rev !== lastRev && page !== 'device') await loaders[page](false);
    lastRev = rev;
  } catch (e) {
    window.__errors.push(String(e));
  } finally {
    ticking = false;
  }
}

// ---- pages ----
async function loadOverview(enter) {
  const o = await api.overview();
  levelChart('c-overview', o);
  if (enter) replay(['c-overview']);
  setStat('ov-today', o.today ? fmtDur(o.today) : '—', t('sub.headsetOn'));
  setStat('ov-week', o.week_usage ? fmtDur(o.week_usage) : '—', o.week_usage ? t('avg.day', { dur: fmtDur(o.week_usage / 7) }) : '');
  setStat('ov-drain', o.drain ? fmtRate(o.drain) : '—', o.drain ? t('sub.fullEta', { dur: fmtDur(100 / o.drain * 3600) }) : t('sub.collecting'));
  setStat('ov-cycles', dec(o.cycles), t('sub.equiv'));
  const d = o.discharge;
  $('f-used').textContent = d ? fmtDur(d.used) : '—';
  $('f-drop').textContent = d ? `${fmtPct(d.drop)}  ·  ${fmtPct(d.start_percent)} → ${fmtPct(d.end_percent)}` : '—';
  $('f-unplug').textContent = d ? fmtTime(d.start) : '—';
}

async function loadHistory(enter) {
  const h = await api.history(range);
  levelChart('c-history', h);
  if (enter) replay(['c-history']);
  const charging = state && state.live && state.reading.charging;
  setStat('hi-drain', h.drain ? fmtRate(h.drain) : '—', t('sub.inRangeBattery'));
  setStat('hi-life', h.drain ? `~${fmtDur(100 / h.drain * 3600)}` : '—', t('sub.atRate'));
  setStat('hi-charged', charging ? t('sub.now') : h.last_charge ? ago(h.last_charge) : '—', h.last_charge ? fmtTime(h.last_charge) : '');
  setStat('hi-usage', h.usage ? fmtDur(h.usage) : '—', t('sub.inRange'));
  $('sessions-count').textContent = tn(h.sessions.length, 'word.session');
  $('t-sessions').innerHTML = h.sessions.length ? h.sessions.map(s => {
    const color = s.charging ? C.blue : C.green;
    return `<tr><td><span class="tag" style="color:${color}"><i style="background:${color}"></i>${s.charging ? t('tag.charge') : t('tag.battery')}</span></td>
      <td>${fmtTime(s.start)}</td><td>${s.ongoing ? `<span class="muted">${t('ongoing')}</span>` : fmtTime(s.end)}</td>
      <td>${fmtDur(s.duration)}</td><td>${fmtPct(s.from)} → ${fmtPct(s.to)}</td><td>${s.rate ? fmtRate(s.rate) : '—'}</td></tr>`;
  }).join('') : `<tr><td colspan="6" class="empty">${t('empty.sessions')}</td></tr>`;
}

async function loadCycles(enter) {
  const items = (await api.cycles()).items, d = items[items.length - 1];
  const charging = state && state.live && state.reading.charging;
  $('cy-title').textContent = !d ? t('cy.none') : charging ? t('cy.chargingNow')
    : d.recharged == null ? t('cy.since') : t('cy.latest');
  $('cy-used').textContent = d ? fmtDur(d.used) : '—';
  $('cy-used-sub').textContent = t('cy.onBattery');
  $('cy-bar-left').style.width = `${d ? d.end_percent : 0}%`;
  $('cy-bar-used').style.left = `${d ? d.end_percent : 0}%`;
  $('cy-bar-used').style.width = `${d ? d.drop : 0}%`;
  $('cy-from').textContent = d ? (d.recharged == null ? t('cy.left', { pct: d.end_percent }) : t('cy.plugged', { pct: d.end_percent })) : '';
  $('cy-to').textContent = d ? t('cy.unplugged', { pct: d.start_percent }) : '';
  $('cy-drop').textContent = d ? fmtPct(d.drop) : '—';
  $('cy-elapsed').textContent = d ? fmtDur((d.recharged || now()) - d.start) : '—';
  $('cy-rate').textContent = d && d.rate ? fmtRate(d.rate) : '—';
  $('cy-full').textContent = d && d.rate ? `~${fmtDur(100 * 3600 / d.rate)}` : '—';

  const last = items.slice(-12);
  barChart('c-cycles', last.map(c => c.recharged == null ? t('sub.now') : fmtDay(new Date(c.start * 1000))), [{
    label: t('chart.use'), data: last.map(c => c.used / 3600),
    color: last.map(c => c.recharged == null ? rgba(C.green, 0.45) : C.green),
  }], {
    valueText: i => `${fmtHours(last[i].used)} ${t('unit.h')}\n−${fmtPct(last[i].drop)}`, headroom: '32%',
    titles: last.map(c => `${fmtTime(c.start)} → ${c.recharged == null ? t('ongoing') : fmtTime(c.recharged)}`),
  });
  if (enter) replay(['c-cycles']);

  $('cycles-count').textContent = tn(items.length, 'word.period');
  $('t-cycles').innerHTML = items.length ? items.slice().reverse().map(c => `<tr>
    <td>${fmtTime(c.start)}</td><td>${c.recharged == null ? `<span style="color:${C.green}">${t('ongoing')}</span>` : fmtTime(c.recharged)}</td>
    <td>${fmtDur(c.used)}</td><td>${fmtDur((c.recharged || now()) - c.start)}</td>
    <td>${fmtPct(c.start_percent)} → ${fmtPct(c.end_percent)}</td><td>${fmtPct(c.drop)}</td><td>${c.rate ? fmtRate(c.rate) : '—'}</td></tr>`).join('')
    : `<tr><td colspan="7" class="empty">${t('empty.cycles')}</td></tr>`;
}

async function loadUsage(enter) {
  const u = await api.usage();
  const on = u.daily.map(([, a, b]) => a + b), used = on.filter(Boolean);
  setStat('us-today', on[on.length - 1] ? fmtDur(on[on.length - 1]) : '—', t('sub.headsetOn'));
  setStat('us-avg', used.length ? fmtDur(used.reduce((a, b) => a + b) / used.length) : '—', used.length ? t('us.across', { n: used.length }) : '');
  setStat('us-cycles', dec(u.cycles), t('sub.equiv'));
  setStat('us-health', u.health ? fmtPct(Math.round(u.health)) : '—', u.health ? t('health.vs') : t('health.need'));
  barChart('c-daily', u.daily.map(([d]) => fmtDay(isoDate(d))), [
    { label: t('legend.battery'), data: u.daily.map(([, a]) => a / 3600), color: C.green },
    { label: t('legend.charge'), data: u.daily.map(([, , b]) => b / 3600), color: C.blue },
  ], { valueText: i => on[i] ? fmtHours(on[i]) : '' });
  barChart('c-weekly', u.weekly.map(([d]) => fmtDay(isoDate(d))), [
    { label: t('chart.full'), data: u.weekly.map(([, life]) => life || 0), color: C.violet },
  ], { valueText: i => u.weekly[i][1] ? `${Math.round(u.weekly[i][1])} ${t('unit.h')}` : '', titles: u.weekly.map(([d]) => t('week.of', { date: fmtDay(isoDate(d)) })) });
  if (enter) replay(['c-daily', 'c-weekly']);
}

async function loadWeek(enter) {
  const r = await api.week(weekOffset), w = r.week, p = r.prev;
  const monday = isoDate(r.monday), sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  $('week-label').innerHTML = `${fmtDay(monday)} – ${fmtDay(sunday)}<small>${r.offset === 0 ? t('week.this') : r.offset === -1 ? t('week.last') : sunday.getFullYear()}</small>`;
  $('week-prev').disabled = !r.can_prev;
  $('week-next').disabled = !r.can_next;
  const was = v => v ? t('was.prev', { v }) : t('was.none');
  setStat('wk-total', w.total ? fmtDur(w.total) : '—', was(p.total && fmtDur(p.total)));
  setStat('wk-charges', tn(w.charges, 'word.time'), w.charges ? t('sub.charged', { pct: w.charged }) : '');
  setStat('wk-life', w.life ? `~${fmtDur(w.life * 3600)}` : '—', was(p.life && `~${fmtDur(p.life * 3600)}`));
  setStat('wk-drain', w.drain ? fmtRate(w.drain) : '—', was(p.drain && fmtRate(p.drain)));
  setStat('wk-longest', w.longest ? fmtDur(w.longest) : '—', t('sub.longest'));
  const totals = w.days.map(([, a, b]) => a + b), top = totals.indexOf(Math.max(...totals));
  setStat('wk-top', totals[top] ? dayName(top) : '—', totals[top] ? fmtDur(totals[top]) : '');
  setStat('wk-lowest', w.lowest == null ? '—' : fmtPct(w.lowest), t('sub.lowest'));
  setStat('wk-days', `${w.used_days} / 7`, w.used_days ? t('avg.day', { dur: fmtDur(w.total / w.used_days) }) : '');
  barChart('c-week-days', w.days.map((_, i) => dayName(i, true)), [
    { label: t('legend.battery'), data: w.days.map(([, a]) => a / 3600), color: C.green },
    { label: t('legend.charge'), data: w.days.map(([, , b]) => b / 3600), color: C.blue },
  ], { valueText: i => totals[i] ? fmtHours(totals[i]) : '', titles: w.days.map(([d], i) => `${dayName(i)}, ${fmtDay(isoDate(d))}`) });
  barChart('c-week-hours', w.hours.map((_, h) => pad(h)), [
    { label: t('chart.use'), data: w.hours.map(s => s / 3600), color: C.violet },
  ], { titles: w.hours.map((_, h) => `${pad(h)}:00 – ${pad(h + 1)}:00`) });
  if (enter) replay(['c-week-days', 'c-week-hours']);
}

// ---- device ----
function deviceNoteText(note) {
  if (note === 'reading') return t('device.reading');
  if (note === 'ok') return t('device.readOk');
  if (note === 'saving') return t('device.saving');
  if (note === 'saved') return t('device.saved');
  return note ? translateError(note) : '';
}

function setDeviceBusy(on, note) {
  deviceBusy = on;
  $('device').classList.toggle('loading', on && !settings);
  $('btn-reread').disabled = on;
  $('btn-reread').classList.toggle('spinning', on);
  if (note !== undefined) deviceNote = note;
  if (deviceNote) $('device-status').textContent = deviceNoteText(deviceNote);
  enableControls(!on && !!settings);
}

function enableControls(on) {
  document.querySelectorAll('#bands input, #eq-actions button').forEach(el => { el.disabled = !on; });
  for (const id of ['seg-eq', 'seg-standby']) $(id).classList.toggle('disabled', !on);
  $('dnd-label').classList.toggle('disabled', !on);
}

function setBand(i, v) {
  const input = $(`b-${i}`), val = $(`bv-${i}`);
  input.value = v;
  val.textContent = v > 0 ? `+${v}` : String(v);
  val.className = `val ${v > 0 ? 'up' : v < 0 ? 'down' : ''}`;
  const a = 50, b = (v + 5) * 10, lo = Math.min(a, b), hi = Math.max(a, b), col = v >= 0 ? C.eqUp : C.eqDown;
  const track = 'rgba(255,255,255,0.07)';
  input.style.background = `linear-gradient(to top, ${track} 0 ${lo}%, ${col} ${lo}% ${hi}%, ${track} ${hi}% 100%)`;
}

function renderSettings() {
  const s = settings;
  const recv = s && (s.receiver_pid === 0x550 ? t('recv.ys') : s.receiver_pid === 0x552 ? t('recv.mx') : t('recv.generic'));
  setStat('dv-version', s ? `v${s.version}` : '—', t('sub.firmware'));
  setStat('dv-link', s ? t('sub.connected') : t('sub.noReply'), s ? `2.4 GHz · ${recv}` : t('err.noAnswer'));
  setStat('dv-gaming', s ? (s.gaming ? t('on') : t('off')) : '—', t('sub.gamingNote'));
  enableControls(!!s && !deviceBusy);
  if (!s) return;
  setSegment('seg-eq', s.eq_preset);
  setSegment('seg-standby', s.standby);
  s.custom_eq.forEach((raw, i) => setBand(i, raw - 5));
  $('dnd').checked = !!s.dnd;
}

async function loadDevice(enter, force = false) {
  if (settings && !force) return;
  setDeviceBusy(true, 'reading');
  const s = await api.settings();
  settings = s.error ? null : s;
  setDeviceBusy(false, s.error || 'ok');
  renderSettings();
}

async function applySettings(changes, done) {
  setDeviceBusy(true, 'saving');
  const r = await api.apply(changes);
  if (r.ok) for (const [key, values] of changes) settings[key] = key === 'custom_eq' ? values : values[0];
  setDeviceBusy(false, r.ok ? 'saved' : r.error);
  toast(r.ok ? done : translateError(r.error), r.ok ? 'ok' : 'err');
  renderSettings();  // on failure this puts the controls back to the headset's values
}

// ---- navigation ----
const loaders = { overview: loadOverview, history: loadHistory, cycles: loadCycles, usage: loadUsage, week: loadWeek, device: loadDevice };

async function showPage(name) {
  if (name === page) return;
  page = name;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  placeNav();
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${name}`));
  $('main').scrollTop = 0;
  for (const id in segments) setSegment(id, segments[id]);  // measured now that the page is laid out
  try { await loaders[name](true); } catch (e) { window.__errors.push(String(e)); }
}

function rangeOptions() {
  return [['24h', t('range.24h')], ['7d', t('range.7d')], ['30d', t('range.30d')], ['all', t('range.all')]];
}
function eqOptions() {
  return meta.eq_presets.map(([k, name]) => [k, eqLabel(k, name)]);
}
function standbyOptions() {
  return meta.standby.map(m => [m, m ? t('standby.min', { m }) : t('standby.off')]);
}
function buildTiles() {
  tiles('stats-overview', [['ov-today', t('tile.today'), 'clock', 'green'], ['ov-week', t('tile.week7'), 'calendar-days', 'violet'],
    ['ov-drain', t('tile.drain'), 'gauge', 'amber'], ['ov-cycles', t('tile.cycles'), 'repeat', 'blue']]);
  tiles('stats-history', [['hi-drain', t('tile.drain'), 'gauge', 'amber'], ['hi-life', t('tile.fullUse'), 'timer', 'violet'],
    ['hi-charged', t('tile.lastCharge'), 'zap', 'blue'], ['hi-usage', t('tile.onBattery'), 'clock', 'green']]);
  tiles('stats-usage', [['us-today', t('tile.today'), 'clock', 'green'], ['us-avg', t('tile.dailyAvg'), 'chart-column', 'violet'],
    ['us-cycles', t('tile.cycles'), 'repeat', 'blue'], ['us-health', t('tile.health'), 'activity', 'amber']]);
  tiles('stats-week', [['wk-total', t('tile.total'), 'clock', 'green'], ['wk-charges', t('tile.charge'), 'zap', 'blue'],
    ['wk-life', t('tile.fullUse'), 'timer', 'violet'], ['wk-drain', t('tile.drain'), 'gauge', 'amber']]);
  tiles('stats-week2', [['wk-longest', t('tile.longest'), 'headphones', 'blue'], ['wk-top', t('tile.topDay'), 'calendar-days', 'violet'],
    ['wk-lowest', t('tile.lowest'), 'battery-low', 'red'], ['wk-days', t('tile.daysUsed'), 'activity', 'green']]);
  tiles('stats-device', [['dv-version', t('tile.firmware'), 'info', 'blue'], ['dv-link', t('tile.link'), 'wifi', 'green'],
    ['dv-gaming', t('tile.gaming'), 'gamepad-2', 'violet']]);
}

async function applyLanguage(code) {
  useLang(code);
  $('pref-lang').value = currentLang();
  await api.set_lang(currentLang());
  renderLegends();
  buildTiles();
  segmented('seg-range', rangeOptions());
  segmented('seg-eq', eqOptions());
  segmented('seg-standby', standbyOptions());
  if (state) renderState(state);
  renderSettings();
  if (deviceNote) setDeviceBusy(deviceBusy, deviceNote);
  if (page) await loaders[page](false);
}

async function init() {
  if (!window.pywebview && new URLSearchParams(location.search).has('demo')) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'demo.js';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
    window.pywebview = { api: window.createDemoApi() };
  }
  api = window.pywebview.api;
  meta = await api.meta();
  const prefs = await api.prefs();
  useLang(prefs.lang);
  $('pref-lang').value = currentLang();
  loadTheme();
  document.querySelectorAll('i[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });
  renderLegends();
  for (const id of ['ring-fill', 'mask-fill']) { $(id).style.strokeDasharray = RING; $(id).style.strokeDashoffset = RING; }
  $('mini-fill').style.strokeDasharray = MINI;
  $('mini-fill').style.strokeDashoffset = MINI;

  buildTiles();

  segmented('seg-range', rangeOptions(), v => { range = v; loadHistory(true); });
  setSegment('seg-range', range);
  segmented('seg-eq', eqOptions(), v => applySettings([['eq_preset', [Number(v)]]], t('toast.eq')));
  segmented('seg-standby', standbyOptions(), v => applySettings([['standby', [Number(v)]]], t('toast.standby')));
  $('bands').insertAdjacentHTML('afterbegin', meta.eq_bands.map((hz, i) => `
    <div class="band"><span class="val" id="bv-${i}">0</span>
      <input type="range" min="-5" max="5" step="1" value="0" id="b-${i}"><span class="hz">${hz}</span></div>`).join(''));
  meta.eq_bands.forEach((_, i) => { setBand(i, 0); $(`b-${i}`).addEventListener('input', e => setBand(i, Number(e.target.value))); });
  $('eq-apply').addEventListener('click', () => applySettings(
    [['custom_eq', meta.eq_bands.map((_, i) => Number($(`b-${i}`).value) + 5)], ['eq_preset', [255]]], t('toast.custom')));
  $('eq-flat').addEventListener('click', () => meta.eq_bands.forEach((_, i) => setBand(i, 0)));
  $('dnd').addEventListener('change', e => applySettings([['dnd', [e.target.checked ? 1 : 0]]], e.target.checked ? t('toast.dndOn') : t('toast.dndOff')));
  $('btn-reread').addEventListener('click', () => loadDevice(false, true));
  $('btn-diagnose').addEventListener('click', async () => {
    const btn = $('btn-diagnose');
    btn.disabled = true;
    btn.classList.add('spinning');
    try {
      const file = (await api.diagnose()).split(/[\\/]/).pop();
      toast(t('toast.report', { file }));
    } finally { btn.disabled = false; btn.classList.remove('spinning'); }
  });
  renderSettings();

  $('week-prev').addEventListener('click', () => { weekOffset--; loadWeek(true); });
  $('week-next').addEventListener('click', () => { weekOffset++; loadWeek(true); });
  $('btn-refresh').addEventListener('click', async () => {
    const btn = $('btn-refresh'), before = state && state.checked;
    btn.classList.add('spinning');
    await api.refresh();
    for (let i = 0; i < 20 && state && state.checked === before; i++) await new Promise(r => setTimeout(r, 500));
    btn.classList.remove('spinning');
  });
  document.querySelectorAll('#nav button').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));

  $('pref-top').checked = prefs.on_top;
  $('pref-startup').checked = prefs.startup;
  $('pref-top').addEventListener('change', e => api.set_on_top(e.target.checked));
  $('pref-startup').addEventListener('change', async e => { e.target.checked = await api.set_startup(e.target.checked); });
  $('pref-lang').addEventListener('change', e => applyLanguage(e.target.value));

  await tick();
  await showPage('overview');
  document.documentElement.classList.remove('booting');  // fades the app in once filled
  setInterval(tick, 2000);
}

window.addEventListener('pywebviewready', init);
