/**
 * This is a Boids simulation, based on Daniel Shiffman's CodingTrain video: https://www.youtube.com/watch?v=mhjuuHl6qHM
 * 
 * It uses:
 *   Pixi.js for rendering (WebGL)
 *   пдьфек.js for vector calculation
 *   random.js is small random generation by me 
 *   space_subdiv.js is a basic space subdivision library by me
 */

// Global variables - START ====
let DEBUG = false;
let ACCURATE = false; // If this is `false` then we are using `maxNearCount` to reduce calculation.

const width = window.innerWidth;
const height = window.innerHeight;
const flock = [];
const flockPool = [];
// Agent count (doubled to 5000 for more boids)
let count = 3000;
const maxCount = 10000;
// Maximum number which is used for one agent to steer to.
const maxFlockCount = 3;

// Also good for speed up things, if we reduce the radius
const perceptionRadius = 5;
const maxForce = 0.2;
const maxSpeed = 2.5;

let alignSlider, cohesionSlider, separationSlider;
let alignValue, cohesionValue, separationValue;

// Add mouse position tracking
const mouse = vec2.create();
const mouseRadius = 100;
const mouseForce = 2000;
let isMouseInCanvas = false;

/**
 * Basic space subdivision - it is helpful above ~500 agent at the start when they are evenly distributed.
 * The 3rd parameter is important to use the right size buckets. So, 9 buckets will have every near agent.
 */
const subdiv = new SubDiv(width, height, perceptionRadius);
// Global variables - END =====

function random(min = 0, max = 1) {
	return Math.random() * max + min;
}


// Create a Pixi Application (background transparent to show CSS gradient)
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    antialias: true,
    transparent: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});
// Limit ticker to 60 FPS to avoid super-high refresh rates
app.ticker.maxFPS = 60;

//Add the canvas that Pixi automatically created for you to the HTML document
// Add the canvas to the HTML document
document.body.appendChild(app.view);
// Pre-generate boid texture as a white triangle arrow and set up optimized container
const gfx = new PIXI.Graphics();
gfx.beginFill(0xffffff);
// Draw a small circle for each boid (2px radius)
gfx.drawCircle(0, 0, 2);
gfx.endFill();
const boidTex = app.renderer.generateTexture(gfx);

const boidContainer = new PIXI.ParticleContainer(maxCount, {
  position: true,
  rotation: true,
  tint:     true,
});
app.stage.addChild(boidContainer);
// Redirect stage child management to boid container for performance
app.stage.addChild = boidContainer.addChild.bind(boidContainer);
app.stage.removeChild = boidContainer.removeChild.bind(boidContainer);

for (let i = 0; i < maxCount; i++) {
	flockPool.push(new Agent());
}

updateCount(count);
// Sample (or re-sample) points from SVG path for boid attractor
const svgAttractorEl = document.getElementById('attractorPath');
if (svgAttractorEl) {
    // store global settings
    window.attractorStrength = window.attractorStrength || 0.05;
    window.attractorDeadZone = window.attractorDeadZone || 30;
    window.attractorSampleCount = window.attractorSampleCount || 100;

    // function to (re)compute attractorPoints
    function updateAttractor() {
        const totalLen = svgAttractorEl.getTotalLength();
        const n = window.attractorSampleCount;
        const pts = [];
        for (let i = 0; i < n; i++) {
            const pt = svgAttractorEl.getPointAtLength((i / n) * totalLen);
            pts.push([pt.x, pt.y]);
        }
        window.attractorPoints = pts;
    }
    // initial sampling
    updateAttractor();
    // watch for attribute changes (e.g. r, cx, cy) to resample
    const mo = new MutationObserver(muts => {
        for (let m of muts) {
            if (['r','cx','cy'].includes(m.attributeName)) {
                updateAttractor();
                break;
            }
        }
    });
    mo.observe(svgAttractorEl, { attributes: true });
    // also resample on window resize (in case percentages change)
    window.addEventListener('resize', updateAttractor);
    // hook up UI sliders to adjust parameters dynamically
    const radiusSlider = document.getElementById('attractorRadius');
    const radiusValueEl = document.getElementById('radiusValue');
    if (radiusSlider) {
        radiusSlider.addEventListener('input', () => {
            const v = radiusSlider.value;
            svgAttractorEl.setAttribute('r', v + '%');
            if (radiusValueEl) radiusValueEl.textContent = v + '%';
        });
    }
}

// Fixed values for sliders since UI elements were removed for performance
const aSliderValue = 1;     // Alignment
const sSliderValue = 1.3;   // Separation 
const cSliderValue = 0.8;   // Cohesion

// UI - start =========
// UI has been removed for performance optimization
// UI - end ==========

// Add mouse move listener
app.view.addEventListener('mousemove', (e) => {
	const rect = app.view.getBoundingClientRect();
	vec2.set(mouse, e.clientX - rect.left, e.clientY - rect.top);
	isMouseInCanvas = true;
});

app.view.addEventListener('mouseleave', () => {
	isMouseInCanvas = false;
});

app.ticker.add(delta => gameLoop(delta));

function dispaySliderValue(slider, val) {
	val.innerHTML = slider.value;

	// update all values
	aSliderValue = parseFloat(alignSlider.value);
	sSliderValue = parseFloat(separationSlider.value);
	cSliderValue = parseFloat(cohesionSlider.value);
}

function updateCount(c) {
	if (c === flock.length) return;

	count = c;

	if (flock.length < count) {
		while (flock.length < count) {
			app.stage.addChild(flockPool[flock.length].shape);
			flock.push(flockPool[flock.length]);
		}
	} else {
		while (flock.length > count) {
			app.stage.removeChild(flock.pop().shape);
		}
	}
}

const deltaVec = vec2.create();

function gameLoop(delta) {
	// Normalize delta to ensure consistent animation speed
	vec2.set(deltaVec, delta / 60, delta / 60);
	
	// Update each agent in the flock
	for (let i = 0; i < flock.length; i++) {
		flock[i].update(deltaVec);
	}

	// DEBUG visualization (only when enabled)
	if (DEBUG) {
		subdiv.debugGrid();
		subdiv.getNearItems(flock[0], true);
	}
}
