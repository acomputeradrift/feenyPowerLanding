/*
 * Private homeowner-pages analytics dashboard. Charts are hand-rolled SVG so
 * nothing loads from a CDN. All text goes in through textContent.
 */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var COLORS = {
        green: '#39b54a',
        orange: '#fcb040',
        orangeDark: '#FF8C00',
        darkGrey: '#575759',
        lightGrey: '#a7a9ac',
        dark: '#222',
        band: '#f4f4f5',
        line: '#e4e4e7'
    };
    var CHANNEL_COLORS = {
        'Direct': COLORS.darkGrey,
        'Organic Search': COLORS.green,
        'Social': COLORS.orange,
        'Paid': COLORS.dark,
        'Email': COLORS.lightGrey,
        'Referral': COLORS.orangeDark,
        'Not tracked': COLORS.line
    };
    var DEVICE_COLORS = { mobile: COLORS.green, tablet: COLORS.orange, desktop: COLORS.darkGrey, unknown: COLORS.lightGrey };
    var BRAND_LABELS = { lutron: 'Lutron', vantage: 'Vantage', rti: 'RTI', 'clipsal-c-bus': 'Clipsal C-Bus' };

    var KPI_CARDS = [
        { key: 'visitors', label: 'Visitors' },
        { key: 'leads', label: 'Leads', lead: true },
        { key: 'conversionRate', label: 'Conversion rate' },
        { key: 'engagementRate', label: 'Engagement rate' },
        { key: 'avgEngagedSec', label: 'Avg engaged time' },
        { key: 'ctaRate', label: 'CTA click-through' },
        { key: 'formStartRate', label: 'Form start rate' },
        { key: 'formCompletionRate', label: 'Form completion' }
    ];
    var MINI_CARDS = [
        { key: 'sessions', label: 'Sessions' },
        { key: 'pageviews', label: 'Pageviews' },
        { key: 'bounceRate', label: 'Bounce rate', invert: true },
        { key: 'scroll75Rate', label: 'Scrolled 75%+' }
    ];

    var params = new URLSearchParams(window.location.search);
    var state = {
        range: ['7', '28', '90'].indexOf(params.get('range')) >= 0 ? Number(params.get('range')) : 28,
        location: params.get('location') || '',
        brand: params.get('brand') || '',
        sortKey: 'leads',
        sortDir: 'desc'
    };
    var data = null;
    var requestId = 0;

    // ---------- helpers ----------
    function $(id) { return document.getElementById(id); }

    var NO_DATA = 'No data yet for this range.';

    function noData(root) {
        root.appendChild(h('p', { className: 'an-empty', text: NO_DATA }));
    }

    function scopeHasData() {
        return (data.kpis.sessions.value || 0) > 0 || (data.kpis.leads.value || 0) > 0;
    }

    function pagesHaveData() {
        return data.pages.some(function (p) { return p.sessions > 0 || p.leads > 0; });
    }

    function h(tag, attrs, children) {
        var el = document.createElement(tag);
        applyAttrs(el, attrs);
        appendChildren(el, children);
        return el;
    }

    function s(tag, attrs, children) {
        var el = document.createElementNS(SVG_NS, tag);
        applyAttrs(el, attrs);
        appendChildren(el, children);
        return el;
    }

    function applyAttrs(el, attrs) {
        if (!attrs) return;
        Object.keys(attrs).forEach(function (key) {
            var v = attrs[key];
            if (v == null || v === false) return;
            if (key === 'text') el.textContent = v;
            else if (key === 'style') Object.keys(v).forEach(function (p) { el.style[p] = v[p]; });
            else if (key === 'className') el.setAttribute('class', v);
            else if (key.indexOf('on') === 0) el.addEventListener(key.slice(2), v);
            else el.setAttribute(key, v === true ? '' : String(v));
        });
    }

    function appendChildren(el, children) {
        if (children == null) return;
        (Array.isArray(children) ? children : [children]).forEach(function (c) {
            if (c == null || c === false) return;
            el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
        });
    }

    function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

    function fmtInt(v) { return v == null ? '—' : Number(v).toLocaleString('en-CA'); }
    function fmtPct(v, digits) {
        if (v == null) return '—';
        return (v * 100).toFixed(digits == null ? 1 : digits) + '%';
    }
    function fmtSecs(v) {
        if (v == null) return '—';
        var sec = Math.round(v);
        return sec >= 60 ? Math.floor(sec / 60) + 'm ' + String(sec % 60).padStart(2, '0') + 's' : sec + 's';
    }
    function fmtKpi(kpi) {
        if (!kpi) return '—';
        if (kpi.kind === 'rate') return fmtPct(kpi.value);
        if (kpi.kind === 'seconds') return fmtSecs(kpi.value);
        return fmtInt(kpi.value);
    }
    function fmtDay(key, withYear) {
        var parts = key.split('-').map(Number);
        var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
        return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: withYear ? 'numeric' : undefined, timeZone: 'UTC' });
    }

    function deltaInfo(kpi, invert) {
        if (!kpi || kpi.change == null) {
            if (kpi && kpi.previous === 0 && kpi.value > 0) return { text: 'new', cls: 'is-good' };
            return { text: '—', cls: '' };
        }
        if (Math.abs(kpi.change) < 1e-9) return { text: '→ 0%', cls: '' };
        var up = kpi.change > 0;
        var good = invert ? !up : up;
        var text = kpi.changeType === 'points'
            ? (up ? '+' : '') + (kpi.change * 100).toFixed(1) + ' pts'
            : (up ? '+' : '') + Math.round(kpi.change * 100) + '%';
        return { text: (up ? '▲ ' : '▼ ') + text, cls: good ? 'is-good' : 'is-bad' };
    }

    // ---------- tooltip ----------
    var tooltip = $('an-tooltip');

    function showTip(content, x, y) {
        clear(tooltip);
        appendChildren(tooltip, content);
        tooltip.hidden = false;
        var rect = tooltip.getBoundingClientRect();
        var left = Math.min(window.innerWidth - rect.width - 8, Math.max(8, x + 12));
        var top = y - rect.height - 12;
        if (top < 8) top = y + 16;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    function hideTip() { tooltip.hidden = true; }

    function defTip(defKey) {
        var tip = h('span', { className: 'an-tip', tabindex: '0', role: 'button', 'aria-label': 'What does this mean?', 'data-def': defKey, text: 'i' });
        return tip;
    }

    function bindDefTips(root) {
        root.querySelectorAll('.an-tip').forEach(function (tip) {
            if (tip.dataset.bound) return;
            tip.dataset.bound = '1';
            var show = function () {
                var def = data && data.definitions && data.definitions[tip.dataset.def];
                if (!def) return;
                var r = tip.getBoundingClientRect();
                showTip(def, r.left, r.top);
            };
            tip.addEventListener('mouseenter', show);
            tip.addEventListener('focus', show);
            tip.addEventListener('mouseleave', hideTip);
            tip.addEventListener('blur', hideTip);
        });
    }

    // ---------- sparkline ----------
    function sparkline(values, color) {
        var w = 160;
        var ht = 34;
        var svg = s('svg', { className: 'an-spark', viewBox: '0 0 ' + w + ' ' + ht, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
        var nums = values.filter(function (v) { return v != null; });
        if (values.length < 2 || !nums.length) {
            svg.appendChild(s('line', { x1: 0, x2: w, y1: ht - 2, y2: ht - 2, stroke: COLORS.line, 'stroke-width': 2 }));
            return svg;
        }
        var max = Math.max.apply(null, nums);
        var min = Math.min(0, Math.min.apply(null, nums));
        var span = max - min || 1;
        var step = w / (values.length - 1);
        var pts = [];
        values.forEach(function (v, i) {
            if (v == null) return;
            pts.push([i * step, ht - 3 - ((v - min) / span) * (ht - 6)]);
        });
        var line = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
        var area = 'M' + pts[0][0].toFixed(1) + ',' + ht + ' L' + line.split(' ').join(' L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + ht + ' Z';
        svg.appendChild(s('path', { d: area, fill: color, 'fill-opacity': 0.12 }));
        svg.appendChild(s('polyline', { points: line, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }));
        return svg;
    }

    // ---------- KPI cards ----------
    function renderKpis() {
        var root = clear($('an-kpis'));
        var label = 'vs prior ' + data.range + ' days';
        KPI_CARDS.forEach(function (card) {
            var kpi = data.kpis[card.key];
            var d = deltaInfo(kpi, card.invert);
            var series = data.series.map(function (row) { return row[card.key]; });
            root.appendChild(h('article', { className: 'an-kpi' + (card.lead ? ' is-lead' : '') }, [
                h('div', { className: 'an-kpi-label' }, [card.label, defTip(card.key)]),
                h('div', { className: 'an-kpi-value', text: fmtKpi(kpi) }),
                h('div', { className: 'an-delta ' + d.cls }, [d.text + ' ', h('small', { text: label })]),
                sparkline(series, card.lead ? COLORS.orange : COLORS.green)
            ]));
        });
        var minis = clear($('an-minis'));
        MINI_CARDS.forEach(function (card) {
            var kpi = data.kpis[card.key];
            var d = deltaInfo(kpi, card.invert);
            minis.appendChild(h('div', { className: 'an-mini' }, [
                h('div', { className: 'an-kpi-label' }, [card.label, defTip(card.key)]),
                h('div', null, [
                    h('span', { className: 'an-mini-value', text: fmtKpi(kpi) }),
                    ' ',
                    h('span', { className: 'an-delta ' + d.cls, text: d.text })
                ])
            ]));
        });
    }

    // ---------- trend chart ----------
    function niceMax(v) {
        if (v <= 4) return 4;
        var pow = Math.pow(10, Math.floor(Math.log10(v)));
        var n = v / pow;
        var nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
        return nice * pow;
    }

    function renderTrend() {
        var root = clear($('an-trend'));
        var series = data.series;
        var hasSeries = series.some(function (r) { return r.sessions > 0 || r.leads > 0; });
        $('an-trend-legend').hidden = !hasSeries;
        if (!hasSeries) { noData(root); return; }
        var W = 1000;
        var H = 280;
        var m = { l: 40, r: 36, t: 12, b: 28 };
        var iw = W - m.l - m.r;
        var ih = H - m.t - m.b;
        var maxV = niceMax(Math.max.apply(null, series.map(function (r) { return r.visitors; }).concat([1])));
        var maxL = Math.max(2, Math.ceil(Math.max.apply(null, series.map(function (r) { return r.leads; }).concat([1]))));
        var n = series.length;
        var step = n > 1 ? iw / (n - 1) : iw;
        var band = iw / n;
        var x = function (i) { return m.l + (n > 1 ? i * step : iw / 2); };
        var yV = function (v) { return m.t + ih - (v / maxV) * ih; };
        var yL = function (v) { return m.t + ih - (v / maxL) * ih; };

        var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Daily visitors and leads for the last ' + n + ' days' });
        var axis = s('g', { className: 'an-axis' });
        for (var t = 0; t <= 4; t++) {
            var val = (maxV / 4) * t;
            var yy = yV(val);
            svg.appendChild(s('line', { className: 'an-grid-line', x1: m.l, x2: W - m.r, y1: yy, y2: yy }));
            axis.appendChild(s('text', { x: m.l - 8, y: yy + 4, 'text-anchor': 'end', text: Math.round(val) }));
        }
        for (var lt = 0; lt <= maxL; lt += Math.max(1, Math.ceil(maxL / 4))) {
            axis.appendChild(s('text', { x: W - m.r + 8, y: yL(lt) + 4, 'text-anchor': 'start', fill: COLORS.orange, text: lt }));
        }
        var every = Math.max(1, Math.ceil(n / 7));
        series.forEach(function (row, i) {
            if (i % every !== 0 && i !== n - 1) return;
            if (i !== n - 1 && n - 1 - i < every / 2) return;
            axis.appendChild(s('text', { x: x(i), y: H - 6, 'text-anchor': 'middle', text: fmtDay(row.day) }));
        });

        var barW = Math.max(3, Math.min(18, band * 0.5));
        series.forEach(function (row, i) {
            if (!row.leads) return;
            svg.appendChild(s('rect', {
                x: x(i) - barW / 2, y: yL(row.leads), width: barW, height: m.t + ih - yL(row.leads),
                rx: 2, fill: COLORS.orange
            }));
        });

        var pts = series.map(function (row, i) { return [x(i), yV(row.visitors)]; });
        var line = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
        if (pts.length) {
            var area = 'M' + pts[0][0] + ',' + (m.t + ih) + ' L' + line.split(' ').join(' L') + ' L' + pts[pts.length - 1][0] + ',' + (m.t + ih) + ' Z';
            svg.appendChild(s('path', { d: area, fill: COLORS.darkGrey, 'fill-opacity': 0.07 }));
            svg.appendChild(s('polyline', { points: line, fill: 'none', stroke: COLORS.darkGrey, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
            if (n <= 31) {
                pts.forEach(function (p) {
                    svg.appendChild(s('circle', { cx: p[0], cy: p[1], r: 3, fill: '#fff', stroke: COLORS.darkGrey, 'stroke-width': 2 }));
                });
            }
        }
        svg.appendChild(axis);

        var hover = s('line', { className: 'an-hover-line', x1: 0, x2: 0, y1: m.t, y2: m.t + ih, visibility: 'hidden' });
        svg.appendChild(hover);
        series.forEach(function (row, i) {
            svg.appendChild(s('rect', {
                x: x(i) - band / 2, y: m.t, width: band, height: ih, fill: 'transparent',
                onmousemove: function (ev) {
                    hover.setAttribute('x1', x(i));
                    hover.setAttribute('x2', x(i));
                    hover.setAttribute('visibility', 'visible');
                    showTip([
                        h('strong', { text: fmtDay(row.day, true) }), h('br'),
                        'Visitors: ' + fmtInt(row.visitors), h('br'),
                        'Sessions: ' + fmtInt(row.sessions), h('br'),
                        'Leads: ' + fmtInt(row.leads), h('br'),
                        'Engaged: ' + fmtPct(row.engagementRate, 0)
                    ], ev.clientX, ev.clientY);
                },
                onmouseleave: function () { hover.setAttribute('visibility', 'hidden'); hideTip(); }
            }));
        });
        root.appendChild(svg);
    }

    // ---------- funnel ----------
    function renderFunnel() {
        var root = clear($('an-funnel'));
        if (!scopeHasData()) { noData(root); return; }
        var top = data.funnel[0].value || 0;
        data.funnel.forEach(function (stage, i) {
            var prev = i > 0 ? data.funnel[i - 1].value : null;
            var pct = top > 0 ? Math.min(100, (stage.value / top) * 100) : 0;
            var stepRate = prev ? fmtPct(stage.value / prev, 0) + ' of prev.' : i === 0 ? 'unique' : '—';
            root.appendChild(h('div', { className: 'an-funnel-row' + (stage.key === 'lead' ? ' is-lead' : '') }, [
                h('span', { className: 'an-funnel-label', text: stage.label }),
                h('div', { className: 'an-funnel-track' }, h('div', { className: 'an-funnel-bar', style: { width: pct + '%' } })),
                h('span', { className: 'an-funnel-num' }, [fmtInt(stage.value), h('small', { text: stepRate })])
            ]));
        });
    }

    // ---------- donut ----------
    function renderChannels() {
        var root = clear($('an-channels'));
        if (!data.channels.length) { noData(root); return; }
        var rows = data.channels.filter(function (c) { return c.sessions > 0; });
        var total = rows.reduce(function (sum, c) { return sum + c.sessions; }, 0);
        var R = 60;
        var C = 2 * Math.PI * R;
        var svg = s('svg', { className: 'an-donut', viewBox: '0 0 170 170', role: 'img', 'aria-label': 'Sessions by channel' });
        svg.appendChild(s('circle', { cx: 85, cy: 85, r: R, fill: 'none', stroke: COLORS.band, 'stroke-width': 22 }));
        var offset = 0;
        rows.forEach(function (c) {
            var len = (c.sessions / total) * C;
            svg.appendChild(s('circle', {
                cx: 85, cy: 85, r: R, fill: 'none', stroke: CHANNEL_COLORS[c.channel] || COLORS.lightGrey,
                'stroke-width': 22, 'stroke-dasharray': Math.max(0, len - 1.5) + ' ' + (C - Math.max(0, len - 1.5)),
                'stroke-dashoffset': -offset, transform: 'rotate(-90 85 85)',
                onmousemove: function (ev) {
                    showTip([h('strong', { text: c.channel }), h('br'), fmtInt(c.sessions) + ' sessions (' + fmtPct(c.sessions / total, 0) + ')', h('br'), fmtInt(c.leads) + ' leads'], ev.clientX, ev.clientY);
                },
                onmouseleave: hideTip
            }));
            offset += len;
        });
        svg.appendChild(s('text', { x: 85, y: 85, 'text-anchor': 'middle', className: 'an-donut-total', text: fmtInt(total) }));
        svg.appendChild(s('text', { x: 85, y: 103, 'text-anchor': 'middle', className: 'an-donut-caption', text: 'sessions' }));
        root.appendChild(svg);

        var list = h('ul', { className: 'an-donut-legend' });
        data.channels.forEach(function (c) {
            list.appendChild(h('li', null, [
                h('span', { className: 'an-swatch', style: { background: CHANNEL_COLORS[c.channel] || COLORS.lightGrey } }),
                h('span', { text: c.channel }),
                h('span', { className: 'an-count', text: fmtInt(c.sessions) + ' sess · ' + fmtInt(c.leads) + ' lead' + (c.leads === 1 ? '' : 's') })
            ]));
        });
        root.appendChild(list);
    }

    // ---------- page table ----------
    function isActivePage(row) {
        return state.location === row.location && state.brand === row.brand;
    }

    function drill(location, brand) {
        if (state.location === location && state.brand === brand) {
            state.location = '';
            state.brand = '';
        } else {
            state.location = location;
            state.brand = brand;
        }
        load();
    }

    function renderPages() {
        var table = $('an-pages');
        var tbody = clear(table.querySelector('tbody'));
        var any = pagesHaveData();
        $('an-pages-wrap').hidden = !any;
        $('an-pages-note').hidden = !any;
        $('an-pages-empty').hidden = any;
        if (!any) return;
        var rows = data.pages.slice();
        var key = state.sortKey;
        var dir = state.sortDir === 'asc' ? 1 : -1;
        rows.sort(function (a, b) {
            var av = a[key];
            var bv = b[key];
            if (typeof av === 'string') return av.localeCompare(bv) * dir;
            if (av == null) return 1;
            if (bv == null) return -1;
            return (av - bv) * dir || b.visitors - a.visitors;
        });
        var maxLeads = Math.max.apply(null, rows.map(function (r) { return r.leads; }).concat([1]));
        rows.forEach(function (row) {
            var leadDelta = row.leads - row.prevLeads;
            tbody.appendChild(h('tr', {
                'data-page': row.path,
                className: isActivePage(row) ? 'is-active' : '',
                tabindex: '0',
                'aria-label': 'Filter to ' + row.label,
                onclick: function () { drill(row.location, row.brand); },
                onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); drill(row.location, row.brand); } }
            }, [
                h('td', { text: row.label }),
                h('td', { className: 'num', text: fmtInt(row.visitors) }),
                h('td', { className: 'num', text: fmtInt(row.sessions) }),
                h('td', { className: 'num' }, h('div', { className: 'an-leads-cell' }, [
                    h('span', { className: 'an-inline-bar', style: { width: Math.round((row.leads / maxLeads) * 48) + 'px' } }),
                    h('span', { text: fmtInt(row.leads), title: (leadDelta >= 0 ? '+' : '') + leadDelta + ' vs prior period' })
                ])),
                h('td', { className: 'num', text: fmtPct(row.conversionRate) }),
                h('td', { className: 'num', text: fmtPct(row.engagementRate, 0) }),
                h('td', { className: 'num', text: fmtPct(row.ctaRate, 0) }),
                h('td', { className: 'num', text: fmtSecs(row.avgEngagedSec) })
            ]));
        });
        table.querySelectorAll('th[data-sort]').forEach(function (th) {
            if (th.dataset.sort === state.sortKey) th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
            else th.removeAttribute('aria-sort');
        });
    }

    // ---------- heatmap ----------
    function renderHeatmap() {
        var root = clear($('an-heatmap'));
        if (!pagesHaveData()) { noData(root); return; }
        var maxRate = Math.max.apply(null, data.pages.map(function (p) { return p.conversionRate || 0; }).concat([0]));
        var table = h('table', { className: 'an-heat' });
        var head = h('tr', null, [h('th', { scope: 'col' }, h('span', { className: 'an-sr', text: '' }))]);
        data.brands.forEach(function (b) { head.appendChild(h('th', { scope: 'col', text: BRAND_LABELS[b.slug] || b.short || b.label })); });
        table.appendChild(h('thead', null, head));
        var body = h('tbody');
        data.locations.forEach(function (loc) {
            var tr = h('tr', null, h('th', { scope: 'row', text: loc.short || loc.label }));
            data.brands.forEach(function (b) {
                var row = data.pages.filter(function (p) { return p.location === loc.slug && p.brand === b.slug; })[0];
                if (!row) {
                    tr.appendChild(h('td', { className: 'is-na', title: 'No page for this combination', text: 'n/a' }));
                    return;
                }
                var rate = row.conversionRate || 0;
                var alpha = maxRate > 0 ? 0.12 + 0.78 * (rate / maxRate) : 0;
                tr.appendChild(h('td', {
                    className: isActivePage(row) ? 'is-active' : '',
                    style: { background: row.visitors ? 'rgba(57, 181, 74, ' + alpha.toFixed(2) + ')' : COLORS.band },
                    tabindex: '0',
                    'aria-label': row.label + ': ' + fmtPct(row.conversionRate) + ' conversion, ' + row.leads + ' leads, ' + row.visitors + ' visitors',
                    onclick: function () { drill(row.location, row.brand); },
                    onkeydown: function (ev) { if (ev.key === 'Enter') drill(row.location, row.brand); }
                }, [fmtPct(row.conversionRate), h('small', { text: row.leads + ' / ' + row.visitors })]));
            });
            body.appendChild(tr);
        });
        table.appendChild(body);
        root.appendChild(table);
        root.appendChild(h('p', { className: 'an-note', text: 'Cell = conversion rate; small text = leads / visitors. Darker green = better. Click a cell to drill in.' }));
    }

    // ---------- bars ----------
    function hbar(label, value, max, numText, cls) {
        return h('div', { className: 'an-hbar' }, [
            h('span', { className: 'an-hbar-label', text: label, title: label }),
            h('div', { className: 'an-hbar-track' }, h('div', { className: 'an-hbar-fill ' + (cls || ''), style: { width: (max > 0 ? (value / max) * 100 : 0) + '%' } })),
            h('span', { className: 'an-hbar-num', text: numText })
        ]);
    }

    function renderDevices() {
        var root = clear($('an-devices'));
        var total = data.devices.reduce(function (sum, d) { return sum + d.sessions; }, 0);
        $('an-referrers-title').hidden = !total;
        if (!total) {
            clear($('an-referrers'));
            noData(root);
            return;
        }
        var split = h('div', { className: 'an-split', role: 'img', 'aria-label': 'Sessions by device' });
        var legend = h('div', { className: 'an-split-legend' });
        data.devices.forEach(function (d) {
            var pct = total ? d.sessions / total : 0;
            if (pct > 0) split.appendChild(h('span', { title: d.device + ': ' + fmtPct(pct, 0), style: { width: pct * 100 + '%', background: DEVICE_COLORS[d.device] } }));
            legend.appendChild(h('span', null, [
                h('span', { className: 'an-swatch', style: { display: 'inline-block', background: DEVICE_COLORS[d.device], marginRight: '6px', verticalAlign: '-1px' } }),
                d.device.charAt(0).toUpperCase() + d.device.slice(1) + ' ',
                h('b', { text: fmtPct(total ? pct : null, 0) })
            ]));
        });
        root.appendChild(split);
        root.appendChild(legend);

        var refs = clear($('an-referrers'));
        if (!data.referrers.length) {
            refs.appendChild(h('p', { className: 'an-empty', text: 'No external referrers yet.' }));
        } else {
            var maxR = data.referrers[0].sessions;
            data.referrers.forEach(function (r) { refs.appendChild(hbar(r.host, r.sessions, maxR, fmtInt(r.sessions))); });
        }
    }

    function renderCampaigns() {
        var root = clear($('an-campaigns'));
        if (!scopeHasData()) { noData(root); return; }
        if (!data.campaigns.length) {
            root.appendChild(h('p', { className: 'an-empty', text: 'No UTM-tagged visits yet. Tag ad and email links with utm_source, utm_medium and utm_campaign.' }));
            return;
        }
        var tbody = h('tbody');
        data.campaigns.forEach(function (c) {
            tbody.appendChild(h('tr', null, [
                h('td', { text: c.campaign }),
                h('td', { text: [c.source, c.medium].filter(Boolean).join(' / ') || '—' }),
                h('td', { className: 'num', text: fmtInt(c.sessions) }),
                h('td', { className: 'num', text: fmtInt(c.leads) })
            ]));
        });
        root.appendChild(h('div', { className: 'an-table-scroll' }, h('table', { className: 'an-table' }, [
            h('thead', null, h('tr', null, [
                h('th', { scope: 'col', text: 'Campaign' }),
                h('th', { scope: 'col', text: 'Source / medium' }),
                h('th', { scope: 'col', className: 'num', text: 'Sessions' }),
                h('th', { scope: 'col', className: 'num', text: 'Leads' })
            ])),
            tbody
        ])));
    }

    function renderQuality() {
        var root = clear($('an-quality'));
        var q = data.leadQuality;
        var leads = data.kpis.leads.value || 0;
        if (!leads) { noData(root); return; }
        root.appendChild(h('div', { className: 'an-stat-row' }, [
            h('div', null, [h('b', { text: fmtInt(leads) }), 'leads in range']),
            h('div', null, [h('b', { text: fmtPct(q.hasFileShare, 0) }), 'have (or can get) the project file']),
            h('div', null, [h('b', { text: fmtInt(q.hasFileYes) + ' / ' + fmtInt(q.hasFileNo) }), 'file yes / no'])
        ]));
        root.appendChild(h('h3', { className: 'an-sub', text: 'Brands selected on the form' }));
        var max = Math.max.apply(null, Object.keys(q.brands).map(function (k) { return q.brands[k]; }).concat([1]));
        Object.keys(q.brands).forEach(function (slug) {
            root.appendChild(hbar(BRAND_LABELS[slug] || slug, q.brands[slug], max, fmtInt(q.brands[slug]), 'is-orange'));
        });
        root.appendChild(h('p', { className: 'an-note', text: 'A lead can tick more than one brand.' }));
    }

    function renderLeads() {
        var root = clear($('an-leads'));
        if (!data.recentLeads.length) {
            noData(root);
            return;
        }
        var tbody = h('tbody');
        data.recentLeads.forEach(function (l) {
            var when = new Date(l.createdAt).toLocaleString('en-CA', { timeZone: data.tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            tbody.appendChild(h('tr', null, [
                h('td', { text: when }),
                h('td', { text: l.name }),
                h('td', { text: l.city }),
                h('td', { text: l.page || '—' }),
                h('td', null, l.brands.map(function (b) { return h('span', { className: 'an-tag', text: BRAND_LABELS[b] || b }); })),
                h('td', null, h('span', { className: 'an-tag' + (l.hasFile === 'yes' ? ' is-yes' : ''), text: l.hasFile || '—' })),
                h('td', { text: l.channel })
            ]));
        });
        root.appendChild(h('table', { className: 'an-table' }, [
            h('thead', null, h('tr', null, ['When', 'Name', 'City', 'Page', 'Brands', 'Has file', 'Channel'].map(function (t) {
                return h('th', { scope: 'col', text: t });
            }))),
            tbody
        ]));
    }

    function renderDefinitions() {
        var dl = clear($('an-defs'));
        Object.keys(data.definitions).forEach(function (key) {
            var text = data.definitions[key];
            var idx = text.indexOf(':');
            dl.appendChild(h('dt', { text: idx > 0 ? text.slice(0, idx) : key }));
            dl.appendChild(h('dd', { text: idx > 0 ? text.slice(idx + 1).trim() : text }));
        });
    }

    // ---------- controls ----------
    function fillSelect(select, items, value, allLabel) {
        clear(select);
        select.appendChild(h('option', { value: '', text: allLabel }));
        items.forEach(function (item) {
            select.appendChild(h('option', { value: item.slug, text: item.short && item.short !== item.label ? item.short + ' — ' + item.label : item.label, selected: item.slug === value }));
        });
        select.value = value;
    }

    function renderControls() {
        document.querySelectorAll('.an-pill').forEach(function (btn) {
            btn.setAttribute('aria-pressed', Number(btn.dataset.range) === state.range ? 'true' : 'false');
        });
        fillSelect($('an-location'), data.locations, state.location, 'All locations');
        fillSelect($('an-brand'), data.brands.map(function (b) { return { slug: b.slug, label: BRAND_LABELS[b.slug] || b.label }; }), state.brand, 'All brands');
        $('an-reset').hidden = !(state.location || state.brand);

        var start = new Date(data.period.start);
        var end = new Date(new Date(data.period.end).getTime() - 1);
        var fmt = function (d) { return d.toLocaleDateString('en-CA', { timeZone: data.tz, month: 'short', day: 'numeric', year: 'numeric' }); };
        var scope = 'All 10 pages';
        if (state.location && state.brand) {
            var page = data.pages.filter(function (p) { return p.location === state.location && p.brand === state.brand; })[0];
            scope = page ? page.label : 'No page for this combination';
        } else if (state.location) {
            scope = 'All ' + (data.locations.filter(function (l) { return l.slug === state.location; })[0] || {}).short + ' pages';
        } else if (state.brand) {
            scope = 'All ' + (BRAND_LABELS[state.brand] || state.brand) + ' pages';
        }
        $('an-period').textContent = scope + ' · ' + fmt(start) + ' – ' + fmt(end) + ' (' + data.tz + ')';
    }

    function render() {
        renderControls();
        renderKpis();
        renderTrend();
        renderFunnel();
        renderChannels();
        renderPages();
        renderHeatmap();
        renderDevices();
        renderCampaigns();
        renderQuality();
        renderLeads();
        renderDefinitions();
        bindDefTips(document);
    }

    function syncUrl() {
        var p = new URLSearchParams();
        p.set('range', String(state.range));
        if (state.location) p.set('location', state.location);
        if (state.brand) p.set('brand', state.brand);
        window.history.replaceState(null, '', '/analytics?' + p.toString());
    }

    function showError(message) {
        var el = $('an-error');
        el.textContent = message;
        el.hidden = !message;
    }

    function load() {
        syncUrl();
        var id = ++requestId;
        var main = $('an-main');
        main.setAttribute('aria-busy', 'true');
        var qs = new URLSearchParams({ range: String(state.range), location: state.location, brand: state.brand });
        fetch('/api/analytics/summary?' + qs.toString(), { credentials: 'same-origin', headers: { Accept: 'application/json' } })
            .then(function (res) {
                if (res.status === 404) throw new Error('Your dashboard session has expired. Open /analytics?token=… again.');
                if (res.status === 503) throw new Error('Data unavailable — the analytics database can’t be reached right now. The site itself is unaffected; try again in a few minutes.');
                if (!res.ok) throw new Error('Could not load analytics (HTTP ' + res.status + ').');
                return res.json();
            })
            .then(function (json) {
                if (id !== requestId) return;
                data = json;
                showError('');
                render();
                $('an-panels').hidden = false;
                document.querySelector('.an-controls').hidden = false;
            })
            .catch(function (err) {
                if (id !== requestId) return;
                showError(err.message);
                $('an-panels').hidden = true;
                if (!data) {
                    document.querySelector('.an-controls').hidden = true;
                    $('an-period').textContent = 'Data unavailable';
                }
            })
            .then(function () {
                if (id === requestId) main.setAttribute('aria-busy', 'false');
            });
    }

    document.querySelectorAll('.an-pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.range = Number(btn.dataset.range);
            load();
        });
    });
    $('an-location').addEventListener('change', function (ev) { state.location = ev.target.value; load(); });
    $('an-brand').addEventListener('change', function (ev) { state.brand = ev.target.value; load(); });
    $('an-reset').addEventListener('click', function () { state.location = ''; state.brand = ''; load(); });
    document.querySelectorAll('#an-pages th[data-sort]').forEach(function (th) {
        th.tabIndex = 0;
        var sort = function () {
            var key = th.dataset.sort;
            if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
            else { state.sortKey = key; state.sortDir = key === 'label' ? 'asc' : 'desc'; }
            if (data) renderPages();
        };
        th.addEventListener('click', sort);
        th.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') sort(); });
    });
    window.addEventListener('scroll', hideTip, { passive: true });

    load();
})();
