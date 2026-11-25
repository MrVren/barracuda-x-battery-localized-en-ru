'use strict';
// English and Russian UI strings. English is the default.
// A row is [key, en, ru]. An array value is a plural form list: en [one, other], ru [one, few, many].

const ROWS = [
  ["brand.sub", "Headset battery", "Заряд гарнитуры"],
  ["nav.overview", "Overview", "Обзор"],
  ["nav.history", "History", "История"],
  ["nav.cycles", "Cycles", "Циклы"],
  ["nav.usage", "Usage", "Использование"],
  ["nav.week", "Week", "Неделя"],
  ["nav.device", "Device", "Устройство"],
  ["pref.lang", "Language", "Язык"],
  ["pref.top", "Always on top", "Поверх окон"],
  ["pref.startup", "Start with Windows", "Запуск с Windows"],
  ["ov.title", "Overview", "Обзор"],
  ["ov.sub", "Where the headset is now, and what happened since the last charge", "Текущее состояние и что было с последней зарядки"],
  ["ov.refresh", "Read now", "Считать сейчас"],
  ["ov.chart", "Last 24 hours", "Последние 24 часа"],
  ["fact.used", "Use since last charge", "С последней зарядки"],
  ["fact.drop", "Battery drop", "Падение заряда"],
  ["fact.unplug", "Unplugged", "Снято с зарядки"],
  ["hi.title", "History", "История"],
  ["hi.sub", "Battery level over time", "Уровень заряда со временем"],
  ["hi.level", "Battery level", "Уровень заряда"],
  ["hi.sessions", "Sessions", "Сессии"],
  ["th.type", "Type", "Тип"],
  ["th.start", "Start", "Начало"],
  ["th.end", "End", "Конец"],
  ["th.dur", "Duration", "Длительность"],
  ["th.level", "Level", "Уровень"],
  ["th.rate", "Rate", "Скорость"],
  ["cy.title", "Charge cycles", "Циклы зарядки"],
  ["cy.sub", "How long it ran from unplug until it was plugged in again, and how far the battery dropped", "Сколько работала от отключения кабеля до следующей зарядки и насколько сел аккумулятор"],
  ["fact.elapsed", "Elapsed", "Прошло"],
  ["fact.rate", "Drain", "Расход"],
  ["fact.full", "Full-charge estimate", "Прогноз полного заряда"],
  ["cy.chart", "Use per cycle", "Работа по циклам"],
  ["cy.last12", "last 12 cycles", "последние 12 циклов"],
  ["cy.periods", "Cycles", "Циклы"],
  ["th.unplug", "Unplugged", "Снято с зарядки"],
  ["th.recharge", "Plugged in", "Снова на зарядке"],
  ["th.use", "In use", "Работа"],
  ["th.elapsed", "Elapsed", "Прошло"],
  ["th.drop", "Drop", "Падение"],
  ["th.drain", "Drain", "Расход"],
  ["us.title", "Usage", "Использование"],
  ["us.sub", "Daily use and battery health", "Время работы по дням и состояние аккумулятора"],
  ["us.daily", "Daily use", "По дням"],
  ["us.full", "Full-charge life", "Время от полного заряда"],
  ["us.weekly", "weekly", "по неделям"],
  ["note.health", "Battery health is this week’s full-charge life divided by the first week on record. It moves with how you use the headset, and it needs a few weeks of data before it means much.", "Состояние аккумулятора — отношение времени от полного заряда за последнюю неделю к первой неделе в журнале. Зависит от того, как вы пользуетесь гарнитурой; чтобы цифра что-то значила, нужно несколько недель данных."],
  ["wk.title", "Weekly summary", "Недельная сводка"],
  ["wk.sub", "One week of use, compared with the week before", "Неделя использования в сравнении с предыдущей"],
  ["week.byDay", "By day", "По дням"],
  ["week.byHour", "By hour", "По часам"],
  ["week.total", "week total", "за всю неделю"],
  ["device.title", "Device", "Устройство"],
  ["device.sub", "Headset info and settings. Changes are saved on the headset", "Сведения и настройки гарнитуры. Изменения записываются в неё"],
  ["device.read", "Read from headset", "Считать с гарнитуры"],
  ["device.eq", "Equalizer", "Эквалайзер"],
  ["device.apply", "Apply custom EQ", "Применить свой EQ"],
  ["device.flat", "Flatten", "Сбросить"],
  ["device.dnd", "Do not disturb", "Не беспокоить"],
  ["device.dndSub", "The headset’s do not disturb mode", "Режим «Не беспокоить» на гарнитуре"],
  ["device.standby", "Auto power-off", "Автовыключение"],
  ["device.standbySub", "Turns off after this long when left idle", "Выключится через это время, если не пользоваться"],
  ["device.diag", "Diagnostic report", "Отчёт диагностики"],
  ["legend.battery", "On battery", "От батареи"],
  ["legend.charge", "Charging", "Зарядка"],
  ["dur.lt1", "<1 min", "<1 мин"],
  ["dur.d", "{d} d", "{d} д"],
  ["dur.dh", "{d} d {h} h", "{d} д {h} ч"],
  ["dur.h", "{h} h", "{h} ч"],
  ["dur.hm", "{h} h {mm} min", "{h} ч {mm} мин"],
  ["dur.m", "{mm} min", "{mm} мин"],
  ["unit.h", "h", "ч"],
  ["rate", "{v}%/h", "{v}%/ч"],
  ["ago.now", "just now", "только что"],
  ["ago.dur", "{dur} ago", "{dur} назад"],
  ["err.trayDown", "Background app is not running", "Фоновое приложение не запущено"],
  ["err.noAnswer", "Headset is off, out of range, or in Bluetooth mode", "Гарнитура выключена, вне зоны или в режиме Bluetooth"],
  ["err.noDongle", "USB receiver is not plugged in", "USB-приёмник не подключён"],
  ["err.unsupported", "This receiver is not supported: {name} (USB 1532:{pid})", "Этот приёмник не поддерживается: {name} (USB 1532:{pid})"],
  ["err.os", "Error: {err}", "Ошибка: {err}"],
  ["err.generic", "Error: {kind}: {err}", "Ошибка: {kind}: {err}"],
  ["err.rejected", "The headset did not accept the setting", "Гарнитура не приняла настройку"],
  ["err.bad", "Invalid setting: {err}", "Неверная настройка: {err}"],
  ["state.full", "Full", "Полный"],
  ["state.charging", "Charging", "Заряжается"],
  ["state.onBattery", "On battery", "От батареи"],
  ["state.running", "Running on battery", "Работает от батареи"],
  ["state.noData", "No data", "Нет данных"],
  ["state.lastKnown", "Last known · {time}", "Последний · {time}"],
  ["state.noLink", "No connection", "Нет связи"],
  ["state.fullCable", "Full, cable plugged in", "Полный, кабель подключён"],
  ["state.unplug", "You can unplug the cable", "Кабель можно отключить"],
  ["state.collecting", "Collecting data for a time estimate", "Копим данные, чтобы оценить время"],
  ["state.etaFull", "until full", "до полной зарядки"],
  ["state.etaLeft", "estimated time left", "примерно осталось"],
  ["state.lastCheck", "Last check {time}", "Последняя проверка {time}"],
  ["tile.today", "Today", "Сегодня"],
  ["tile.week7", "Last 7 days", "Последние 7 дней"],
  ["tile.drain", "Average drain", "Средний расход"],
  ["tile.cycles", "Charge cycle", "Цикл заряда"],
  ["tile.fullUse", "Full-charge life", "От полного заряда"],
  ["tile.lastCharge", "Last charge", "Последняя зарядка"],
  ["tile.onBattery", "On battery", "От батареи"],
  ["tile.dailyAvg", "Daily average", "В среднем за день"],
  ["tile.health", "Battery health", "Здоровье батареи"],
  ["tile.total", "Total use", "Всего"],
  ["tile.charge", "Charges", "Зарядки"],
  ["tile.longest", "Longest stretch", "Самый долгий отрезок"],
  ["tile.topDay", "Busiest day", "Самый активный день"],
  ["tile.lowest", "Lowest battery", "Минимум заряда"],
  ["tile.daysUsed", "Days used", "Дней с работой"],
  ["tile.firmware", "Firmware", "Прошивка"],
  ["tile.link", "Link", "Связь"],
  ["tile.gaming", "Gaming mode", "Игровой режим"],
  ["sub.headsetOn", "headset on", "гарнитура включена"],
  ["avg.day", "avg {dur}/day", "в среднем {dur}/день"],
  ["sub.fullEta", "full charge ~{dur}", "полный заряд ~{dur}"],
  ["sub.collecting", "collecting data", "данные собираются"],
  ["sub.equiv", "equivalent full charges", "эквивалент полного цикла"],
  ["sub.inRangeBattery", "selected range, on battery", "за выбранный период, от батареи"],
  ["sub.atRate", "at this drain rate", "при таком расходе"],
  ["sub.now", "Now", "Сейчас"],
  ["sub.inRange", "selected range", "за выбранный период"],
  ["tag.charge", "Charge", "Зарядка"],
  ["tag.battery", "Battery", "Батарея"],
  ["ongoing", "ongoing", "идёт"],
  ["empty.sessions", "Nothing logged in this range", "За этот период записей нет"],
  ["cy.none", "No finished charge yet", "Завершённых зарядок ещё нет"],
  ["cy.chargingNow", "Charging now · latest cycle", "Сейчас на зарядке · последний цикл"],
  ["cy.since", "Since last charge", "С последней зарядки"],
  ["cy.latest", "Latest cycle", "Последний цикл"],
  ["cy.onBattery", "headset on, time on battery", "включена, время от батареи"],
  ["cy.left", "{pct}% left", "{pct}% осталось"],
  ["cy.plugged", "plugged in at {pct}%", "поставлена на зарядку с {pct}%"],
  ["cy.unplugged", "unplugged at {pct}%", "снята с зарядки с {pct}%"],
  ["chart.use", "Use", "Работа"],
  ["chart.full", "Full charge", "Полный заряд"],
  ["empty.cycles", "Shows up here after you unplug it and use it", "Появится здесь, когда снимете с зарядки и попользуетесь"],
  ["us.across", ["across 1 day used","across {n} days used"], ["за {n} день использования","за {n} дня использования","за {n} дней использования"]],
  ["health.vs", "vs the first week", "к первой неделе"],
  ["health.need", "needs at least 2 weeks of data", "нужно минимум 2 недели данных"],
  ["week.of", "week of {date}", "неделя {date}"],
  ["week.this", "this week", "эта неделя"],
  ["week.last", "last week", "прошлая неделя"],
  ["was.prev", "last week {v}", "прошлая неделя {v}"],
  ["was.none", "nothing logged last week", "за прошлую неделю записей нет"],
  ["sub.charged", "charged {pct}% in total", "всего заряжено {pct}%"],
  ["sub.longest", "uninterrupted, including while charging", "без пауз, включая время на зарядке"],
  ["sub.lowest", "lowest level of the week", "минимум за неделю"],
  ["sub.firmware", "headset firmware", "прошивка гарнитуры"],
  ["sub.connected", "Connected", "Подключена"],
  ["sub.noReply", "No reply", "Нет ответа"],
  ["sub.gamingNote", "changes over Bluetooth only", "меняется только по Bluetooth"],
  ["on", "On", "Вкл"],
  ["off", "Off", "Выкл"],
  ["recv.ys", "YS-Tech receiver", "приёмник YS-Tech"],
  ["recv.mx", "Macronix receiver", "приёмник Macronix"],
  ["recv.generic", "receiver", "приёмник"],
  ["eq.default", "Default", "По умолчанию"],
  ["eq.game", "Game", "Игра"],
  ["eq.music", "Music", "Музыка"],
  ["eq.film", "Movie", "Фильм"],
  ["eq.custom", "Custom", "Свой"],
  ["standby.min", "{m} min", "{m} мин"],
  ["standby.off", "Off", "Выкл"],
  ["device.reading", "Reading from the headset…", "Чтение с гарнитуры…"],
  ["device.readOk", "Settings read from the headset", "Настройки прочитаны с гарнитуры"],
  ["device.saving", "Saving…", "Сохранение…"],
  ["device.saved", "Saved", "Сохранено"],
  ["toast.eq", "Equalizer changed", "Эквалайзер изменён"],
  ["toast.standby", "Auto power-off saved", "Автовыключение сохранено"],
  ["toast.custom", "Custom EQ applied", "Свой EQ применён"],
  ["toast.dndOn", "Do not disturb on", "«Не беспокоить» включено"],
  ["toast.dndOff", "Do not disturb off", "«Не беспокоить» выключено"],
  ["toast.report", "Report saved: {file} (opened in Explorer)", "Отчёт сохранён: {file} (открыт в Проводнике)"],
  ["range.24h", "24 hours", "24 часа"],
  ["range.7d", "7 days", "7 дней"],
  ["range.30d", "30 days", "30 дней"],
  ["range.all", "All", "Всё"],
  ["word.session", ["session","sessions"], ["сессия","сессии","сессий"]],
  ["word.period", ["cycle","cycles"], ["цикл","цикла","циклов"]],
  ["word.time", ["time","times"], ["раз","раза","раз"]],
];

const I18N = { en: {}, ru: {} };
const _seen = new Set();
for (const row of ROWS) {
  const [key, en, ru] = row;
  if (row.length !== 3 || _seen.has(key)) throw new Error('i18n row ' + key);
  _seen.add(key);
  I18N.en[key] = en;
  I18N.ru[key] = ru;
}

const DAY = {
  en: [['Monday', 'Mon'], ['Tuesday', 'Tue'], ['Wednesday', 'Wed'], ['Thursday', 'Thu'], ['Friday', 'Fri'], ['Saturday', 'Sat'], ['Sunday', 'Sun']],
  ru: [['Понедельник', 'Пн'], ['Вторник', 'Вт'], ['Среда', 'Ср'], ['Четверг', 'Чт'], ['Пятница', 'Пт'], ['Суббота', 'Сб'], ['Воскресенье', 'Вс']],
};

const EQ_LABEL = { 0: 'eq.default', 7: 'eq.game', 8: 'eq.music', 9: 'eq.film', 255: 'eq.custom' };

let lang = 'en';

function plural(n, forms) {
  n = Math.abs(Number(n) || 0);
  if (forms.length === 1) return forms[0];
  if (forms.length === 2) return forms[n === 1 ? 0 : 1];
  const m100 = n % 100, m10 = n % 10;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

function t(key, vars) {
  const bag = I18N[lang] || I18N.en;
  let s = Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : I18N.en[key];
  if (s == null) return key;
  if (Array.isArray(s)) s = plural(vars && vars.n, s);
  if (vars) for (const k in vars) s = String(s).split('{' + k + '}').join(vars[k]);
  return s;
}

function tn(n, key) {
  return `${n} ${t(key, { n })}`;
}

function currentLang() { return lang; }

function dayName(i, short) {
  return (DAY[lang] || DAY.en)[i][short ? 1 : 0];
}

function eqLabel(id, fallback) {
  const key = EQ_LABEL[Number(id)];
  return key ? t(key) : (fallback || '');
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  const sel = document.getElementById('pref-lang');
  if (sel) sel.setAttribute('aria-label', t('pref.lang'));
}

function useLang(code) {
  lang = I18N[code] ? code : 'en';
  applyI18n();
  return lang;
}

function translateError(code) {
  if (!code || code === 'no_answer') return t('err.noAnswer');
  const [kind, ...rest] = String(code).split('\t');
  if (kind === 'no_dongle') return t('err.noDongle');
  if (kind === 'unsupported') return t('err.unsupported', { name: rest[0] || '', pid: rest[1] || '' });
  if (kind === 'os') return t('err.os', { err: rest.join('\t') });
  if (kind === 'err') return t('err.generic', { kind: rest[0] || '', err: rest.slice(1).join('\t') });
  if (kind === 'rejected') return t('err.rejected');
  if (kind === 'bad') return t('err.bad', { err: rest.join('\t') });
  return code;
}

// ponytail: plural() is the one branch worth a check. Runs in the page, fails loud if a form is wrong.
function _i18nSelfCheck() {
  const prev = lang;
  lang = 'ru';
  const got = [1, 2, 5, 11, 21].map(n => tn(n, 'word.session'));
  lang = 'en';
  const en = [tn(1, 'word.session'), tn(2, 'word.session')];
  lang = prev;
  if (got.join('|') !== '1 сессия|2 сессии|5 сессий|11 сессий|21 сессия') throw new Error('ru plural ' + got);
  if (en.join('|') !== '1 session|2 sessions') throw new Error('en plural ' + en);
}
_i18nSelfCheck();
