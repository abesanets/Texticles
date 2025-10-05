(() => {
    // ========== КОНФИГУРАЦИЯ И ИНИЦИАЛИЗАЦИЯ ==========
    const CONFIG = {
        MAX_PARTICLES: 15000,
        DPR_LIMIT: 1.5,
        MOUSE_RADIUS: 150,
        RESIZE_DELAY: 100,
        PERFORMANCE: {
            PARTICLE_DRAW_RATIO: 16,
            TRAIL_CHANCE: 0.3
        }
    };

    // ========== DOM ЭЛЕМЕНТЫ ==========
    const elements = {
        canvas: document.getElementById('c'),
        wrap: document.getElementById('stage'),
        fsBtn: document.getElementById('fullscreenBtn'),
        txt: document.getElementById('txt'),
        density: document.getElementById('density'),
        densityValue: document.getElementById('densityValue'),
        size: document.getElementById('size'),
        sizeValue: document.getElementById('sizeValue'),
        speed: document.getElementById('speed'),
        speedValue: document.getElementById('speedValue'),
        mouseMode: document.getElementById('mouseMode'),
        interactionStrength: document.getElementById('interactionStrength'),
        interactionValue: document.getElementById('interactionValue'),
        colorMode: document.getElementById('colorMode'),
        themeSelect: document.getElementById('themeSelect'),
        apply: document.getElementById('apply'),
        shuffle: document.getElementById('shuffle'),
        particleCount: document.getElementById('particleCount'),
        fps: document.getElementById('fps'),
        emojiPreview: document.getElementById('emojiPreview')
    };

    const ctx = elements.canvas.getContext('2d', { alpha: true });
    const offscreen = {
        canvas: document.createElement('canvas'),
        get ctx() { return this.canvas.getContext('2d'); }
    };

    // ========== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ==========
    let state = {
        W: 0, H: 0,
        DPR: Math.min(window.devicePixelRatio || 1, CONFIG.DPR_LIMIT),
        center: { x: 0, y: 0 },
        isManualFullscreen: false,
        targetPoints: [],
        particles: [],
        mouse: { x: -9999, y: -9999, vx: 0, vy: 0, px: -9999, py: -9999 },
        mouseUpdateScheduled: false,
        resizeTimeout: null,
        lastTime: performance.now(),
        frameCount: 0,
        lastFpsUpdate: 0,
        fps: 60
    };

    // ========== FULLSCREEN ЛОГИКА ==========
    const FullscreenManager = {
        isActive() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement || 
                     document.msFullscreenElement || state.isManualFullscreen);
        },

        enter() {
            const el = elements.wrap;
            if (el.requestFullscreen) el.requestFullscreen();
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            else if (el.msRequestFullscreen) el.msRequestFullscreen();
            else {
                document.body.setAttribute('data-fullscreen', 'true');
                state.isManualFullscreen = true;
                this.handleResize();
            }
        },

        exit() {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
            else {
                document.body.removeAttribute('data-fullscreen');
                state.isManualFullscreen = false;
                this.handleResize();
            }
        },

        toggle() {
            this.isActive() ? this.exit() : this.enter();
        },

        handleChange() {
            const isActive = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                              document.msFullscreenElement);
            
            if (isActive) {
                document.body.setAttribute('data-fullscreen', 'true');
                state.isManualFullscreen = false;
            } else {
                document.body.removeAttribute('data-fullscreen');
                state.isManualFullscreen = false;
            }
            
            elements.wrap.classList.toggle('fullscreen', this.isActive());
            setTimeout(() => this.handleResize(), 60);
        },

        handleResize() {
            resize();
        }
    };

    // ========== ИНИЦИАЛИЗАЦИЯ СЛАЙДЕРОВ ==========
    function initSliders() {
        const sliders = [
            elements.density, elements.size, 
            elements.speed, elements.interactionStrength
        ];

        sliders.forEach(slider => {
            slider.addEventListener('input', updateSliderValues);
        });
        updateSliderValues();
    }

    function updateSliderValues() {
        elements.densityValue.textContent = elements.density.value;
        elements.sizeValue.textContent = elements.size.value;
        elements.speedValue.textContent = elements.speed.value;
        elements.interactionValue.textContent = elements.interactionStrength.value;
    }

    // ========== УПРАВЛЕНИЕ ЭМОДЗИ ==========
    function updateEmojiPreview() {
        const text = elements.txt.value;
        const emojis = text.match(/\p{Emoji}/gu) || [];
        elements.emojiPreview.textContent = emojis.slice(0, 10).join(' ') + 
            (emojis.length > 10 ? '...' : '');
    }

    // ========== РАБОТА С РАЗМЕРАМИ ==========
    function resize() {
        const isFullscreen = FullscreenManager.isActive();
        state.W = isFullscreen ? window.innerWidth : elements.wrap.clientWidth;
        state.H = isFullscreen ? window.innerHeight : elements.wrap.clientHeight;

        elements.canvas.width = Math.max(1, Math.floor(state.W * state.DPR));
        elements.canvas.height = Math.max(1, Math.floor(state.H * state.DPR));
        elements.canvas.style.width = state.W + 'px';
        elements.canvas.style.height = state.H + 'px';
        
        ctx.setTransform(state.DPR, 0, 0, state.DPR, 0, 0);
        state.center = { x: state.W / 2, y: state.H / 2 };
        
        rebuildText();
    }

    // ========== СИСТЕМА ЧАСТИЦ ==========
    function createParticle(scattered = false) {
        const size = parseFloat(elements.size.value);
        return {
            x: state.center.x + (Math.random() - 0.5) * state.W * (scattered ? 1.6 : 0.1),
            y: state.center.y + (Math.random() - 0.5) * state.H * (scattered ? 1.6 : 0.1),
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            tx: state.center.x,
            ty: state.center.y,
            size: size,
            baseSize: size,
            hue: Math.random() * 360,
            useCustomColor: false,
            color: '',
            life: Math.random() * 100,
            speed: 0.5 + Math.random() * 0.5
        };
    }

    function scatterParticles() {
        for (let i = 0; i < state.particles.length; i++) {
            const p = state.particles[i];
            p.x = state.center.x + (Math.random() - 0.5) * state.W * 1.6;
            p.y = state.center.y + (Math.random() - 0.5) * state.H * 1.6;
            p.vx = (Math.random() - 0.5) * 6;
            p.vy = (Math.random() - 0.5) * 6;
            p.life = Math.random() * 100;
        }
    }

    // ========== РЕНДЕРИНГ ТЕКСТА ==========
    function buildEmojiColorMap(text) {
        const lines = text.split(/\n+/).filter(l => l.trim().length);
        if (lines.length === 0) return new Map();

        const fontSize = calculateOptimalFontSize(lines);
        setupOffscreenCanvas(fontSize, lines);

        const imageData = offscreen.ctx.getImageData(0, 0, offscreen.canvas.width, offscreen.canvas.height);
        const colorMap = new Map();

        for (let y = 0; y < offscreen.canvas.height; y++) {
            for (let x = 0; x < offscreen.canvas.width; x++) {
                const idx = (y * offscreen.canvas.width + x) * 4;
                const a = imageData.data[idx + 3];
                
                if (a > 50) {
                    const colorKey = `${x},${y}`;
                    const r = imageData.data[idx], g = imageData.data[idx + 1], b = imageData.data[idx + 2];
                    colorMap.set(colorKey, `rgb(${r},${g},${b})`);
                }
            }
        }

        return colorMap;
    }

    function buildTextPixels(text) {
        const lines = text.split(/\n+/).filter(l => l.trim().length);
        if (!lines.length) return [];

        const fontSize = calculateOptimalFontSize(lines);
        setupOffscreenCanvas(fontSize, lines);

        const img = offscreen.ctx.getImageData(0, 0, offscreen.canvas.width, offscreen.canvas.height).data;
        const points = [];
        const gap = 3;

        for (let y = 0; y < offscreen.canvas.height; y += gap) {
            for (let x = 0; x < offscreen.canvas.width; x += gap) {
                const idx = (y * offscreen.canvas.width + x) * 4;
                if (img[idx] > 150) {
                    points.push({
                        x: (x - offscreen.canvas.width / 2) + state.center.x,
                        y: (y - offscreen.canvas.height / 2) + state.center.y
                    });
                }
            }
        }

        return points;
    }

    function calculateOptimalFontSize(lines) {
        return Math.min(
            state.W / Math.max(...lines.map(l => l.length)) * 2, 
            state.H / (lines.length * 0.7)
        );
    }

    function setupOffscreenCanvas(fontSize, lines) {
        offscreen.canvas.width = Math.max(400, Math.floor(state.W * 0.95));
        offscreen.canvas.height = Math.max(200, Math.floor(state.H * 0.85));

        offscreen.ctx.clearRect(0, 0, offscreen.canvas.width, offscreen.canvas.height);
        offscreen.ctx.fillStyle = '#000000';
        offscreen.ctx.fillRect(0, 0, offscreen.canvas.width, offscreen.canvas.height);
        offscreen.ctx.fillStyle = '#ffffff';
        offscreen.ctx.textAlign = 'center';
        offscreen.ctx.textBaseline = 'middle';
        offscreen.ctx.font = `bold ${fontSize}px system-ui, Arial`;

        const totalHeight = fontSize * lines.length * 0.9;
        const startY = offscreen.canvas.height / 2 - totalHeight / 2 + fontSize / 2;

        lines.forEach((line, i) => {
            offscreen.ctx.fillText(line, offscreen.canvas.width / 2, startY + i * fontSize * 0.9);
        });
    }

    // ========== ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ==========
    function rebuildText() {
        const text = '  ' + (elements.txt.value || '') + '  ';
        state.targetPoints = buildTextPixels(text);

        const density = parseFloat(elements.density.value);
        const desiredCount = Math.min(
            CONFIG.MAX_PARTICLES, 
            Math.max(100, Math.floor(state.targetPoints.length * density / 5))
        );

        // Оптимизированное управление массивом частиц
        if (state.particles.length < desiredCount) {
            const needed = desiredCount - state.particles.length;
            for (let i = 0; i < needed; i++) {
                state.particles.push(createParticle(true));
            }
        } else if (state.particles.length > desiredCount) {
            state.particles.length = desiredCount;
        }

        const emojiColors = elements.colorMode.value === 'emoji' ? 
            buildEmojiColorMap(text) : new Map();

        distributeParticles(emojiColors);
        elements.particleCount.textContent = `Частиц: ${state.particles.length}`;
    }

    function distributeParticles(emojiColors) {
        const pointCount = state.targetPoints.length;
        
        for (let i = 0; i < state.particles.length; i++) {
            const pt = state.targetPoints[Math.floor(Math.random() * pointCount)];
            const p = state.particles[i];
            
            p.tx = pt.x;
            p.ty = pt.y;

            if (elements.colorMode.value === 'emoji') {
                const offX = Math.round(pt.x - state.center.x + offscreen.canvas.width / 2);
                const offY = Math.round(pt.y - state.center.y + offscreen.canvas.height / 2);
                const colorKey = `${offX},${offY}`;

                if (emojiColors.has(colorKey)) {
                    p.color = emojiColors.get(colorKey);
                    p.useCustomColor = true;
                } else {
                    p.useCustomColor = false;
                    p.hue = Math.random() * 360;
                }
            } else {
                p.useCustomColor = false;
                p.hue = Math.random() * 360;
            }
        }
    }

    function setText(txt) {
        elements.txt.value = txt;
        updateEmojiPreview();
        rebuildText();
    }

    // ========== АНИМАЦИЯ И РЕНДЕРИНГ ==========
    function updateParticles(dt) {
        const spd = parseFloat(elements.speed.value);
        const mMode = elements.mouseMode.value;
        const interactionStr = parseFloat(elements.interactionStrength.value);
        const mouseX = state.mouse.x, mouseY = state.mouse.y;

        for (let i = 0; i < state.particles.length; i++) {
            const p = state.particles[i];
            
            // Движение к цели
            const dx = p.tx - p.x, dy = p.ty - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speedFactor = p.speed * spd * dt * (0.5 + dist / 200);
            
            p.vx += dx * 0.015 * speedFactor;
            p.vy += dy * 0.015 * speedFactor;

            // Взаимодействие с мышью
            if (mMode !== 'none' && mouseX > -9990) {
                handleMouseInteraction(p, mMode, interactionStr, dt, mouseX, mouseY);
            }

            // Физика
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.x += p.vx;
            p.y += p.vy;
        }
    }

    function handleMouseInteraction(p, mode, strength, dt, mouseX, mouseY) {
        const mdx = p.x - mouseX, mdy = p.y - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

        if (mdist < CONFIG.MOUSE_RADIUS) {
            const push = (1 - mdist / CONFIG.MOUSE_RADIUS);
            const force = 4 * push * dt * strength;

            switch (mode) {
                case 'repel':
                    p.vx += (mdx / (mdist + 0.01)) * force;
                    p.vy += (mdy / (mdist + 0.01)) * force;
                    break;
                case 'attract':
                    p.vx -= (mdx / (mdist + 0.01)) * force;
                    p.vy -= (mdy / (mdist + 0.01)) * force;
                    break;
                case 'swirl':
                    const angle = Math.atan2(mdy, mdx);
                    p.vx += Math.cos(angle + Math.PI / 2) * force * 0.7;
                    p.vy += Math.sin(angle + Math.PI / 2) * force * 0.7;
                    p.vx -= mdx * 0.0005 * push;
                    p.vy -= mdy * 0.0005 * push;
                    break;
            }
        }
    }

    function renderParticles() {
        const colorMode = elements.colorMode.value;
        const themeColor1 = getComputedStyle(document.body).getPropertyValue('--particle1').trim();
        const themeColor2 = getComputedStyle(document.body).getPropertyValue('--particle2').trim();

        for (let i = 0; i < state.particles.length; i++) {
            const p = state.particles[i];
            
            // Определение цвета
            if (colorMode === 'emoji' && p.useCustomColor) {
                ctx.fillStyle = p.color;
            } else if (colorMode === 'monochrome') {
                ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
            } else {
                ctx.fillStyle = `hsl(${p.hue + i % 50} 100% 60% / 0.9)`;
            }

            // Рендер частицы
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Рендер хвостов (с оптимизацией производительности)
            if (i % CONFIG.PERFORMANCE.PARTICLE_DRAW_RATIO === 0 && 
                Math.random() > CONFIG.PERFORMANCE.TRAIL_CHANCE) {
                ctx.strokeStyle = ctx.fillStyle.replace('0.9', '0.3');
                ctx.lineWidth = Math.max(0.3, p.size * 0.15);
                ctx.beginPath();
                ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        }
    }

    function updateFPS(now) {
        state.frameCount++;
        if (now - state.lastFpsUpdate >= 1000) {
            state.fps = Math.round((state.frameCount * 1000) / (now - state.lastFpsUpdate));
            elements.fps.textContent = `FPS: ${state.fps}`;
            state.frameCount = 0;
            state.lastFpsUpdate = now;
        }
    }

    function tick(now) {
        const dt = Math.min(48, now - state.lastTime) / 16.666;
        state.lastTime = now;

        updateFPS(now);
        ctx.clearRect(0, 0, state.W, state.H);
        
        updateParticles(dt);
        renderParticles();

        requestAnimationFrame(tick);
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
    function initEventListeners() {
        // Мышь
        elements.canvas.addEventListener('mousemove', handleMouseMove);
        elements.canvas.addEventListener('mouseleave', () => {
            state.mouse.x = state.mouse.y = -9999;
            state.mouse.vx = state.mouse.vy = 0;
        });

        // Ресайз
        window.addEventListener('resize', () => {
            clearTimeout(state.resizeTimeout);
            state.resizeTimeout = setTimeout(resize, CONFIG.RESIZE_DELAY);
        });

        // Управление
        elements.apply.addEventListener('click', () => setText(elements.txt.value || ''));
        elements.shuffle.addEventListener('click', scatterParticles);
        elements.themeSelect.addEventListener('change', () => {
            document.body.setAttribute('data-theme', elements.themeSelect.value);
        });

        // Размер частиц
        elements.size.addEventListener('input', () => {
            const newSize = parseFloat(elements.size.value);
            for (let i = 0; i < state.particles.length; i++) {
                state.particles[i].baseSize = state.particles[i].size = newSize;
            }
            updateSliderValues();
        });

        // Fullscreen
        elements.fsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            FullscreenManager.toggle();
        });
        elements.fsBtn.addEventListener('mousedown', (e) => e.preventDefault());

        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            const isTyping = active && (
                active.tagName === "TEXTAREA" ||
                active.tagName === "INPUT" ||
                active.tagName === "SELECT"
            );

            if (!isTyping && e.code === "KeyF") {
                e.preventDefault();
                FullscreenManager.toggle();
            }
        });

        // Fullscreen события
        ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(event => {
            document.addEventListener(event, () => FullscreenManager.handleChange());
        });

        // Динамические параметры
        elements.txt.addEventListener('input', updateEmojiPreview);
        elements.density.addEventListener('input', rebuildText);
        elements.colorMode.addEventListener('change', rebuildText);
    }

    function handleMouseMove(e) {
        if (!state.mouseUpdateScheduled) {
            state.mouseUpdateScheduled = true;
            requestAnimationFrame(() => {
                const r = elements.canvas.getBoundingClientRect();
                state.mouse.px = state.mouse.x;
                state.mouse.py = state.mouse.y;
                state.mouse.x = e.clientX - r.left;
                state.mouse.y = e.clientY - r.top;

                if (state.mouse.px > -9990) {
                    state.mouse.vx = (state.mouse.x - state.mouse.px) * 0.5;
                    state.mouse.vy = (state.mouse.y - state.mouse.py) * 0.5;
                }

                state.mouseUpdateScheduled = false;
            });
        }
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==========
    function init() {
        // Инициализация частиц
        for (let i = 0; i < 800; i++) {
            state.particles.push(createParticle(true));
        }

        initSliders();
        initEventListeners();
        updateEmojiPreview();
        
        resize();
        setTimeout(() => {
            rebuildText();
            scatterParticles();
            requestAnimationFrame(tick);
        }, 100);
    }

    // Запуск приложения
    init();
})();