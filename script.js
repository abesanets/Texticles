(() => {
    // ========== CONFIGURATION AND INITIALIZATION ==========
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

    // ========== DOM ELEMENTS ==========
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

    // Error display system
    const errorDisplay = document.createElement('div');
    errorDisplay.id = 'errorDisplay';
    document.body.appendChild(errorDisplay);

    function showError(message) {
        console.error(message);
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';

        requestAnimationFrame(() => errorDisplay.classList.add('visible'));
        errorDisplay.classList.remove('shake');
        void errorDisplay.offsetWidth;
        errorDisplay.classList.add('shake');

        setTimeout(() => {
            errorDisplay.classList.remove('visible');
            setTimeout(() => errorDisplay.style.display = 'none', 400);
        }, 5000);
    }

    // Early validation
    if (!elements.canvas) {
        showError('Canvas element not found!');
        return;
    }

    const ctx = elements.canvas.getContext('2d', { alpha: true });
    if (!ctx) {
        showError('Failed to get 2D context!');
        return;
    }

    // Offscreen canvas for text rendering
    const offscreen = {
        canvas: document.createElement('canvas'),
        ctx: null
    };
    offscreen.ctx = offscreen.canvas.getContext('2d', { willReadFrequently: true });

    // ========== APPLICATION STATE ==========
    const state = {
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

    // ========== FULLSCREEN MANAGER ==========
    const FullscreenManager = {
        isActive() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement ||
                document.msFullscreenElement || state.isManualFullscreen);
        },
        
        enter() {
            try {
                const el = elements.wrap;
                if (el.requestFullscreen) el.requestFullscreen();
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
                else if (el.msRequestFullscreen) el.msRequestFullscreen();
                else {
                    document.body.setAttribute('data-fullscreen', 'true');
                    state.isManualFullscreen = true;
                    this.handleResize();
                }
            } catch (err) {
                showError(`Fullscreen error: ${err.message}`);
            }
        },
        
        exit() {
            try {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                else if (document.msExitFullscreen) document.msExitFullscreen();
                else {
                    document.body.removeAttribute('data-fullscreen');
                    state.isManualFullscreen = false;
                    this.handleResize();
                }
            } catch (err) {
                showError(`Fullscreen error: ${err.message}`);
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

    // ========== PRELOADER SYSTEM ==========
    const LOADING_CONFIG = {
        initialDelay: 500,
        pauseProbability: 0.3,
        pauseDuration: { min: 200, max: 800 },
        progressStep: { min: 2.5, max: 7 },
        updateInterval: { min: 10, max: 50 },
        textChangePoints: [25, 55, 80]
    };

    let currentTextIndex = 0;
    let progress = 0;
    let skipRequested = false;
    let timeoutId = null;

    function initPreloader() {
        const preloader = document.getElementById('preloader');
        const progressBar = document.querySelector('.progress-bar');
        const textItems = document.querySelectorAll('.text-item');
        const mainContent = document.querySelector('.main-content');

        if (!preloader || !progressBar || textItems.length === 0 || !mainContent) {
            showError('Preloader elements not found');
            return;
        }

        function updateProgress() {
            if (skipRequested) {
                progress = 100;
                progressBar.style.width = progress + '%';
                completeLoading();
                return;
            }

            if (Math.random() < LOADING_CONFIG.pauseProbability) {
                const pauseTime = Math.random() *
                    (LOADING_CONFIG.pauseDuration.max - LOADING_CONFIG.pauseDuration.min) +
                    LOADING_CONFIG.pauseDuration.min;

                timeoutId = setTimeout(updateProgress, pauseTime);
                return;
            }

            const increment = Math.random() *
                (LOADING_CONFIG.progressStep.max - LOADING_CONFIG.progressStep.min) +
                LOADING_CONFIG.progressStep.min;

            progress = Math.min(100, progress + increment);
            progressBar.style.width = progress + '%';

            // Text changes
            if (progress >= LOADING_CONFIG.textChangePoints[0] && currentTextIndex === 0) {
                changeText(1);
            } else if (progress >= LOADING_CONFIG.textChangePoints[1] && currentTextIndex === 1) {
                changeText(2);
            } else if (progress >= LOADING_CONFIG.textChangePoints[2] && currentTextIndex === 2) {
                changeText(3);
            }

            if (progress >= 100) {
                completeLoading();
                return;
            }

            const nextUpdate = Math.random() *
                (LOADING_CONFIG.updateInterval.max - LOADING_CONFIG.updateInterval.min) +
                LOADING_CONFIG.updateInterval.min;

            timeoutId = setTimeout(updateProgress, nextUpdate);
        }

        function changeText(index) {
            if (index < textItems.length) {
                textItems[currentTextIndex].classList.add('leaving');
                setTimeout(() => {
                    textItems[currentTextIndex].classList.remove('active', 'leaving');
                    currentTextIndex = index;
                    textItems[currentTextIndex].classList.add('active');
                }, 500);
            }
        }

        function completeLoading() {
            clearTimeout(timeoutId);
            
            if (currentTextIndex !== 3) {
                changeText(3);
            }

            setTimeout(() => {
                preloader.style.opacity = '0';
                preloader.style.visibility = 'hidden';
                mainContent.classList.add('loaded');
            }, 500);
        }

        timeoutId = setTimeout(updateProgress, LOADING_CONFIG.initialDelay);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !skipRequested) {
                skipRequested = true;
                clearTimeout(timeoutId);
                updateProgress();
            }
        });
    }

    // ========== SLIDERS AND PRESETS ==========
    function initSliders() {
        const sliders = [elements.density, elements.size, elements.speed, elements.interaction];
        sliders.forEach(slider => {
            slider?.addEventListener('input', updateSliderValues);
        });
        updateSliderValues();
    }

    function updateSliderValues() {
        elements.densityValue.textContent = elements.density.value;
        elements.sizeValue.textContent = elements.size.value;
        elements.speedValue.textContent = elements.speed.value;
        elements.interactionValue.textContent = elements.interaction.value;
    }

    function initPresets() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.density.value = btn.dataset.density;
                elements.size.value = btn.dataset.size;
                elements.speed.value = btn.dataset.speed;
                elements.interaction.value = btn.dataset.interaction;
                
                [elements.density, elements.size, elements.speed, elements.interaction].forEach(slider => {
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
        });
    }

    // ========== EMOJI AND TEXT MANAGEMENT ==========
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

    // ========== RESIZE MANAGEMENT ==========
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

    // ========== PARTICLE SYSTEM ==========
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
            energy: 0,
            neural: false,
            neuralConnections: [],
            symmetry: false,
            chaos: false
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

    // ========== TEXT RENDERING AND COLORS ==========
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
        const gap = 3;

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

    // ========== CORE APPLICATION LOGIC ==========
    function rebuildText() {
        const text = '  ' + (elements.txt.value || '') + '  ';
        state.targetPoints = buildTextPixels(text);

        const density = parseFloat(elements.density.value);
        const desiredCount = Math.min(
            CONFIG.MAX_PARTICLES,
            Math.max(100, Math.floor(state.targetPoints.length * density / 5))
        );

        // Optimized particle array management
        const currentCount = state.particles.length;
        if (currentCount < desiredCount) {
            for (let i = 0; i < desiredCount - currentCount; i++) {
                state.particles.push(createParticle(true));
            }
        } else if (currentCount > desiredCount) {
            state.particles.length = desiredCount;
        }

        const emojiColors = elements.colorMode.value === 'emoji' ? buildEmojiColorMap(text) : new Map();
        distributeParticles(emojiColors);

        updateParticleCountDisplay();
    }

    function distributeParticles(emojiColors) {
        const pointCount = state.targetPoints.length;
        const isEmoji = elements.colorMode.value === 'emoji';

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

    // ========== ANIMATION AND RENDERING ==========
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
            handler?.(p, force, mdx, mdy, mdist, mouseX, mouseY);
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

    // ========== EVENT HANDLERS ==========
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
        // Mouse events
        elements.canvas.addEventListener('mousemove', handleMouseMove);
        elements.canvas.addEventListener('mouseleave', () => {
            state.mouse.x = state.mouse.y = -9999;
            state.mouse.vx = state.mouse.vy = 0;
        });

        // Custom cursor
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

        // Resize
        window.addEventListener('resize', () => {
            clearTimeout(state.resizeTimeout);
            state.resizeTimeout = setTimeout(resize, CONFIG.RESIZE_DELAY);
        });

        // Controls
        elements.apply.addEventListener('click', () => setText(elements.txt.value || ''));
        elements.shuffle.addEventListener('click', scatterParticles);
        elements.themeSelect.addEventListener('change', () => {
            document.body.setAttribute('data-theme', elements.themeSelect.value);
            updateOverlayControls();
        });

        // Particle size
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

        // Hotkeys
        document.addEventListener('keydown', e => {
            const active = document.activeElement;
            const isTyping = active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.tagName === "SELECT");
            if (!isTyping && e.code === "KeyF") {
                e.preventDefault();
                FullscreenManager.toggle();
            }
        });

        // Fullscreen events
        ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(event => {
            document.addEventListener(event, () => FullscreenManager.handleChange());
        });

        // Overlays
        elements.showFps.addEventListener('change', updateOverlayControls);
        elements.showParticleCount.addEventListener('change', updateOverlayControls);

        // Dynamic parameters
        elements.txt.addEventListener('input', updateEmojiPreview);
        elements.density.addEventListener('input', rebuildText);
        elements.colorMode.addEventListener('change', rebuildText);
    }

    // ========== OVERLAY CONTROLS ==========
    function updateParticleCountDisplay() {
        const count = state.particles.length;
        const particleLabel = translations["overlay.particles"] || "Particles";
        elements.particleCount.textContent = `${particleLabel}: ${count}`;
        if (elements.showParticleCount.checked) {
            elements.particleCountOverlay.textContent = `${particleLabel}: ${count}`;
        }
    }

    function updateOverlayControls() {
        elements.fpsOverlay.classList.toggle('hidden', !elements.showFps.checked);
        elements.particleCountOverlay.classList.toggle('hidden', !elements.showParticleCount.checked);

        const fpsLabel = translations["overlay.fps"] || "FPS";
        const particleLabel = translations["overlay.particles"] || "Particles";

        if (elements.showFps.checked) {
            elements.fpsOverlay.textContent = `${fpsLabel}: ${state.fps}`;
        }
        if (elements.showParticleCount.checked) {
            elements.particleCountOverlay.textContent = `${particleLabel}: ${state.particles.length}`;
        }
    }

    // ========== MULTILANGUAGE SYSTEM ==========
    const LANGUAGE_STORAGE_KEY = "texticles-language";
    let currentLanguage = 'en';
    let translations = {};

    async function loadTranslations(lang) {
        try {
            const response = await fetch(`translations/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            translations = await response.json();
            applyTranslations();
        } catch (error) {
            showError(`Translation error: ${error.message}`);
        }
    }

    function applyTranslations() {
        const elementsList = document.querySelectorAll('[data-i18n]');
        elementsList.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = translations[key];
            if (!text) return;

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = text;
            } else if (element.tagName === 'OPTION') {
                element.textContent = text;
            } else {
                element.innerHTML = text.includes('<') ? text : text;
            }
        });

        updateOverlayControls();
    }

    function initLanguage() {
        const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage) {
            currentLanguage = savedLanguage;
        }

        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = currentLanguage;
            languageSelect.addEventListener('change', (e) => {
                currentLanguage = e.target.value;
                localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
                loadTranslations(currentLanguage);
            });
        }

        loadTranslations(currentLanguage);
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
        const defaults = {
            density: 2,
            size: 8,
            speed: 0.15,
            interaction: 1.5,
            themeSelect: "minty-fresh",
        };
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        
        controls.forEach(el => {
            const id = el.id;
            if (!id) return;

            const value = savedData[id] !== undefined ? savedData[id] : defaults[id];

            if (el.type === "checkbox") {
                el.checked = value;
            } else if (value !== undefined) {
                el.value = value;
                const display = document.getElementById(id + "Value");
                if (display) display.textContent = value;
            }
            if (id === "themeSelect") {
                document.body.dataset.theme = el.value;
            }
        });
        updateOverlayControls();
    }

    // ========== APPLICATION INITIALIZATION ==========
    function init() {
        // Create initial particles
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

    // Start everything when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        initPreloader();
        restoreSettings();
        initLanguage();
        
        controls.forEach(el => {
            el.addEventListener("input", saveSettings);
            el.addEventListener("change", saveSettings);
        });
        
        init();
    });

    // Global function for resetting settings
    window.resetSettings = () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    };
})();