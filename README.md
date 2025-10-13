# ✨ Texticles

**Texticles** is an interactive, real-time particle system that transforms text and emoji into stunning animated particles. With advanced customization options, multiple themes, and smooth performance, create beautiful visual experiences directly in your browser.

---

## 🌟 Features

### 🎨 **Visual & Customization**
- **Interactive Text/Emoji Particles** - Transform any text or emoji into animated particles
- **12 Beautiful Themes** - Aurora Light, Cyberpunk, Neon Dark, GitHub Dark, and more
- **11 Color Modes** - Emoji colors, Fire, Ice, Neon, Galaxy, Ocean, and others
- **Custom Particle Settings** - Adjust size, density, speed, and interaction strength
- **Real-time Mouse Interactions** - 8 interaction modes including repel, attract, swirl, gravity, and neural networks

### ⚡ **Performance & UX**
- **High-Performance Rendering** - Optimized for up to 25,000
- **Responsive Design** - Works perfectly on desktop with adaptive layouts
- **Fullscreen Mode** - Immersive experience with hotkey support (F key)
- **Multi-language Support** - 9 languages including English, Russian, Spanish, German, and more
- **Smart Preloader** - Engaging loading experience with progress animation

### 🎯 **Advanced Features**
- **12 Ready-made Presets** - Quick setups for different visual effects
- **Custom Cursor** - Themed cursor that enhances interaction
- **Live Statistics** - Real-time FPS and particle count display
- **Local Storage** - Saves your settings and preferences automatically
- **Mobile-Optimized** - Graceful fallback for touch devices

---

## 🚀 Live Demo

**Experience Texticles live:** [https://abesanets.github.io/Texticles/](https://abesanets.github.io/Texticles/)

---

## 🛠 Installation & Setup

### Quick Start
```bash
git clone https://github.com/abesanets/Texticles.git
cd Texticles
```
Open `index.html` in your browser - no build steps or dependencies required!

### File Structure
```
Texticles/
├── index.html          # Main application
├── style.css           # Optimized styles with 12 themes
├── script.js           # Core particle engine
├── translations/       # Multi-language support
│   ├── en.json        # English
│   ├── ru.json        # Russian
│   └── ...            # 7 other languages
└── favicon.ico        # App icon
```

---

## 💡 How to Use

### Basic Usage
1. **Enter Text/Emoji** - Type in the input field or paste emojis (Win+. to open emoji picker)
2. **Apply Changes** - Click "Apply" to generate particle text
3. **Interact** - Move your mouse to see particles react in real-time
4. **Shuffle** - Click "Shuffle" to scatter particles and watch them reform

### Advanced Customization
- **🎨 Themes** - Choose from 12 visually distinct themes
- **🖱️ Interaction Modes** - Select from 8 different mouse behaviors
- **🌈 Color Modes** - Pick from 11 color rendering styles
- **⚙️ Presets** - Use pre-configured settings for instant effects
- **📊 Display** - Toggle FPS and particle count overlays

### Quick Presets
- **⏩ Super Performance** - Optimized for smooth rendering
- **💥 Chaos** - High energy, fast-moving particles
- **🧘 Zen Garden** - Calm, slow, meditative movement
- **🚀 Hyperspeed Vortex** - Ultra-fast swirling effects
- **🪐 Giant Planets** - Large particles with gravitational pull

---

## 🔧 Technical Details

### How It Works
1. **Text Rendering** - Text/emoji is drawn on an offscreen canvas
2. **Pixel Analysis** - Canvas pixel data is analyzed to create target positions
3. **Particle System** - Particles are generated and move toward target positions
4. **Physics Engine** - Real-time physics with velocity, acceleration, and smoothing
5. **Interaction Handling** - Mouse movements apply forces to nearby particles
6. **Rendering Loop** - Optimized 60 FPS render cycle with performance scaling

### Performance Optimizations
- **Smart Particle Limits** - Automatic scaling based on device capability
- **Efficient Rendering** - Canvas-based rendering with hardware acceleration
- **Debounced Resize** - Optimized window resize handling
- **Memory Management** - Efficient particle array management
- **Reduced Motion Support** - Respects user accessibility preferences

### Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 🎨 Customization Guide

### Adding New Themes
```css
[data-theme="your-theme"] {
    --bg1: #your-color;
    --bg2: #your-color;
    --accent: #your-color;
    --fg: #your-color;
    /* ... other variables */
}
```

### Creating Custom Presets
Add new preset buttons in HTML:
```html
<button class="preset-btn" data-density="5" data-size="4" data-speed="2" data-interaction="3">
    <span data-i18n="preset_your_preset">Your Preset</span>
</button>
```

### Adding Languages
1. Create new translation file in `translations/` folder
2. Add language option to language selector
3. Update all translation keys in the JSON file

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues
- 🐛 **Bug Reports** - Use GitHub Issues with detailed descriptions
- 💡 **Feature Requests** - Suggest new themes, interactions, or features
- 📚 **Documentation** - Help improve documentation and translations

### Development
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution
- New color modes and interaction types
- Additional language translations
- Performance optimizations
- New particle behaviors and physics
- Mobile touch interaction support

---

## 📜 License

### Usage Rights
- **Personal Use** ✅ Allowed for non-commercial projects
- **Educational Use** ✅ Encouraged for learning and teaching
- **Commercial Use** ❌ Requires explicit permission from the author

### Contact for Licensing
For commercial use, integration, or licensing inquiries, please contact the author directly.

---

## 🏗️ Tech Stack

<p align="left">
  <img src="https://skillicons.dev/icons?i=html,css,js" alt="Tech Stack" />
</p>

- **Vanilla JavaScript** - No frameworks, pure performance
- **HTML5 Canvas** - High-performance 2D rendering
- **CSS3** - Modern styling with CSS variables and animations
- **Local Storage** - Client-side settings persistence

---

## 📞 Support & Community

- **GitHub Issues** - For bugs and feature requests
- **Live Demo** - Test the latest features
- **Star the Repo** - Show your support for the project

---

## 🎉 Acknowledgments

Built with passion by **abesanets** - creating interactive visual experiences that blend art and technology.

**⭐ If you like Texticles, please give it a star on GitHub!**