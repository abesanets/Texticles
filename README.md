# ✨Texticles

**Texticles** is an interactive, real-time particle system that transforms text or emoji into animated particles. Customize your text, particle density, size, speed, and color modes to create stunning visual effects directly in your browser.

---

## 🌟 Features

- **Interactive Text / Emoji Particles** – Type any text or emoji and watch it animate into particles.  
- **Customizable Particle Settings** – Adjust size, speed, density, and mouse interaction modes.  
- **Multiple Color Modes** – Monochrome, rainbow, or emoji-based colors.  
- **Smooth Real-time Animation** – Optimized for high FPS performance.  
- **Responsive Design** – Works on any screen size, auto-resizing canvas.  
- **Emoji Mode** – Particles inherit colors from original emoji pixels for a vibrant effect.

---

## 🔗 Demo

Check out the live demo: [Texticles](https://abesanets.github.io/Texticles/)

---

## 🛠 Installation

Clone the repository:

```bash
git clone https://github.com/abesanets/Texticles.git
cd Texticles
```
Open index.html in your browser — no build steps required.


---

## ⚙️ Usage

1. Type text or paste emojis in the input field.  
2. Adjust **particle size**, **density**, and **speed** using sliders.  
3. Select **color mode** (monochrome, rainbow, emoji).  
4. Choose **mouse interaction mode** (repel, attract, swirl).  
5. Click **Apply** or **Shuffle** to refresh particle positions.

---

## 💡 How It Works

- Text or emoji is rendered **offscreen** on a canvas.  
- Pixel data is read to determine particle **target positions**.  
- Particles move smoothly towards targets while reacting to **mouse movements**.  
- In **emoji mode**, particles inherit colors from the original emoji pixels.  
- Dynamic updates: changing text or slider values instantly updates particles.

---

## 🛠 Tech Stack

<p align="left">
  <img src="https://skillicons.dev/icons?i=html,css,js" />
</p> 

- **Vanilla JavaScript** — lightweight, no frameworks.  
- **HTML5 Canvas** — high-performance rendering.  
- **CSS Variables** — for dynamic theming and styling.

---

## 🔧 Customization

- Add more emojis to the preview or default text.  
- Adjust **particle count limit** in `rebuildText()` for performance tuning.  
- Modify **color schemes** via CSS variables or directly in JS.  
- Extend **interaction modes** by updating the `tick()` function.

---

## 🤝 Contributing

Contributions are welcome!  

- Report bugs  
- Suggest new features  
- Submit pull requests  

Please follow standard GitHub workflow.

---

## 📜 License

Only non-commercial use allowed. For commercial use, contact author for license.
