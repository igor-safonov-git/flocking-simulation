import * as PIXI from 'pixi.js';

// Create and append canvas to document
const app = new PIXI.Application({
    background: '#000000',
    resizeTo: window,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
});

document.body.appendChild(app.view);

// Boid class
class Boid {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2
        };
        this.acceleration = { x: 0, y: 0 };
        this.maxSpeed = 4;
        this.maxForce = 0.1;
    }

    update(bounds) {
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        
        // Limit speed
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
        }

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Wrap around screen
        if (this.x < 0) this.x = bounds.width;
        if (this.x > bounds.width) this.x = 0;
        if (this.y < 0) this.y = bounds.height;
        if (this.y > bounds.height) this.y = 0;

        // Reset acceleration
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }

    applyForce(force) {
        this.acceleration.x += force.x;
        this.acceleration.y += force.y;
    }
}

// Flock class
class Flock {
    constructor() {
        this.boids = [];
    }

    addBoid(boid) {
        this.boids.push(boid);
    }

    update(bounds) {
        for (let boid of this.boids) {
            boid.update(bounds);
        }
    }
}

// Create flock
const flock = new Flock();
const numBoids = 100;

// Create boids
for (let i = 0; i < numBoids; i++) {
    const boid = new Boid(
        Math.random() * app.screen.width,
        Math.random() * app.screen.height
    );
    flock.addBoid(boid);
}

// Animation loop
app.ticker.add(() => {
    flock.update(app.screen);
    
    // Clear previous frame
    app.stage.removeChildren();
    
    // Draw boids
    for (let boid of flock.boids) {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFFFFF);
        graphics.drawCircle(0, 0, 2);
        graphics.endFill();
        
        graphics.x = boid.x;
        graphics.y = boid.y;
        
        app.stage.addChild(graphics);
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
}); 