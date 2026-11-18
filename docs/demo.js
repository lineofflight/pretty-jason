// The live inspector on the home page: src/content.js from the extension, run
// on a sample payload inside the demo window instead of on a JSON document.
(function () {
  'use strict';

  const demo = document.getElementById('demo');
  if (!demo) return;

  const now = Date.now();
  const parsedData = {
    id: 13,
    name: 'Pretty Jason',
    open_source: true,
    telemetry: null,
    repository: 'https://github.com/lineofflight/pretty-jason',
    released_at: '2026-11-13T13:13:13Z',
    theme: {
      accent: '#b91c4b',
      link: 'oklch(55% 0.2 255)'
    }
  };

  const BASE_URL = 'https://lineofflight.dev';
  const rawText = JSON.stringify(parsedData);
  const rawBytes = new Blob([rawText]).size;

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB'];
    let i = 0;
    n /= 1024;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(1)} ${units[i]}`;
  }

  const payloadSize = formatBytes(rawBytes);

  const RESPONSE = {
    status: 200,
    statusText: 'OK',
    headers: [
      ['cache-control', 'public, max-age=60'],
      ['content-length', String(rawBytes)],
      ['content-type', 'application/json; charset=utf-8'],
      ['date', new Date(now).toUTCString()],
      ['etag', 'W/"3a7-9b1c4b2da44e"'],
      ['strict-transport-security', 'max-age=31536000; includeSubDomains'],
      ['vary', 'Accept-Encoding'],
      ['x-request-id', '8f1447e8-477a-4b91-c4b2-da44e0969da1']
    ]
  };

  const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  // Icons from Lucide, ISC licence (search, check and moon derived from Feather, MIT); see lucide-LICENSE.txt
  const ICONS = {
    search: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    collapse: svg('<path d="m7 20 5-5 5 5"/><path d="m7 4 5 5 5-5"/>'),
    expand: svg('<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>'),
    copy: svg('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    sunMoon: svg('<path d="M12 2v2"/><path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"/><path d="M16 12a4 4 0 0 0-4-4"/><path d="m19 5-1.256 1.256"/><path d="M20 12h2"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
    moon: svg('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>')
  };

  function el(tag, props, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'className') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else node.setAttribute(k, v);
    }
    for (const child of children || []) node.append(child);
    return node;
  }

  function actionButton(id, label, icon) {
    return el('button', { type: 'button', id, className: 'jv-btn', title: label, 'aria-label': label }, [
      el('span', { className: 'jv-btn-icon', html: icon }),
      el('span', { className: 'jv-btn-label', text: label })
    ]);
  }

  // ---------- Layout ----------

  const TABS = ['json', 'raw', 'headers'];
  const TAB_LABELS = { json: 'JSON', raw: 'Raw', headers: 'Headers' };

  const tabButtons = {};
  const tabList = el('div', { className: 'jv-tabs', role: 'tablist', 'aria-label': 'JSON views' });
  for (const name of TABS) {
    const tab = el('button', {
      type: 'button',
      role: 'tab',
      id: `jv-tab-${name}`,
      'aria-selected': String(name === 'json'),
      'aria-controls': `jv-panel-${name}`,
      tabindex: name === 'json' ? '0' : '-1',
      className: 'jv-tab',
      text: TAB_LABELS[name]
    });
    tabButtons[name] = tab;
    tabList.append(tab);
  }

  const filterInput = el('input', {
    id: 'jv-filter',
    type: 'search',
    placeholder: 'Filter…',
    'aria-label': 'Filter',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false'
  });
  const filterWrap = el('div', { id: 'jv-filter-wrap' }, [
    el('span', { className: 'jv-filter-icon', html: ICONS.search }),
    filterInput,
    el('kbd', { className: 'jv-kbd', 'aria-hidden': 'true', text: '/' })
  ]);

  const mobileFilterBtn = el('button', {
    type: 'button',
    id: 'jv-mobile-filter-btn',
    className: 'jv-btn',
    title: 'Filter',
    'aria-label': 'Filter',
    html: `<span class="jv-btn-icon">${ICONS.search}</span>`
  });
  const collapseBtn = actionButton('jv-collapse-all', 'Collapse All', ICONS.collapse);
  const expandBtn = actionButton('jv-expand-all', 'Expand All', ICONS.expand);
  const copyBtn = actionButton('jv-copy', 'Copy', ICONS.copy);
  const themeBtn = el('button', { type: 'button', id: 'jv-theme', className: 'jv-btn' });

  const barMain = el('div', { id: 'jv-bar-main' }, [
    tabList,
    el('span', { id: 'jv-size', className: 'jv-meta', title: 'Payload size', text: payloadSize }),
    el('div', { id: 'jv-actions' }, [filterWrap, mobileFilterBtn, collapseBtn, expandBtn, copyBtn, themeBtn])
  ]);

  const mobileInput = el('input', {
    id: 'jv-mobile-filter-input',
    type: 'search',
    placeholder: 'Filter…',
    'aria-label': 'Filter',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search'
  });
  const mobileDone = el('button', { type: 'button', id: 'jv-mobile-filter-done', text: 'Done' });
  const barSearch = el('div', { id: 'jv-bar-search', hidden: '' }, [
    el('div', { className: 'jv-mobile-field' }, [el('span', { className: 'jv-filter-icon', html: ICONS.search }), mobileInput]),
    mobileDone
  ]);

  const bar = el('header', { id: 'jv-bar' }, [barMain, barSearch]);

  const treeContainer = el('div', { id: 'jv-tree' });
  const emptyFilter = el('p', { id: 'jv-empty-filter', className: 'jv-notice', hidden: '', text: 'No matching entries' });
  const rawContainer = el('pre', { id: 'jv-raw', text: rawText });

  const panels = {
    json: el('section', { id: 'jv-panel-json', role: 'tabpanel', 'aria-labelledby': 'jv-tab-json' }, [treeContainer, emptyFilter]),
    raw: el('section', { id: 'jv-panel-raw', role: 'tabpanel', 'aria-labelledby': 'jv-tab-raw', hidden: '' }, [rawContainer]),
    headers: el('section', { id: 'jv-panel-headers', role: 'tabpanel', 'aria-labelledby': 'jv-tab-headers', hidden: '' })
  };

  const container = el('div', { id: 'jv-container', 'data-tab': 'json' }, [
    bar,
    el('div', { id: 'jv-content' }, [panels.json, panels.raw, panels.headers])
  ]);

  // ---------- Theme ----------

  // The demo window switches on its own, independent of the page
  const THEME_LABELS = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  const THEME_ICONS = { auto: ICONS.sunMoon, light: ICONS.sun, dark: ICONS.moon };
  let currentTheme = 'auto';

  function applyTheme(theme) {
    currentTheme = THEME_LABELS[theme] ? theme : 'auto';
    if (currentTheme === 'auto') demo.removeAttribute('data-theme');
    else demo.dataset.theme = currentTheme;

    const label = `Theme: ${THEME_LABELS[currentTheme]}`;
    themeBtn.innerHTML = `<span class="jv-btn-icon">${THEME_ICONS[currentTheme]}</span>`;
    themeBtn.title = label;
    themeBtn.setAttribute('aria-label', label);
  }

  themeBtn.addEventListener('click', () => {
    const next = { auto: 'light', light: 'dark', dark: 'auto' }[currentTheme];
    // Swap colors in one frame instead of animating every element
    demo.classList.add('jv-no-transitions');
    applyTheme(next);
    void demo.offsetHeight;
    requestAnimationFrame(() => demo.classList.remove('jv-no-transitions'));
  });

  applyTheme(currentTheme);

  // ---------- Tree ----------

  function setNodeCollapsed(node, collapsed) {
    if (node.classList.contains('jv-collapsed') === collapsed) return;
    const children = node.querySelector(':scope > .jv-children');
    if (!children) return;
    node.classList.toggle('jv-collapsed', collapsed);
    node.querySelector(':scope > .jv-line > .jv-toggle').classList.toggle('collapsed', collapsed);
    if (collapsed) children.setAttribute('hidden', 'until-found');
    else children.removeAttribute('hidden');
  }

  // Browser find matched text inside a collapsed branch: open every collapsed ancestor
  function onBeforeMatch(e) {
    let node = e.currentTarget.parentElement;
    while (node) {
      if (node.classList.contains('jv-collapsed')) setNodeCollapsed(node, false);
      node = node.parentElement && node.parentElement.closest('.jv-node');
    }
  }

  function primitiveText(value) {
    return value === null ? 'null' : String(value);
  }

  const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  // JavaScript accessor path: user.name, items[0], headers["content-type"]
  function childPath(path, key) {
    if (typeof key === 'number') return `${path}[${key}]`;
    if (IDENTIFIER.test(key)) return path ? `${path}.${key}` : key;
    return `${path}[${JSON.stringify(key)}]`;
  }

  let flashedKey = null;
  let flashTimer = null;

  function flashCopied(keySpan) {
    clearTimeout(flashTimer);
    if (flashedKey) flashedKey.classList.remove('jv-copied');
    flashedKey = keySpan;
    keySpan.classList.add('jv-copied');
    flashTimer = setTimeout(() => keySpan.classList.remove('jv-copied'), 900);
  }

  const COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^(?:rgb|hsl|oklch)a?\([^)]+\)$/i;
  // Needs a time: a date-only string gains nothing from a tooltip, and parsing it as
  // midnight UTC would show the wrong local day west of Greenwich
  const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
  // Unix epochs between 2000-01-01 and 2100-01-01
  const EPOCH_MIN = 946684800;
  const EPOCH_MAX = 4102444800;

  function linkHref(value) {
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    // Root-relative paths like /v2/openapi.json; // and /\ would point at another host
    if (/^\/[^/\\\s]\S*$/.test(value)) return new URL(value, BASE_URL).href;
    return null;
  }

  function timestampDate(value) {
    let date = null;
    if (typeof value === 'number') {
      if (value >= EPOCH_MIN && value <= EPOCH_MAX) date = new Date(value * 1000);
      else if (Number.isInteger(value) && value >= EPOCH_MIN * 1000 && value <= EPOCH_MAX * 1000) date = new Date(value);
    } else if (typeof value === 'string' && ISO_DATETIME.test(value)) {
      date = new Date(value);
    }
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }

  const localDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' });
  const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const RELATIVE_UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

  function relativeTime(date) {
    const seconds = (date.getTime() - Date.now()) / 1000;
    for (const [unit, size] of RELATIVE_UNITS) {
      if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
    }
    return relativeFormat.format(Math.round(seconds), 'second');
  }

  function buildNode(key, value, isLast, isRoot = false, path = '') {
    const node = document.createElement('div');
    node.className = 'jv-node' + (isRoot ? ' jv-root' : '');
    node.dataset.path = path;

    const line = document.createElement('div');
    line.className = 'jv-line';

    const isArray = Array.isArray(value);
    const isObject = value !== null && typeof value === 'object' && !isArray;
    const isContainer = isObject || isArray;

    node.dataset.selfMatch = [
      key === null ? '' : key,
      isContainer ? '' : primitiveText(value)
    ].join('\n').toLowerCase();

    if (isContainer) {
      const toggle = document.createElement('span');
      toggle.className = 'jv-toggle';
      toggle.textContent = '▼';
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const collapsed = !node.classList.contains('jv-collapsed');
        setNodeCollapsed(node, collapsed);
        // Option-click folds or unfolds the whole branch, like Finder
        if (e.altKey) {
          for (const children of node.querySelectorAll('.jv-children')) setNodeCollapsed(children.parentElement, collapsed);
        }
      });
      line.appendChild(toggle);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'jv-toggle-placeholder';
      line.appendChild(placeholder);
    }

    if (key !== null) {
      const keySpan = document.createElement('span');
      keySpan.className = 'jv-key';
      keySpan.textContent = `"${key}"`;
      keySpan.title = `${path} (click to copy path, Option-click to copy value)`;
      keySpan.addEventListener('click', (e) => {
        // Leave the clipboard alone when the user is selecting text
        if (!window.getSelection().isCollapsed) return;
        copyText(e.altKey ? (typeof value === 'string' ? value : JSON.stringify(value, null, 2)) : path);
        flashCopied(keySpan);
      });
      line.appendChild(keySpan);

      const colon = document.createElement('span');
      colon.className = 'jv-colon';
      colon.textContent = ':';
      line.appendChild(colon);
    }

    if (isContainer) {
      const openBracket = document.createElement('span');
      openBracket.className = 'jv-bracket';
      openBracket.textContent = isArray ? '[' : '{';
      line.appendChild(openBracket);

      const entries = isArray ? value.map((item) => [null, item]) : Object.entries(value);

      const ellipsis = document.createElement('span');
      ellipsis.className = 'jv-ellipsis';
      const count = entries.length;
      const noun = isArray ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'key' : 'keys');
      ellipsis.textContent = `${count} ${noun}`;
      ellipsis.addEventListener('click', (e) => {
        e.stopPropagation();
        setNodeCollapsed(node, false);
      });
      line.appendChild(ellipsis);

      const closeChar = isArray ? ']' : '}';
      const hasComma = !isLast && !isRoot;

      // While folded, the bracket and comma close the opening line: { 4 keys },
      const foldClose = el('span', { className: 'jv-fold-close' }, [el('span', { className: 'jv-bracket', text: closeChar })]);
      if (hasComma) foldClose.append(el('span', { className: 'jv-comma', text: ',' }));
      line.appendChild(foldClose);

      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'jv-children';
      childrenContainer.addEventListener('beforematch', onBeforeMatch);
      entries.forEach(([k, v], idx) => {
        childrenContainer.appendChild(buildNode(k, v, idx === count - 1, false, childPath(path, isArray ? idx : k)));
      });

      node.appendChild(line);
      node.appendChild(childrenContainer);

      const closeLine = document.createElement('div');
      closeLine.className = 'jv-line jv-close-line';
      const closePlaceholder = document.createElement('span');
      closePlaceholder.className = 'jv-toggle-placeholder';
      closeLine.appendChild(closePlaceholder);

      const closeBracket = document.createElement('span');
      closeBracket.className = 'jv-bracket';
      closeBracket.textContent = closeChar;
      closeLine.appendChild(closeBracket);

      if (hasComma) {
        const comma = document.createElement('span');
        comma.className = 'jv-comma';
        comma.textContent = ',';
        closeLine.appendChild(comma);
      }
      node.appendChild(closeLine);
    } else {
      const valSpan = document.createElement('span');
      if (typeof value === 'string') {
        valSpan.className = 'jv-string';
        const href = linkHref(value);
        if (href) {
          const a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = value;
          valSpan.append('"', a, '"');
        } else {
          if (COLOR.test(value) && CSS.supports('color', value)) {
            const swatch = document.createElement('span');
            swatch.className = 'jv-swatch';
            swatch.style.backgroundColor = value;
            valSpan.append(swatch);
          }
          valSpan.append(`"${value}"`);
        }
      } else if (typeof value === 'number') {
        valSpan.className = 'jv-number';
        valSpan.textContent = String(value);
      } else if (typeof value === 'boolean') {
        valSpan.className = 'jv-boolean';
        valSpan.textContent = String(value);
      } else if (value === null) {
        valSpan.className = 'jv-null';
        valSpan.textContent = 'null';
      }

      const date = timestampDate(value);
      if (date) {
        valSpan.classList.add('jv-timestamp');
        valSpan.dataset.tooltip = `${date.toISOString()}\nLocal: ${localDateFormat.format(date)} (${relativeTime(date)})`;
      }

      line.appendChild(valSpan);

      if (!isLast && !isRoot) {
        const comma = document.createElement('span');
        comma.className = 'jv-comma';
        comma.textContent = ',';
        line.appendChild(comma);
      }
      node.appendChild(line);
    }

    return node;
  }

  const rootNode = buildNode(null, parsedData, true, true);
  treeContainer.appendChild(rootNode);

  const containers = [...treeContainer.querySelectorAll('.jv-children')].map((children) => children.parentElement);

  function childNodesOf(node) {
    const children = node.querySelector(':scope > .jv-children');
    return children ? children.children : [];
  }

  collapseBtn.addEventListener('click', () => {
    // Keep the root open so the top-level shape stays readable
    for (const node of containers) setNodeCollapsed(node, node !== rootNode);
  });

  expandBtn.addEventListener('click', () => {
    for (const node of containers) setNodeCollapsed(node, false);
  });

  // ---------- Filter ----------

  let filterQuery = '';
  let collapsedBeforeFilter = null;

  // Returns true when the node or a descendant matches. keepAll shows a matched container's subtree.
  function filterNode(node, q, keepAll) {
    const selfHit = node.dataset.selfMatch.includes(q);
    let descendantHit = false;
    let lastVisible = null;
    const children = childNodesOf(node);
    for (const child of children) {
      if (filterNode(child, q, keepAll || selfHit)) descendantHit = true;
      if (!child.hidden) lastVisible = child;
    }
    for (const child of children) child.classList.toggle('jv-tail', child === lastVisible);
    if (descendantHit) setNodeCollapsed(node, false);
    const hit = selfHit || descendantHit;
    const hide = !(hit || keepAll);
    if (node.hidden !== hide) node.hidden = hide;
    return hit;
  }

  function filterTree(q) {
    if (q && !collapsedBeforeFilter) {
      collapsedBeforeFilter = new Set(treeContainer.querySelectorAll('.jv-node.jv-collapsed'));
    }
    if (collapsedBeforeFilter) {
      for (const node of containers) setNodeCollapsed(node, collapsedBeforeFilter.has(node));
    }

    if (q) {
      emptyFilter.hidden = filterNode(rootNode, q, false);
      return;
    }

    for (const node of treeContainer.querySelectorAll('.jv-node[hidden]')) node.hidden = false;
    for (const node of treeContainer.querySelectorAll('.jv-tail')) node.classList.remove('jv-tail');
    collapsedBeforeFilter = null;
    emptyFilter.hidden = true;
  }

  function filterHeaders(q) {
    const rows = panels.headers.querySelectorAll('.jv-header-row');
    const empty = panels.headers.querySelector('.jv-headers-empty');
    if (!rows.length || !empty) return;
    let shown = 0;
    for (const row of rows) {
      row.hidden = !row.dataset.matchText.includes(q);
      if (!row.hidden) shown++;
    }
    empty.hidden = shown > 0;
  }

  function applyFilter(query) {
    filterQuery = query;
    const q = query.trim().toLowerCase();
    if (filterInput.value !== query) filterInput.value = query;
    if (mobileInput.value !== query) mobileInput.value = query;
    filterTree(q);
    filterHeaders(q);
  }

  for (const input of [filterInput, mobileInput]) {
    input.addEventListener('input', () => applyFilter(input.value));
  }

  // The bar's breakpoint follows the demo window, as in demo.css
  const isNarrow = () => demo.clientWidth <= 639;

  function openMobileSearch() {
    barMain.hidden = true;
    barSearch.hidden = false;
    mobileInput.value = filterQuery;
    mobileInput.focus();
  }

  function closeMobileSearch() {
    barSearch.hidden = true;
    barMain.hidden = false;
  }

  function clearFilter() {
    applyFilter('');
    closeMobileSearch();
    if (document.activeElement === filterInput || document.activeElement === mobileInput) {
      document.activeElement.blur();
    }
  }

  mobileFilterBtn.addEventListener('click', openMobileSearch);
  mobileDone.addEventListener('click', clearFilter);

  // Widening past the breakpoint returns to the desktop bar, keeping the query
  window.addEventListener('resize', () => {
    if (!isNarrow() && !barSearch.hidden) closeMobileSearch();
  });

  function isEditable(target) {
    return target instanceof Element &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditable(e.target)) {
      if (activeTab === 'raw') return;
      e.preventDefault();
      if (isNarrow()) {
        openMobileSearch();
      } else {
        filterInput.focus();
        filterInput.select();
      }
    } else if (e.key === 'Escape') {
      const inFilter = e.target === filterInput || e.target === mobileInput;
      if (inFilter || filterQuery || !barSearch.hidden) {
        e.preventDefault();
        clearFilter();
      }
    }
  });

  // ---------- Headers ----------

  // The extension asks the server with a HEAD request; the demo has a sample response
  let headersLoaded = false;
  let headersText = '';

  function renderHeaders(res) {
    const status = `HTTP ${res.status} ${res.statusText}`.trim();
    const pairs = res.headers;
    headersText = [status, ...pairs.map(([name, value]) => `${name}: ${value}`)].join('\n');

    const pill = el('div', { className: 'jv-status jv-status-2xx' }, [
      el('span', { className: 'jv-status-dot', 'aria-hidden': 'true' }),
      `${status} · ${payloadSize}`
    ]);

    const rows = pairs.map(([name, value]) => el('tr', {
      className: 'jv-header-row',
      'data-match-text': `${name}: ${value}`.toLowerCase()
    }, [
      el('th', { scope: 'row', text: name }),
      el('td', { text: value })
    ]));
    const table = el('table', { className: 'jv-headers-table' }, [el('tbody', {}, rows)]);
    const empty = el('p', { className: 'jv-notice jv-headers-empty', hidden: '', text: 'No matching headers' });

    panels.headers.replaceChildren(pill, table, empty);
    filterHeaders(filterQuery.trim().toLowerCase());
  }

  function loadHeadersOnce() {
    if (headersLoaded) return;
    headersLoaded = true;
    renderHeaders(RESPONSE);
  }

  // ---------- Tabs ----------

  let activeTab = 'json';

  function activateTab(name, focus) {
    activeTab = name;
    container.dataset.tab = name;
    for (const tabName of TABS) {
      const selected = tabName === name;
      tabButtons[tabName].setAttribute('aria-selected', String(selected));
      tabButtons[tabName].tabIndex = selected ? 0 : -1;
      panels[tabName].hidden = !selected;
    }
    if (focus) tabButtons[name].focus();
    if (name === 'headers') loadHeadersOnce();
    setCopyLabel(false);
  }

  for (const name of TABS) {
    tabButtons[name].addEventListener('click', () => activateTab(name, false));
  }

  tabList.addEventListener('keydown', (e) => {
    const index = TABS.indexOf(activeTab);
    const next = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    activateTab(TABS[next], true);
  });

  // ---------- Copy ----------

  const COPY_TITLES = { json: 'Copy JSON', raw: 'Copy raw text', headers: 'Copy headers' };
  let copyTimer = null;

  function setCopyLabel(copied) {
    clearTimeout(copyTimer);
    const label = copied ? 'Copied' : 'Copy';
    const title = copied ? 'Copied' : COPY_TITLES[activeTab];
    copyBtn.querySelector('.jv-btn-icon').innerHTML = copied ? ICONS.check : ICONS.copy;
    copyBtn.querySelector('.jv-btn-label').textContent = label;
    copyBtn.title = title;
    copyBtn.setAttribute('aria-label', title);
    copyBtn.classList.toggle('copied', copied);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  copyBtn.addEventListener('click', async () => {
    let text;
    if (activeTab === 'raw') {
      text = rawText;
    } else if (activeTab === 'headers') {
      loadHeadersOnce();
      text = headersText;
    } else {
      text = JSON.stringify(parsedData, null, 2);
    }
    await copyText(text);
    setCopyLabel(true);
    copyTimer = setTimeout(() => setCopyLabel(false), 1500);
  });

  setCopyLabel(false);

  demo.append(container);
})();
