# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm run dev` - Start development server with Vite
- `npm run build` - Build project for production
- `npm run preview` - Preview production build
- For boids-pixi: `cd boids-pixi && npm run start`

## Code Style Guidelines
- Indentation: 4 spaces
- Semicolons: required
- Quotes: single quotes preferred
- Classes: PascalCase (Agent, Particle)
- Methods/Variables: camelCase (getPosition, maxSpeed)
- Constants: UPPER_CASE (DEBUG, ACCURATE)

## Architecture
- Class-based with ES6 syntax
- Use vector objects for positions/velocities
- Optimize performance with space subdivision
- Reuse vectors to reduce garbage collection (static tmpVec)
- Error handling: Check edge cases (division by zero)
- Comments: JSDoc for classes, inline for complex logic

## Project Structure
- Multiple simulation implementations (Pixi.js, Three.js)
- Main code in js/ and src/js/ directories
- Modular files with single responsibility