(() => {
    // ========== КОНФИГУРАЦИЯ И ИНИЦИАЛИЗАЦИЯ ==========
    const CONFIG = {
        MAX_PARTICLES: 25000,
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
        interaction: document.getElementById('interaction'),
        interactionValue: document.getElementById('interactionValue'),
        colorMode: document.getElementById('colorMode'),
        themeSelect: document.getElementById('themeSelect'),
        apply: document.getElementById('apply'),
        shuffle: document.getElementById('shuffle'),
        particleCount: document.getElementById('particleCount'),
        fps: document.getElementById('fps'),
        emojiPreview: document.getElementById('emojiPreview'),
        showFps: document.getElementById('showFps'),
        showFpsValue: document.getElementById('showFpsValue'),
        showParticleCount: document.getElementById('showParticleCount'),
        showParticleCountValue: document.getElementById('showParticleCountValue'),
        fpsOverlay: document.getElementById('fpsOverlay'),
        particleCountOverlay: document.getElementById('particleCountOverlay')
    };

    const ctx = elements.canvas.getContext('2d', { alpha: true });

    const offscreen = {
        canvas: document.createElement('canvas'),
        ctx: null
    };
    offscreen.ctx = offscreen.canvas.getContext('2d', { willReadFrequently: true });

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

    // ========== ИНИЦИАЛИЗАЦИЯ СЛАЙДЕРОВ И ПРЕСЕТОВ ==========
    function initSliders() {
        const sliders = [elements.density, elements.size, elements.speed, elements.interaction];
        sliders.forEach(slider => slider.addEventListener('input', updateSliderValues));
        updateSliderValues();
    }

    function updateSliderValues() {
        elements.densityValue.textContent = elements.density.value;
        elements.sizeValue.textContent = elements.size.value;
        elements.speedValue.textContent = elements.speed.value;
        elements.interactionValue.textContent = elements.interaction.value;
    }

    function triggerInputEvent(slider) {
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
    }

    function initPresets() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.density.value = btn.dataset.density;
                elements.size.value = btn.dataset.size;
                elements.speed.value = btn.dataset.speed;
                elements.interaction.value = btn.dataset.interaction;
                triggerInputEvent(elements.density);
                triggerInputEvent(elements.size);
                triggerInputEvent(elements.speed);
                triggerInputEvent(elements.interaction);
            });
        });
    }

    // ========== УПРАВЛЕНИЕ ЭМОДЗИ И ТЕКСТОМ ==========
    function updateEmojiPreview() {
        const text = elements.txt.value;
        const emojis = text.match(/\p{Emoji}/gu) || [];
        elements.emojiPreview.textContent = emojis.slice(0, 10).join(' ') + (emojis.length > 10 ? '...' : '');
    }

    function setText(txt) {
        elements.txt.value = txt;
        updateEmojiPreview();
        rebuildText();
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
            speed: 0.5 + Math.random() * 0.5,
            energy: 0, // Добавлено для pulse режима
            neural: false, // Для neural
            neuralConnections: [], // Для neural
            symmetry: false, // Для symmetry
            chaos: false // Для chaos
        };
    }

    function scatterParticles() {
        state.particles.forEach(p => {
            p.x = state.center.x + (Math.random() - 0.5) * state.W * 1.6;
            p.y = state.center.y + (Math.random() - 0.5) * state.H * 1.6;
            p.vx = (Math.random() - 0.5) * 6;
            p.vy = (Math.random() - 0.5) * 6;
            p.life = Math.random() * 100;
        });
    }

    // ========== РЕНДЕРИНГ ТЕКСТА И ЦВЕТОВ ==========
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
                const brightness = (img[idx] + img[idx + 1] + img[idx + 2]) / 3;
                if (brightness > 50) {
                    points.push({
                        x: x - offscreen.canvas.width / 2 + state.center.x,
                        y: y - offscreen.canvas.height / 2 + state.center.y
                    });
                }
            }
        }

        return points;
    }

    function buildEmojiColorMap(text) {
        const lines = text.split(/\n+/).filter(l => l.trim().length);
        if (!lines.length) return new Map();

        const fontSize = calculateOptimalFontSize(lines);
        setupOffscreenCanvas(fontSize, lines);

        const imageData = offscreen.ctx.getImageData(0, 0, offscreen.canvas.width, offscreen.canvas.height);
        const colorMap = new Map();
        const gap = 3; // Оптимизация: используем тот же gap, что и в buildTextPixels, чтобы избежать лишних итераций

        for (let y = 0; y < offscreen.canvas.height; y += gap) {
            for (let x = 0; x < offscreen.canvas.width; x += gap) {
                const idx = (y * offscreen.canvas.width + x) * 4;
                const a = imageData.data[idx + 3];
                if (a > 50) {
                    const r = imageData.data[idx], g = imageData.data[idx + 1], b = imageData.data[idx + 2];
                    colorMap.set(`${x},${y}`, `rgb(${r},${g},${b})`);
                }
            }
        }

        return colorMap;
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
        const currentCount = state.particles.length;
        if (currentCount < desiredCount) {
            const needed = desiredCount - currentCount;
            for (let i = 0; i < needed; i++) {
                state.particles.push(createParticle(true));
            }
        } else if (currentCount > desiredCount) {
            state.particles.length = desiredCount;
        }

        const emojiColors = elements.colorMode.value === 'emoji' ? buildEmojiColorMap(text) : new Map();
        distributeParticles(emojiColors);

        const count = state.particles.length;
        elements.particleCount.textContent = `Частиц: ${count}`;
        if (elements.showParticleCount.checked) {
            elements.particleCountOverlay.textContent = `Частиц: ${count}`;
        }
    }

    function distributeParticles(emojiColors) {
        const pointCount = state.targetPoints.length;
        const colorMode = elements.colorMode.value;
        const isEmoji = colorMode === 'emoji';

        state.particles.forEach((p, i) => {
            const ptIdx = Math.floor(Math.random() * pointCount);
            const pt = state.targetPoints[ptIdx];
            p.tx = pt.x;
            p.ty = pt.y;

            if (isEmoji) {
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
        });
    }

    // ========== АНИМАЦИЯ И РЕНДЕРИНГ ==========
    const mouseInteractionHandlers = {
        repel: (p, force, mdx, mdy, mdist) => {
            p.vx += (mdx / (mdist + 0.01)) * force;
            p.vy += (mdy / (mdist + 0.01)) * force;
        },
        attract: (p, force, mdx, mdy, mdist) => {
            p.vx -= (mdx / (mdist + 0.01)) * force;
            p.vy -= (mdy / (mdist + 0.01)) * force;
        },
        swirl: (p, force, mdx, mdy, mdist) => {
            const angle = Math.atan2(mdy, mdx);
            p.vx += Math.cos(angle + Math.PI / 2) * force * 0.7;
            p.vy += Math.sin(angle + Math.PI / 2) * force * 0.7;
            p.vx -= mdx * 0.0005 * (1 - mdist / CONFIG.MOUSE_RADIUS);
            p.vy -= mdy * 0.0005 * (1 - mdist / CONFIG.MOUSE_RADIUS);
        },
        pulse: (p, force, mdx, mdy, mdist) => {
            const push = 1 - mdist / CONFIG.MOUSE_RADIUS;
            const pulseWave = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            const pulseForce = force * (0.5 + pulseWave);
            p.vx += (mdx / (mdist + 0.01)) * pulseForce;
            p.vy += (mdy / (mdist + 0.01)) * pulseForce;
            p.energy = Math.min(1, (p.energy || 0) + push * 0.1);
        },
        gravity: (p, force, mdx, mdy, mdist) => {
            const gravityForce = force * 2.5;
            const acceleration = gravityForce / (mdist * 0.1 + 0.1);
            p.vx -= (mdx / (mdist + 0.01)) * acceleration;
            p.vy -= (mdy / (mdist + 0.01)) * acceleration;
            p.size = Math.max(0.5, p.baseSize * (mdist / CONFIG.MOUSE_RADIUS));
        },
        neural: (p, force, mdx, mdy, mdist) => {
            p.neural = true;
            p.neuralConnections = [];
            p.vx += (Math.sin(mdist * 0.1 + Date.now() * 0.002) - 0.5) * force * 0.5;
            p.vy += (Math.cos(mdist * 0.1 + Date.now() * 0.002) - 0.5) * force * 0.5;
            p.color = `hsl(${(mdist * 2) % 360}, 80%, 60%)`;
        },
        symmetry: (p, force, mdx, mdy, mdist, mouseX, mouseY) => {
            const mirrorX = 2 * mouseX - p.x;
            const mirrorY = 2 * mouseY - p.y;
            const mirrorDist = Math.sqrt((mirrorX - mouseX) ** 2 + (mirrorY - mouseY) ** 2);
            if (mirrorDist < CONFIG.MOUSE_RADIUS) {
                p.vx += (mirrorX - p.x) * 0.02 * force;
                p.vy += (mirrorY - p.y) * 0.02 * force;
            }
            p.symmetry = true;
        },
        chaos: (p, force, mdx, mdy, mdist) => {
            const chaos1 = Math.sin(p.x * 0.01 + Date.now() * 0.001);
            const chaos2 = Math.cos(p.y * 0.01 + Date.now() * 0.001);
            const chaos3 = Math.sin((p.x + p.y) * 0.005 + Date.now() * 0.002);
            p.vx += (chaos1 - 0.5) * force * 2;
            p.vy += (chaos2 - 0.5) * force * 2;
            p.vx += Math.cos(chaos3 * Math.PI * 2) * force;
            p.vy += Math.sin(chaos3 * Math.PI * 2) * force;
            p.color = `hsl(${(chaos1 * 60 + chaos2 * 60 + chaos3 * 60) % 360}, 80%, 60%)`;
            p.chaos = true;
        }
    };

    function handleMouseInteraction(p, mode, strength, dt, mouseX, mouseY) {
        const mdx = p.x - mouseX;
        const mdy = p.y - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < CONFIG.MOUSE_RADIUS) {
            const push = 1 - mdist / CONFIG.MOUSE_RADIUS;
            const force = 4 * push * dt * strength;
            const handler = mouseInteractionHandlers[mode];
            if (handler) {
                handler(p, force, mdx, mdy, mdist, mouseX, mouseY);
            }
        }
    }

    function updateParticles(dt) {
        const spd = parseFloat(elements.speed.value);
        const mMode = elements.mouseMode.value;
        const interactionStr = parseFloat(elements.interaction.value);
        const mouseX = state.mouse.x;
        const mouseY = state.mouse.y;
        const hasMouseInteraction = mMode !== 'none' && mouseX > -9990;

        state.particles.forEach(p => {
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speedFactor = p.speed * spd * dt * (0.5 + dist / 200);

            p.vx += dx * 0.015 * speedFactor;
            p.vy += dy * 0.015 * speedFactor;

            if (hasMouseInteraction) {
                handleMouseInteraction(p, mMode, interactionStr, dt, mouseX, mouseY);
            }

            p.vx *= 0.92;
            p.vy *= 0.92;
            p.x += p.vx;
            p.y += p.vy;
        });
    }

    const colorModeHandlers = {
        emoji: (p, i, now) => p.useCustomColor ? p.color : `hsla(${p.hue + i % 50}, 100%, 60%, 0.9)`,
        monochrome: () => 'rgba(255, 255, 255, 0.9)',
        gradient: (p, i) => `hsla(${p.hue + i % 50}, 100%, 60%, 0.9)`,
        fire: (p, i, now) => {
            const fireHue = 20 + (p.hue % 40);
            const saturation = 80 + Math.sin(now * 0.005 + i) * 20;
            return `hsla(${fireHue}, ${saturation}%, 60%, 0.9)`;
        },
        ice: (p, i, now) => {
            const iceHue = 180 + (p.hue % 60);
            const lightness = 70 + Math.cos(now * 0.003 + i) * 15;
            return `hsla(${iceHue}, 70%, ${lightness}%, 0.9)`;
        },
        neon: (p, i, now) => {
            const neonHue = (p.hue * 3) % 360;
            const pulse = Math.sin(now * 0.01 + i * 0.1) * 0.3 + 0.7;
            return `hsla(${neonHue}, 100%, ${50 + pulse * 20}%, 0.9)`;
        },
        pastel: p => `hsla(${p.hue % 360}, 60%, 75%, 0.8)`,
        galaxy: (p, i, now) => {
            const galaxyHue = 270 + (p.hue % 90);
            const twinkle = Math.sin(now * 0.002 + i * 0.5) * 0.4 + 0.6;
            return `hsla(${galaxyHue}, 80%, ${40 + twinkle * 30}%, 0.9)`;
        },
        forest: (p, i, now) => {
            const forestHue = 90 + (p.hue % 60);
            const variation = Math.cos(now * 0.001 + i) * 15;
            return `hsla(${forestHue}, 80%, ${35 + variation}%, 0.9)`;
        },
        ocean: (p, i, now) => {
            const oceanHue = 160 + (p.hue % 80);
            const wave = Math.sin(now * 0.004 + p.x * 0.01 + p.y * 0.01) * 10;
            return `hsla(${oceanHue}, 85%, ${45 + wave}%, 0.9)`;
        },
        lava: (p, i, now) => {
            const lavaHue = 10 + (Math.sin(now * 0.005 + i * 0.2) * 10);
            const glow = Math.sin(now * 0.01 + i) * 0.5 + 0.5;
            return `hsla(${lavaHue}, 100%, ${40 + glow * 20}%, 0.9)`;
        },
        default: (p, i) => `hsla(${p.hue + i % 50}, 100%, 60%, 0.9)`
    };

    function getParticleColor(p, i, colorMode, now) {
        const handler = colorModeHandlers[colorMode] || colorModeHandlers.default;
        return handler(p, i, now);
    }

    function renderParticles() {
        const colorMode = elements.colorMode.value;
        const now = Date.now();
        const drawRatio = CONFIG.PERFORMANCE.PARTICLE_DRAW_RATIO;
        const trailChance = CONFIG.PERFORMANCE.TRAIL_CHANCE;

        state.particles.forEach((p, i) => {
            const particleColor = getParticleColor(p, i, colorMode, now);
            ctx.fillStyle = particleColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (i % drawRatio === 0 && Math.random() > trailChance) {
                ctx.strokeStyle = particleColor.replace('0.9', '0.3').replace('0.8', '0.3');
                ctx.lineWidth = Math.max(0.3, p.size * 0.15);
                ctx.beginPath();
                ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        });
    }

    function updateFPS(now) {
        state.frameCount++;
        if (now - state.lastFpsUpdate >= 1000) {
            state.fps = Math.round((state.frameCount * 1000) / (now - state.lastFpsUpdate));
            elements.fps.textContent = `FPS: ${state.fps}`;
            if (elements.showFps.checked) {
                elements.fpsOverlay.textContent = `FPS: ${state.fps}`;
            }
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

    function initEventListeners() {
        // Мышь на canvas
        elements.canvas.addEventListener('mousemove', handleMouseMove);
        elements.canvas.addEventListener('mouseleave', () => {
            state.mouse.x = state.mouse.y = -9999;
            state.mouse.vx = state.mouse.vy = 0;
        });

        // Кастомный курсор на stage
        const stage = document.getElementById('stage');
        const cursor = document.getElementById('custom-cursor');
        if (stage && cursor) {
            stage.addEventListener('mouseenter', () => {
                cursor.style.display = 'block';
                stage.style.cursor = 'none';
            });
            stage.addEventListener('mouseleave', () => {
                cursor.style.display = 'none';
                stage.style.cursor = 'default';
            });
            stage.addEventListener('mousemove', e => {
                const rect = stage.getBoundingClientRect();
                cursor.style.left = (e.clientX - rect.left) + 'px';
                cursor.style.top = (e.clientY - rect.top) + 'px';
            });
        }

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
            updateOverlayControls();
        });

        // Размер частиц
        elements.size.addEventListener('input', () => {
            const newSize = parseFloat(elements.size.value);
            state.particles.forEach(p => {
                p.baseSize = p.size = newSize;
            });
            updateSliderValues();
        });

        // Fullscreen
        elements.fsBtn.addEventListener('click', e => {
            e.preventDefault();
            FullscreenManager.toggle();
        });
        elements.fsBtn.addEventListener('mousedown', e => e.preventDefault());

        // Горячие клавиши
        document.addEventListener('keydown', e => {
            const active = document.activeElement;
            const isTyping = active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.tagName === "SELECT");
            if (!isTyping && e.code === "KeyF") {
                e.preventDefault();
                FullscreenManager.toggle();
            }
        });

        // Fullscreen события
        ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(event => {
            document.addEventListener(event, () => FullscreenManager.handleChange());
        });

        // Оверлеи
        elements.showFps.addEventListener('change', updateOverlayControls);
        elements.showParticleCount.addEventListener('change', updateOverlayControls);

        // Динамические параметры
        elements.txt.addEventListener('input', updateEmojiPreview);
        elements.density.addEventListener('input', rebuildText);
        elements.colorMode.addEventListener('change', rebuildText);
    }

    // ========== OVERLAY CONTROLS ==========
    function updateOverlayControls() {
        elements.fpsOverlay.classList.toggle('hidden', !elements.showFps.checked);
        elements.particleCountOverlay.classList.toggle('hidden', !elements.showParticleCount.checked);

        if (elements.showFps.checked) {
            elements.fpsOverlay.textContent = `FPS: ${state.fps}`;
        }
        if (elements.showParticleCount.checked) {
            elements.particleCountOverlay.textContent = `Частиц: ${state.particles.length}`;
        }
    }

    // ========== LOCAL STORAGE ==========
    const STORAGE_KEY = "texticles-settings";
    const controls = document.querySelectorAll("input, textarea, select");

    function saveSettings() {
        const data = {};
        controls.forEach(el => {
            const id = el.id;
            if (!id) return;
            data[id] = el.type === "checkbox" ? el.checked : el.value;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

        const themeSelect = document.getElementById("themeSelect");
        if (themeSelect) {
            document.body.dataset.theme = themeSelect.value;
        }
        updateOverlayControls();
    }

    function restoreSettings() {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        controls.forEach(el => {
            const id = el.id;
            if (!id || savedData[id] === undefined) return;
            if (el.type === "checkbox") {
                el.checked = savedData[id];
            } else {
                el.value = savedData[id];
            }
            if (id === "themeSelect") {
                document.body.dataset.theme = el.value;
            }
        });
        updateOverlayControls();
    }

    window.addEventListener("DOMContentLoaded", restoreSettings);
    controls.forEach(el => {
        el.addEventListener("input", saveSettings);
        el.addEventListener("change", saveSettings);
    });

    window.resetSettings = () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    };

    // ========== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==========
    function init() {
        for (let i = 0; i < 800; i++) {
            state.particles.push(createParticle(true));
        }

        initSliders();
        initPresets();
        initEventListeners();
        updateEmojiPreview();

        resize();
        setTimeout(() => {
            rebuildText();
            scatterParticles();
            requestAnimationFrame(tick);
        }, 100);
        updateOverlayControls();
    }

    init();
})();