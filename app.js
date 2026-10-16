(function () {
    var THEMES = [
        ['red', '#ff0000'], ['orange', '#ff5500'], ['yellow', '#ffea00'],
        ['green', '#30ff00'], ['cyan', '#00fffb'], ['blue', '#001aff'],
        ['purple', '#6f00ff'], ['pink', '#ff00f2'], ['white', '#ffffff']
    ];
    var STORE = 'jj2-'; // localStorage prefix

    function hexToRgb(hex) {
        var n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function mix(rgb, amount) { // blend toward white
        return 'rgb(' + rgb.map(function (c) { return Math.round(c + (255 - c) * amount); }).join(',') + ')';
    }

    /* ── theme ── */
    var themeRgb = [255, 234, 0];
    function applyTheme(hex) {
        themeRgb = hexToRgb(hex);
        var s = document.documentElement.style;
        s.setProperty('--theme', hex);
        s.setProperty('--theme-rgb', themeRgb.join(', '));
        s.setProperty('--theme-soft', mix(themeRgb, 0.8));
        s.setProperty('--theme-wash', mix(themeRgb, 0.88));
        document.querySelectorAll('.swatch').forEach(function (b) {
            b.setAttribute('aria-checked', b.dataset.color === hex ? 'true' : 'false');
        });
        try { localStorage.setItem(STORE + 'theme', hex); } catch (_) {}
    }
    var savedTheme = '#ffea00';
    try { savedTheme = localStorage.getItem(STORE + 'theme') || savedTheme; } catch (_) {}
    applyTheme(savedTheme);

    document.addEventListener('DOMContentLoaded', function () {
        var menu = document.getElementById('theme-menu');
        var trigger = document.getElementById('theme-trigger');
        THEMES.forEach(function (t) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'swatch';
            b.title = t[0];
            b.setAttribute('aria-label', t[0]);
            b.setAttribute('role', 'radio');
            b.dataset.color = t[1];
            b.style.setProperty('--swatch', t[1]);
            b.addEventListener('click', function () { applyTheme(t[1]); menu.hidden = true; });
            menu.appendChild(b);
        });
        applyTheme(savedTheme);
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            menu.hidden = !menu.hidden;
            trigger.setAttribute('aria-expanded', String(!menu.hidden));
        });
        document.addEventListener('click', function (e) {
            if (!menu.contains(e.target)) menu.hidden = true;
        });

        startBackground();
        startStats();
        renderGrid();
        greet();
    });

    /* ── animated background (drifting glowing dots) ── */
    function startBackground() {
        var canvas = document.getElementById('bg');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var dots = [], w, h, dpr;
        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.width = innerWidth * dpr;
            h = canvas.height = innerHeight * dpr;
            var count = Math.round((innerWidth * innerHeight) / 14000);
            dots = [];
            for (var i = 0; i < count; i++) {
                dots.push({
                    x: Math.random() * w, y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
                    r: (Math.random() * 1.6 + 0.4) * dpr
                });
            }
        }
        resize();
        addEventListener('resize', resize);
        var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        function frame() {
            ctx.clearRect(0, 0, w, h);
            var c = themeRgb.join(','), link = 120 * dpr;
            for (var i = 0; i < dots.length; i++) {
                var d = dots[i];
                d.x += d.vx; d.y += d.vy;
                if (d.x < 0 || d.x > w) d.vx *= -1;
                if (d.y < 0 || d.y > h) d.vy *= -1;
                for (var j = i + 1; j < dots.length; j++) {
                    var e = dots[j], dx = d.x - e.x, dy = d.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < link) {
                        ctx.strokeStyle = 'rgba(' + c + ',' + (0.12 * (1 - dist / link)) + ')';
                        ctx.lineWidth = dpr;
                        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.stroke();
                    }
                }
                ctx.fillStyle = 'rgba(' + c + ',0.55)';
                ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
            }
            if (!reduce) requestAnimationFrame(frame);
        }
        frame();
    }

    /* ── header stats: clock, battery, ping ── */
    function startStats() {
        var clock = document.querySelector('[data-stat="clock"] span');
        var battery = document.querySelector('[data-stat="battery"]');
        var ping = document.querySelector('[data-stat="ping"] span');

        function tick() {
            if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        tick();
        setInterval(tick, 10000);

        if (battery && navigator.getBattery) {
            navigator.getBattery().then(function (b) {
                function show() {
                    var pct = Math.round(b.level * 100);
                    battery.title = 'battery: ' + pct + '%' + (b.charging ? ' (charging)' : '');
                    battery.querySelector('span').textContent = (b.charging ? '⚡ ' : '') + pct + '%';
                    battery.hidden = false;
                }
                show();
                b.addEventListener('levelchange', show);
                b.addEventListener('chargingchange', show);
            });
        }

        function measure() {
            if (!ping) return;
            var t = performance.now();
            fetch('favicon.ico?p=' + Date.now(), { cache: 'no-store' })
                .then(function () { ping.textContent = Math.round(performance.now() - t) + ' ms'; })
                .catch(function () { ping.textContent = 'offline'; });
        }
        measure();
        setInterval(measure, 15000);
    }

    /* ── favorites ── */
    function getFavs() {
        try { return JSON.parse(localStorage.getItem(STORE + 'favs') || '[]'); } catch (_) { return []; }
    }
    function setFavs(list) {
        try { localStorage.setItem(STORE + 'favs', JSON.stringify(list)); } catch (_) {}
    }

    /* ── grid ── */
    function renderGrid() {
        var grid = document.getElementById('grid');
        var search = document.getElementById('search');
        var empty = document.getElementById('empty');
        if (!grid) return;
        var items = window.ITEMS || [];

        function draw() {
            var q = (search.value || '').trim().toLowerCase();
            var favs = getFavs();
            var list = items
                .filter(function (it) { return !q || it.name.toLowerCase().indexOf(q) !== -1; })
                .sort(function (a, b) { return (favs.indexOf(b.name) !== -1) - (favs.indexOf(a.name) !== -1); });
            grid.innerHTML = '';
            list.forEach(function (it) {
                var tile = document.createElement('div');
                tile.className = 'tile';
                tile.tabIndex = 0;
                tile.setAttribute('role', 'button');
                tile.setAttribute('aria-label', it.name);

                var letter = document.createElement('div');
                letter.className = 'letter';
                letter.textContent = it.name.charAt(0).toUpperCase();
                tile.appendChild(letter);

                var src = it.img || ('https://www.google.com/s2/favicons?sz=256&domain_url=' + encodeURIComponent(it.url));
                var img = document.createElement('img');
                img.alt = it.name;
                img.loading = 'lazy';
                img.src = src;
                img.style.position = 'relative';
                if (!it.img) { img.style.objectFit = 'contain'; img.style.padding = '28%'; }
                img.onerror = function () { img.remove(); };
                tile.appendChild(img);

                var label = document.createElement('div');
                label.className = 'label';
                label.textContent = it.name;
                tile.appendChild(label);

                var isFav = favs.indexOf(it.name) !== -1;
                var fav = document.createElement('button');
                fav.className = 'fav' + (isFav ? ' on' : '');
                fav.title = fav.ariaLabel = isFav ? 'unfavorite' : 'favorite';
                fav.textContent = isFav ? '★' : '☆';
                fav.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var f = getFavs(), i = f.indexOf(it.name);
                    if (i === -1) f.push(it.name); else f.splice(i, 1);
                    setFavs(f);
                    draw();
                });
                tile.appendChild(fav);

                tile.addEventListener('click', function () { openGame(it.url, it.name); });
                tile.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGame(it.url, it.name); }
                });
                grid.appendChild(tile);
            });
            if (empty) empty.hidden = list.length > 0;
        }
        search.addEventListener('input', draw);
        draw();
    }

    /* ── fullscreen overlay (press Esc or the close button to exit) ── */
    var overlay, frame, pageTitle = document.title;
    function ensureOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'overlay';
        var close = document.createElement('button');
        close.id = 'overlay-close';
        close.type = 'button';
        close.textContent = '✕ close';
        close.addEventListener('click', closeGame);
        frame = document.createElement('iframe');
        frame.setAttribute('allow', 'fullscreen; autoplay; clipboard-read; clipboard-write; gamepad');
        frame.setAttribute('allowfullscreen', '');
        overlay.appendChild(close);
        overlay.appendChild(frame);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('open')) closeGame();
        });
    }
    function openGame(url, name) {
        ensureOverlay();
        frame.src = url;
        overlay.classList.add('open');
        document.documentElement.style.overflow = 'hidden';
        document.title = name + ' · ' + pageTitle;
    }
    function closeGame() {
        if (!overlay) return;
        overlay.classList.remove('open');
        frame.src = 'about:blank';
        document.documentElement.style.overflow = '';
        document.title = pageTitle;
    }
    window.openFullscreen = openGame;

    /* ── greeting toast, once per part of the day ── */
    function greet() {
        var toast = document.getElementById('toast');
        if (!toast) return;
        var h = new Date().getHours();
        var p = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening';
        var d = new Date();
        var key = STORE + 'greeted-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '-' + p;
        try {
            if (localStorage.getItem(key)) return;
            localStorage.setItem(key, '1');
        } catch (_) {}
        toast.textContent = '👋 good ' + p + '!';
        setTimeout(function () {
            toast.classList.add('show');
            setTimeout(function () { toast.classList.remove('show'); }, 3800);
        }, 600);
    }
})();
