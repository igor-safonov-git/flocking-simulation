# Flocking Simulation

A WebGL-based flocking simulation using Pixi.js, implementing Craig Reynolds' Boids algorithm. The simulation features dynamic particle behavior with speed-based coloring and mouse interaction.

## Features
- WebGL rendering with Pixi.js for high performance
- Dynamic particle behavior (separation, alignment, cohesion)
- Speed-based particle coloring
- Mouse avoidance interaction
- Adjustable simulation parameters via UI controls
- Space subdivision for optimized neighbor detection

## Live Demo
[View Demo](https://igorsafonov.github.io/three-rapier-simulation/)

## Setup
1. Clone the repository
2. Open `index.html` in a web browser
3. Use the sliders to adjust:
   - Alignment: How much boids align with neighbors
   - Cohesion: How much boids move toward center of mass
   - Separation: How much boids avoid each other
   - Agent Count: Number of particles in simulation

## Controls
- Mouse interaction: Particles will avoid mouse cursor
- Debug checkbox: Shows perception radius for first particle
- Accurate checkbox: Enables more precise but slower calculations 