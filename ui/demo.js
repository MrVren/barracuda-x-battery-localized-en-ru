// Sample history for the browser preview. The real window reads the headset log instead.
window.createDemoApi = function createDemoApi() {
  const now = Date.now() / 1000;
  const pad = n => String(n).padStart(2, '0');
  const local = (offset, h, m) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(h, m || 0, 0, 0);
    return d.getTime() / 1000;
  };
  const iso = offset => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  const line = (t0, p0, t1, p1) => {
    const step = Math.max(900, (t1 - t0) / 7);
    const pts = [];
    for (let t = t0; t < t1 - 1; t += step) {
      const k = (t - t0) / (t1 - t0);
      pts.push([Math.round(t), Math.round(p0 + (p1 - p0) * k)]);
    }
    pts.push([Math.round(t1), p1]);
    return pts;
  };
  const sess = (charging, t0, p0, t1, p1, extra) => ({
    charging, start: t0, end: t1, from: p0, to: p1,
    duration: extra && extra.duration || (t1 - t0),
    rate: extra && extra.rate,
    ongoing: !!(extra && extra.ongoing),
    points: line(t0, p0, Math.min(t1, now), p1),
  });

  const night = sess(false, local(-1, 3, 15), 76, local(-1, 7, 40), 48, { rate: 6.4 });
  const morningCharge = sess(true, local(-1, 8, 5), 48, local(-1, 10, 30), 100, { rate: 21.5 });
  const afternoon = sess(false, local(-1, 13, 10), 100, local(-1, 16, 45), 81, { rate: 5.4 });
  const topUp = sess(true, local(-1, 17, 10), 81, local(-1, 17, 55), 100, { rate: 25.3 });
  const eveningStart = local(-1, 18, 5);
  const eveningDrop = 42;
  const eveningRate = 5.7;
  const evening = sess(false, eveningStart, 100, now, 100 - eveningDrop, {
    duration: eveningDrop / eveningRate * 3600,
    rate: eveningRate,
    ongoing: true,
  });
  const day = [night, morningCharge, afternoon, topUp, evening];

  const weekSessions = [];
  for (let i = 40; i >= 2; i--) {
    if (i % 7 === 0) continue;
    const use = 3.2 + (i * 3 % 5) * 0.9;
    const drop = Math.min(70, Math.round(use * 6.2));
    const start = local(-i, 18, 15);
    weekSessions.push(sess(false, start, 100, start + use * 3600, 100 - drop, { rate: +(drop / use).toFixed(1) }));
    weekSessions.push(sess(true, start + use * 3600 + 1500, 100 - drop, start + (use + 1.7) * 3600, 100));
  }

  function history(key) {
    const span = key === '7d' ? 7 : key === '30d' ? 30 : key === 'all' ? 90 : 1;
    const t0 = now - span * 86400;
    const sessions = (span === 1 ? day : weekSessions.concat(day)).filter(s => s.end > t0 && s.start < now);
    const drain = span === 1 ? 6.1 : 6.4;
    return {
      t0, t1: now, series: sessions.map(s => ({ charging: s.charging, points: s.points })),
      sessions: sessions.slice().reverse().map(s => ({
        charging: s.charging, start: s.start, end: s.end, duration: s.duration,
        from: s.from, to: s.to, rate: s.rate || null, ongoing: s.ongoing,
      })),
      drain, usage: sessions.filter(s => !s.charging).reduce((a, s) => a + s.duration, 0),
      last_charge: topUp.end,
    };
  }

  const finished = [
    [16, 19, 6.4, 100, 61], [14, 18, 4.2, 100, 74], [13, 12, 3.1, 96, 78],
    [11, 17, 8.2, 100, 49], [10, 18, 5.6, 100, 66], [8, 19, 7.1, 100, 55],
    [7, 13, 2.8, 100, 84], [6, 18, 6.8, 100, 58], [4, 17, 5.1, 100, 69],
    [3, 18, 4.6, 94, 67], [1, 13, 3.6, 100, 81],
  ].map(([days, hour, used, from, to]) => {
    const start = local(-days, hour, 10);
    const drop = from - to;
    return {
      start, start_percent: from, end: start + used * 3600, end_percent: to,
      used: used * 3600, recharged: start + used * 3600 + 1500, drop, rate: +(drop / used).toFixed(1),
    };
  });
  const current = {
    start: eveningStart, start_percent: 100, end: now, end_percent: 100 - eveningDrop,
    used: evening.duration, recharged: null, drop: eveningDrop, rate: eveningRate,
  };

  const dailyHours = [3.4, 5.6, 4.2, 0, 6.8, 2.4, 4.9, 5.1, 1.8, 6.2, 0, 7.4, 8.8, 2.7];
  const daily = dailyHours.map((h, i) => {
    const offset = i - 13;
    const charge = h ? Math.round(h * 0.22 * 10) / 10 : 0;
    return [iso(offset), Math.round(h * 3600), Math.round(charge * 3600)];
  });
  daily[daily.length - 1][1] = Math.round(Math.max(0, now - local(0, 0, 0)));
  daily[daily.length - 1][2] = 0;
  const lives = [18.4, 18.2, 18.1, 17.9, 18.0, 17.8, 17.6, 17.7, 17.5, 17.4, 17.3, 17.1];
  const monday = (weeksAgo) => {
    const d = new Date();
    const back = ((d.getDay() + 6) % 7) + weeksAgo * 7;
    d.setDate(d.getDate() - back);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  const weekly = lives.map((life, i) => [monday(11 - i), life]);

  const mondayOff = -((new Date().getDay() + 6) % 7);
  const daySecs = [4.2 * 3600, 7.4 * 3600, 2.7 * 3600, 0, 0, 0, 0];
  const chargeSecs = [1.1 * 3600, 2.2 * 3600, 0, 0, 0, 0, 0];
  const total = daySecs.reduce((a, b) => a + b, 0) + chargeSecs.reduce((a, b) => a + b, 0);
  const profile = [0.5, 0.35, 0.15, 0, 0, 0, 0, 0.2, 1.0, 1.3, 0.8, 0.3, 0.15, 0.7, 1.1, 0.9, 0.45, 0.25, 1.5, 1.9, 1.7, 1.35, 1.05, 0.7];
  const profileSum = profile.reduce((a, b) => a + b, 0);
  const hours = profile.map(h => h / profileSum * total);
  const days = daySecs.map((a, i) => [iso(mondayOff + i), a, chargeSecs[i]]);

  const api = {
    meta: async () => ({
      eq_presets: [[0, 'Default'], [7, 'Game'], [8, 'Music'], [9, 'Movie'], [255, 'Custom']],
      eq_bands: ['31', '63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'],
      standby: [0, 5, 15, 30, 45, 60],
      low_percent: 20,
      gap: 180,
    }),
    prefs: async () => ({
      lang: new URLSearchParams(location.search).get('lang') || 'ru',
      on_top: false,
      startup: false,
    }),
    state: async () => ({
      rev: [1, 'ok'], now, state: 'ok', message: '', checked: Date.now() / 1000,
      live: true, eta_hours: (100 - eveningDrop) / eveningRate,
      reading: { ts: now, percent: 100 - eveningDrop, charging: false },
    }),
    overview: async () => ({
      t0: now - 86400, t1: now,
      series: day.map(s => ({ charging: s.charging, points: s.points })),
      today: Math.max(0, now - local(0, 0, 0)), week_usage: 31.4 * 3600, drain: 6.1, cycles: 48.6,
      discharge: current,
    }),
    history,
    cycles: async () => ({ items: finished.concat([current]) }),
    usage: async () => ({ daily, weekly, cycles: 48.6, health: lives[lives.length - 1] / lives[0] * 100 }),
    week: async offset => ({
      monday: monday(-offset), offset, can_prev: offset > -8, can_next: offset < 0,
      week: {
        total, charges: 4, charged: 168, life: 100 / 6.1, drain: 6.1,
        longest: now - eveningStart, days, hours, used_days: 3, lowest: 31,
      },
      prev: { total: 24.6 * 3600, charges: 5, charged: 214, life: 17.8, drain: 5.6, longest: 8.4 * 3600 },
    }),
    settings: async () => ({
      version: '1.4.0.2', gaming: 0, receiver_pid: 0x550,
      eq_preset: 7, standby: 15, dnd: 0,
      custom_eq: [7, 8, 6, 5, 4, 5, 6, 7, 7, 6],
    }),
    set_lang: async code => code,
    set_on_top: async () => {},
    set_startup: async () => false,
    refresh: async () => {},
    apply: async () => ({ ok: true }),
    diagnose: async () => 'tanilama.txt',
  };

  return api;
};
