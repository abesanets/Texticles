(() => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d', { alpha: true });
    const wrap = document.getElementById('stage');
    const fsBtn = document.getElementById('fullscreenBtn'); // кнопка, которую добавили в HTML
    let isManualFullscreen = false; // флаг для состояния


    // Оптимизация: ограничиваем DPR для производительности
    let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let center = { x: 0, y: 0 };

    // Элементы управления
    const elements = {
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

    // Обновление значений слайдеров
    function updateSliderValues() {
        elements.densityValue.textContent = elements.density.value;
        elements.sizeValue.textContent = elements.size.value;
        elements.speedValue.textContent = elements.speed.value;
        elements.interactionValue.textContent = elements.interactionStrength.value;
    }

    // Инициализация слайдеров
    [elements.density, elements.size, elements.speed, elements.interactionStrength].forEach(slider => {
        slider.addEventListener('input', updateSliderValues);
    });
    updateSliderValues();

    // Предпросмотр эмодзи
    function updateEmojiPreview() {
        const text = elements.txt.value;
        const emojis = text.match(/\p{Emoji}/gu) || [];
        elements.emojiPreview.textContent = emojis.slice(0, 10).join(' ') + (emojis.length > 10 ? '...' : '');
    }
    elements.txt.addEventListener('input', updateEmojiPreview);
    updateEmojiPreview();

    function resize() {
        // Если в полноэкранном через API, используем innerWidth/innerHeight
        const isFSapi = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
        const isBodyFlag = document.body.getAttribute('data-fullscreen') === 'true';
        if (isFSapi || isBodyFlag) {
            W = window.innerWidth;
            H = window.innerHeight;
        } else {
            W = wrap.clientWidth;
            H = wrap.clientHeight;
        }

        canvas.width = Math.max(1, Math.floor(W * DPR));
        canvas.height = Math.max(1, Math.floor(H * DPR));
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        center = { x: W / 2, y: H / 2 };
        rebuildText();
    }


    function enterFullscreen() {
        // Попытка использовать Fullscreen API
        const el = wrap; // сделаем fullscreen для обёртки stage
        if (el.requestFullscreen) {
            el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        } else {
            // fallback: просто ставим body-флаг и фиксируем размеры
            document.body.setAttribute('data-fullscreen', 'true');
            isManualFullscreen = true;
            resize(); // принудительный ресайз
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else {
            document.body.removeAttribute('data-fullscreen');
            isManualFullscreen = false;
            resize();
        }
    }

    function toggleFullscreen() {
        if (document.fullscreenElement || isManualFullscreen) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }

    function onFullscreenChange() {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        if (fsEl) {
            // вошли в fullscreen через браузер API
            document.body.setAttribute('data-fullscreen', 'true');
            isManualFullscreen = false;
        } else {
            document.body.removeAttribute('data-fullscreen');
            isManualFullscreen = false;
        }
        // При выходе/входе пересчёт размеров
        setTimeout(resize, 60); // небольшой тайм-аут, чтобы браузер успел изменить layout
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('msfullscreenchange', onFullscreenChange);

    if (fsBtn) {
        fsBtn.addEventListener('click', toggleFullscreen);
    }

    // --- Поддержка клавиши F для входа/выхода из полноэкранного режима ---
    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "f") {
            e.preventDefault();
            toggleFullscreen();
        }
    });

function updateFullscreenClass() {
    const wrap = document.getElementById('stage');
    if (document.fullscreenElement || isManualFullscreen) {
        wrap.classList.add('fullscreen');
    } else {
        wrap.classList.remove('fullscreen');
    }
}

// Вешаем на изменения fullscreen
document.addEventListener('fullscreenchange', updateFullscreenClass);
document.addEventListener('webkitfullscreenchange', updateFullscreenClass);
document.addEventListener('msfullscreenchange', updateFullscreenClass);

// Также вызываем при переключении через кнопку или F
updateFullscreenClass();


    // Оптимизация: троттлинг ресайза
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 100);
    });

    elements.apply.addEventListener('click', () => setText(elements.txt.value || ''));
    elements.shuffle.addEventListener('click', scatterParticles);
    elements.themeSelect.addEventListener('change', () => {
        document.body.setAttribute('data-theme', elements.themeSelect.value);
    });
    // Обновляем размеры всех частиц при движении ползунка
    elements.size.addEventListener('input', () => {
        const newSize = parseFloat(elements.size.value);

        for (let i = 0; i < particles.length; i++) {
            particles[i].baseSize = newSize; // обновляем "базовый" размер
            particles[i].size = newSize;     // сразу применяем для рендера
        }

        updateSliderValues();
    });


    // Оффскрин canvas для рендеринга текста
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d');

    let targetPoints = [];
    let particles = [];
    let mouse = { x: -9999, y: -9999, vx: 0, vy: 0, px: -9999, py: -9999 };

    // Оптимизация: троттлинг мыши и расчет скорости мыши
    let mouseUpdateScheduled = false;
    canvas.addEventListener('mousemove', e => {
        if (!mouseUpdateScheduled) {
            mouseUpdateScheduled = true;
            requestAnimationFrame(() => {
                const r = canvas.getBoundingClientRect();
                mouse.px = mouse.x;
                mouse.py = mouse.y;
                mouse.x = e.clientX - r.left;
                mouse.y = e.clientY - r.top;

                // Расчет скорости мыши для эффектов
                if (mouse.px > -9990) {
                    mouse.vx = (mouse.x - mouse.px) * 0.5;
                    mouse.vy = (mouse.y - mouse.py) * 0.5;
                }

                mouseUpdateScheduled = false;
            });
        }
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
        mouse.vx = 0;
        mouse.vy = 0;
    });

    // ИСПРАВЛЕННАЯ ФУНКЦИЯ: построение карты цветов эмодзи
    function buildEmojiColorMap(text) {
        const lines = text.split(/\n+/).filter(l => l.trim().length);
        if (lines.length === 0) return new Map();

        const fontSize = Math.min(W / Math.max(...lines.map(l => l.length)) * 2, H / (lines.length * 0.7));

        // Используем те же размеры, что и в buildTextPixels
        off.width = Math.max(400, Math.floor(W * 0.95));
        off.height = Math.max(200, Math.floor(H * 0.85));

        offCtx.clearRect(0, 0, off.width, off.height);
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, off.width, off.height);

        // Важно: используем тот же шрифт и настройки
        offCtx.font = `bold ${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, Arial`;
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';

        const totalHeight = fontSize * lines.length * 0.9;
        const startY = off.height / 2 - totalHeight / 2 + fontSize / 2;

        // Рисуем текст
        lines.forEach((line, i) => {
            offCtx.fillText(line, off.width / 2, startY + i * fontSize * 0.9);
        });

        const imageData = offCtx.getImageData(0, 0, off.width, off.height);
        const colorMap = new Map();

        // Собираем цвета всех непрозрачных пикселей
        for (let y = 0; y < off.height; y++) {
            for (let x = 0; x < off.width; x++) {
                const idx = (y * off.width + x) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                const a = imageData.data[idx + 3];

                // Собираем только достаточно непрозрачные пиксели
                if (a > 50) {
                    const colorKey = `${x},${y}`;
                    const color = `rgb(${r},${g},${b})`;
                    colorMap.set(colorKey, color);
                }
            }
        }

        return colorMap;
    }

    function buildTextPixels(text) {
        const lines = text.split(/\n+/).filter(l => l.trim().length);
        if (!lines.length) return [];

        const fontSize = Math.min(W / Math.max(...lines.map(l => l.length)) * 2, H / (lines.length * 0.7));
        off.width = Math.max(400, Math.floor(W * 0.95));
        off.height = Math.max(200, Math.floor(H * 0.85));

        offCtx.clearRect(0, 0, off.width, off.height);
        offCtx.fillStyle = '#000000';
        offCtx.fillRect(0, 0, off.width, off.height);
        offCtx.fillStyle = '#ffffff';
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';
        offCtx.font = `bold ${fontSize}px system-ui, Arial`;

        const totalHeight = fontSize * lines.length * 0.9;
        const startY = off.height / 2 - totalHeight / 2 + fontSize / 2;

        lines.forEach((line, i) => {
            offCtx.fillText(line, off.width / 2, startY + i * fontSize * 0.9);
        });

        const img = offCtx.getImageData(0, 0, off.width, off.height).data;
        const points = [];
        const gap = 3;

        for (let y = 0; y < off.height; y += gap) {
            for (let x = 0; x < off.width; x += gap) {
                const idx = (y * off.width + x) * 4;
                if (img[idx] > 150) {
                    points.push({
                        x: (x - off.width / 2) + center.x,
                        y: (y - off.height / 2) + center.y
                    });
                }
            }
        }

        return points;
    }

    // ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ: перестроение текста
    function rebuildText() {
        let textik = elements.txt.value || '';
        // добавляем 2 пробела с каждой стороны
        textik = '  ' + textik + '  ';
        const text = textik;
        targetPoints = buildTextPixels(text);

        // Ограничение числа частиц для производительности
        const maxParticles = 15000;
        const density = parseFloat(elements.density.value);
        const desiredCount = Math.min(maxParticles, Math.max(100, Math.floor(targetPoints.length * density / 5)));

        // Создание или удаление частиц
        if (particles.length < desiredCount) {
            const needed = desiredCount - particles.length;
            for (let i = 0; i < needed; i++) {
                particles.push(createParticle(true));
            }
        } else if (particles.length > desiredCount) {
            particles.splice(0, particles.length - desiredCount);
        }

        // Только в режиме emoji строим карту цветов
        let emojiColors = new Map();
        if (elements.colorMode.value === 'emoji') {
            emojiColors = buildEmojiColorMap(text);
        }

        // Распределение частиц по тексту
        const pointCount = targetPoints.length;
        for (let i = 0; i < particles.length; i++) {
            const pt = targetPoints[Math.floor(Math.random() * pointCount)];
            particles[i].tx = pt.x;
            particles[i].ty = pt.y;

            // ИСПРАВЛЕНИЕ: правильное определение цвета для режима emoji
            if (elements.colorMode.value === 'emoji') {
                // Преобразуем координаты канваса обратно в координаты оффскрина
                const offX = Math.round(pt.x - center.x + off.width / 2);
                const offY = Math.round(pt.y - center.y + off.height / 2);
                const colorKey = `${offX},${offY}`;

                if (emojiColors.has(colorKey)) {
                    particles[i].color = emojiColors.get(colorKey);
                    particles[i].useCustomColor = true;
                } else {
                    // Если цвет не найден, используем случайный
                    particles[i].useCustomColor = false;
                    particles[i].hue = Math.random() * 360;
                }
            } else {
                particles[i].useCustomColor = false;
                particles[i].hue = Math.random() * 360;
            }
        }

        elements.particleCount.textContent = `Частиц: ${particles.length}`;
    }

    function createParticle(scattered = false) {
        const size = parseFloat(elements.size.value);
        return {
            x: center.x + (Math.random() - 0.5) * W * (scattered ? 1.6 : 0.1),
            y: center.y + (Math.random() - 0.5) * H * (scattered ? 1.6 : 0.1),
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            tx: center.x,
            ty: center.y,
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
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x = center.x + (Math.random() - 0.5) * W * 1.6;
            p.y = center.y + (Math.random() - 0.5) * H * 1.6;
            p.vx = (Math.random() - 0.5) * 6;
            p.vy = (Math.random() - 0.5) * 6;
            p.life = Math.random() * 100;
        }
    }

    function setText(txt) {
        elements.txt.value = txt;
        updateEmojiPreview();
        rebuildText();
    }

    // Инициализация частиц
    for (let i = 0; i < 800; i++) particles.push(createParticle(true));

    // Анимация и производительность
    let last = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = 0;
    let fps = 60;

    

    function tick(now) {
        const dt = Math.min(48, now - last) / 16.666;
        last = now;
        frameCount++;

        // Обновление FPS каждую секунду
        if (now - lastFpsUpdate >= 1000) {
            fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
            elements.fps.textContent = `FPS: ${fps}`;
            frameCount = 0;
            lastFpsUpdate = now;
        }

        ctx.clearRect(0, 0, W, H);

        const spd = parseFloat(elements.speed.value);
        const mMode = elements.mouseMode.value;
        const interactionStr = parseFloat(elements.interactionStrength.value);
        const colorMode = elements.colorMode.value;

        // Кэшируем цвета темы
        const color1 = getComputedStyle(document.body).getPropertyValue('--particle1').trim();
        const color2 = getComputedStyle(document.body).getPropertyValue('--particle2').trim();

        // Оптимизация: батчинг вычислений
        const mouseX = mouse.x, mouseY = mouse.y;
        const mouseRadius = 150;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dx = p.tx - p.x, dy = p.ty - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Плавное движение к цели
            const speedFactor = p.speed * spd * dt * (0.5 + dist / 200);
            p.vx += dx * 0.015 * speedFactor;
            p.vy += dy * 0.015 * speedFactor;

            // Взаимодействие с мышью
            if (mMode !== 'none' && mouseX > -9990) {
                const mdx = p.x - mouseX, mdy = p.y - mouseY;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

                if (mdist < mouseRadius) {
                    const push = (1 - mdist / mouseRadius);
                    const force = 4 * push * dt * interactionStr;

                    switch (mMode) {
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
                            // Добавляем небольшое притяжение к центру
                            p.vx -= mdx * 0.0005 * push;
                            p.vy -= mdy * 0.0005 * push;
                            break;
                    }
                }
            }

            // Сопротивление и обновление позиции
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.x += p.vx;
            p.y += p.vy;

            // Анимация размера и жизни
            p.life += dt;
            p.size = p.baseSize;

            // ИСПРАВЛЕННАЯ ЛОГИКА ВЫБОРА ЦВЕТА
            if (colorMode === 'emoji' && p.useCustomColor) {
                // Режим emoji: используем сохраненный цвет
                ctx.fillStyle = p.color;
            } else if (colorMode === 'monochrome') {
                // Монохромный режим: белый цвет
                ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
            } else {
                // Режим разброса цветов (по умолчанию)
                ctx.fillStyle = `hsl(${p.hue + i % 50} 100% 60% / 0.9)`;
            }

            // Рисуем частицу
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Рисуем хвосты реже для производительности
            if (i % 16 === 0 && Math.random() > 0.3) {
                ctx.strokeStyle = ctx.fillStyle.replace('0.9', '0.3');
                ctx.lineWidth = Math.max(0.3, p.size * 0.15);
                ctx.beginPath();
                ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        }

        requestAnimationFrame(tick);
    }
    // --- Горячая клавиша "F" для включения/выключения fullscreen ---
    document.addEventListener("keydown", (e) => {
        // Проверяем, чтобы фокус не был в полях ввода
        const active = document.activeElement;
        const isTyping = active && (
            active.tagName === "TEXTAREA" ||
            active.tagName === "INPUT" ||
            active.tagName === "SELECT"
        );

        // Используем e.code вместо e.key — сработает на любой раскладке
        if (!isTyping && e.code === "KeyF") {
            e.preventDefault();
            toggleFullscreen();
        }
    });


    // Чтобы кнопка не фокусировалась после клика (иначе Enter вызывал fullscreen)
    fsBtn.addEventListener("mousedown", (e) => e.preventDefault());
    fsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleFullscreen();
    });

    // Инициализация
    resize();
    setTimeout(() => {
        rebuildText();
        scatterParticles();
    }, 100);

    // Добавляем обработчики
    elements.density.addEventListener('input', rebuildText);
    elements.colorMode.addEventListener('change', rebuildText);

    requestAnimationFrame(tick);

})();
