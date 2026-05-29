# Harsh's Portfolio

My 3D interactive portfolio built with React Three Fiber and Blender.

Visitors arrive in a room lost in a pocket dimension, navigate a CRT terminal
interface, and interact with objects in the scene to learn about me.

## Tech Stack

- Framework - React 18 + TypeScript
- 3D - React Three Fiber, Three.js
- 3D Helpers - @react-three/drei
- Animation - GSAP
- 3D Modelling - Blender
- Build - Vite

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

- src/views/ - HUD content panels (About, GitHub, Sketch, etc.)
- src/hooks/ - useTypewriter, useRoomTextures, useAudio
- src/Room.tsx - 3D scene: mesh refs, interactions, hover logic
- src/ThreeView.tsx - Canvas setup and camera intro animation
- src/ComputerHUD.tsx - CRT terminal shell
- src/LoadingScreen.tsx - Spatial anomaly loading sequence
- src/Smoke.tsx - Particle smoke effect
- src/Hologram.tsx - Sprite hologram icons
- src/Scene.tsx - Top-level state and view routing
- public/model/room.glb - Blender room export
- public/textures/ - Baked texture maps
- public/sketches/ - Sketch archive images
