# 🧬 WebGPU Self-Replicating Programs

This project is a WebGPU implementation of "_Computational Life: How Well-formed, Self-replicating Programs Emerge from Simple Interaction_" by Google researchers Blaise Agüera y Arcas et al. ([📄 arXiv 2406.19108](https://arxiv.org/pdf/2406.19108)). The original study explores how initial chaos and simple rules can lead to the emergence of self-replicating structures—this implementation brings it to the browser.

## ✨ Features

- WebGPU Integration: Both the renderer and the simulation logic run on WebGPU. Each program is executed in parallel, so it runs smoothly in modern web browsers.​
- Animated Visualization: Real-time graphical representation of the tape, showing how programs evolve and undergo natural selection.

## 🧐 Getting Started

### Prerequisites

- A modern WebGPU-compatible browser (latest Chrome, Edge, or Safari).
- Node.js & NPM (for local development).

### Running the Simulation

1.  Clone the Repository:

    `git clone https://github.com/Ebernn/webgpu-self-replicating-programs.git`

2.  Install dependencies: `npm install`
3.  Start the local server: `npm run start`
4.  Visit `http://localhost:3000/` in your browser

## 🤝 Contributing

Contributions are welcome! If you find a bug or have an improvement, feel free to open an issue or submit a pull request. I'm still learning WebGPU! 🎓

## ⚖️ License

MIT – Do whatever you want. But if your self-replicating programs evolve into sentient AI, that’s on you 😂

🔬 Shoutout to the authors of the paper for the cool experiment!
