/**
 * This is a Boids simulation, based on Daniel Shiffman's CodingTrain video: https://www.youtube.com/watch?v=mhjuuHl6qHM
 * 
 * It uses:
 *   Pixi.js for rendering (WebGL)
 *   Victor.js for vector calculation
 *   random.js is small random generation by me 
 *   space_subdiv.js is a basic space subdivision library by me
 */

// Global variables - START ====
let DEBUG = false;
let ACCURATE = false; // If this is `false` then we are using `maxNearCount` to reduce calculation.

const width = window.innerWidth - 24;
const height = 500;

const flock = [];
const flockPool = [];
// Agent count - now fixed since we removed the slider
const count = 1800;
const maxCount = 10000;
// Maximum number which is used for one agent to steer to.
const maxFlockCount = 300;

// Also good for speed up things, if we reduce the radius
const perceptionRadius = 40;
const maxForce = 0.3;
const maxSpeed = 5;

let alignSlider, cohesionSlider, separationSlider;
let alignValue, cohesionValue, separationValue;

// Add mouse position tracking
const mouse = new Victor(0, 0);
const mouseRadius = 200;
const mouseForce = 2;
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

//Create a Pixi Application
const app = new PIXI.Application({
	width: width,
	height: height,
	antialias: true,
	transparent: false,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
	backgroundColor: 0x18181A
});

//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);

for (let i = 0; i < maxCount; i++) {
	flockPool.push(new Agent());
}

updateCount(count);

let aSliderValue = 1;
let sSliderValue = 1.3;
let cSliderValue = 0.8;

// UI - start =========
createDiv('Alignment:', 'sliderLabel');
alignSlider = createSlider(0, 5, aSliderValue, 0.1, 'slider');
alignSlider.oninput = () => dispaySliderValue(alignSlider, alignValue);
alignValue = createDiv(aSliderValue, 'sliderValue');

createDiv('Cohesion:', 'sliderLabel');
cohesionSlider = createSlider(0, 5, cSliderValue, 0.1, 'slider');
cohesionSlider.oninput = () => dispaySliderValue(cohesionSlider, cohesionValue);
cohesionValue = createDiv(cSliderValue, 'sliderValue');

createDiv('Separation:', 'sliderLabel');
separationSlider = createSlider(0, 5, sSliderValue, 0.1, 'slider');
separationSlider.oninput = () => dispaySliderValue(separationSlider, separationValue);
separationValue = createDiv(sSliderValue, 'sliderValue');
// UI - end ==========

// Add mouse move listener
app.view.addEventListener('mousemove', (e) => {
	const rect = app.view.getBoundingClientRect();
	mouse.x = e.clientX - rect.left;
	mouse.y = e.clientY - rect.top;
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

	if (flock.length < c) {
		while (flock.length < c) {
			app.stage.addChild(flockPool[flock.length].shape);
			flock.push(flockPool[flock.length]);
		}
	} else {
		while (flock.length > c) {
			app.stage.removeChild(flock.pop().shape);
		}
	}
}

function gameLoop(delta) {
	const deltaV = new Victor(delta, delta);

	flock.forEach(agent => {
		agent.update(deltaV);
	})

	// DEBUG
	subdiv.debugGrid();
	if (DEBUG) {
		subdiv.getNearItems(flock[0], true);
	} 
}
