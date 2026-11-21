(function () {
  'use strict';
  var source = 'https://raw.githubusercontent.com/zigou23/Bing-Daily-Wallpaper/refs/heads/main/bing/weekly/bing_en-GB.json';
  var key = 'cleanframe.bing-wallpapers.v2', day = 24 * 60 * 60 * 1000;
  var state, pending, listeners = [];

  function entries(rows) {
    var seen = new Set();
    return (Array.isArray(rows) ? rows : []).reduce(function (list, row) {
      if (!row || typeof row.url !== 'string' ||
          !/^https:\/\/www\.bing\.com\/th\?id=OHR\.[A-Za-z0-9_.-]+_1920x1080\.jpg$/.test(row.url) ||
          seen.has(row.url)) return list;
      seen.add(row.url);
      list.push({ url: row.url, copyright: typeof row.copyright === 'string' ? row.copyright.slice(0, 300) : '',
        date: typeof row.fullstartdate === 'string' && /^\d{12}$/.test(row.fullstartdate) ? row.fullstartdate : '' });
      return list;
    }, []);
  }

  function newestOf(list) {
    return list.reduce(function (best, entry) { return !best || entry.date > best.date ? entry : best; }, null);
  }

  function save() {
    try { localStorage.setItem(key, JSON.stringify({ attempt: state.attempt, list: state.list })); }
    catch (error) { console.warn('Could not save Bing wallpaper catalogue', error); }
  }

  function get() {
    if (!state) {
      var saved;
      try { localStorage.removeItem('cleanframe.bing-wallpapers.v1'); } catch (error) {}
      try { saved = JSON.parse(localStorage.getItem(key)); }
      catch (error) { console.warn('Could not read Bing wallpaper catalogue', error); }
      state = { attempt: saved && Number.isFinite(saved.attempt) ? saved.attempt : null, list: entries(saved && saved.list), fresh: null };
    }
    var now = Date.now();
    if (!pending && (state.attempt === null || now - state.attempt > day)) {
      state.attempt = now;
      save();
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 12000);
      pending = fetch(source, { credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        }).then(function (rows) {
          var list = entries(rows);
          if (!list.length) throw new Error('No valid UK wallpaper entries');
          var before = newestOf(state.list), after = newestOf(list);
          // The first catalogue is only a baseline; later downloads with a different newest photo trigger a switch.
          if (before && after.url !== before.url) state.fresh = after.url;
          state.list = list;
          save();
          if (state.fresh) listeners.forEach(function (listener) { listener(); });
        }).catch(function (error) {
          console.warn('Could not refresh Bing wallpaper catalogue', error);
        }).finally(function () { clearTimeout(timer); pending = null; });
    }
    return state.list.length || !pending ? Promise.resolve(state.list) : pending.then(function () { return state.list; });
  }

  function shuffled(list) {
    var order = list.slice(), i, j, item;
    for (i = order.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      item = order[i]; order[i] = order[j]; order[j] = item;
    }
    return order;
  }

  // The newest photo from a changed download, until Home has tried it once.
  function fresh() {
    var url = get() && state.fresh;
    return url ? state.list.find(function (entry) { return entry.url === url; }) || null : null;
  }

  function shown(url) {
    if (state && state.fresh === url) state.fresh = null;
  }

  window.CleanFrameBing = { get: get, shuffled: shuffled, fresh: fresh, shown: shown,
    onFresh: function (listener) { listeners.push(listener); } };
})();
