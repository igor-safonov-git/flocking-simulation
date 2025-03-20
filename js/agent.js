class Agent {
	static lineWidth = [1, 1, 1, 1];
	static lineColor = [0xFFFFFF, 0xffff00, 0xff00ff, 0x00ff00];
	static fillColor = [0, 0, 0, 0];
	// Reduce to just 3 colors
	static colorCache = [
		0x18181A,  // Slow - darkest
		0x666666,  // Medium
		0xF1F1F1   // Fast - brightest
	];

	// Static vectors for reuse
	static tmpVec = vec2.create();
	static avgVec = vec2.create();

	static average = vec2.create();

	constructor() {
		const angle = random(0, Math.PI * 2);
		const r = random(maxSpeed / 2, maxSpeed);

		this.position = vec2.fromValues(random(0, width), random(0, height));
		this.velocity = vec2.fromValues(Math.cos(angle) * r, Math.sin(angle) * r);
		this.acceleration = vec2.create();

		this.isNear = false; // near to the first agent
		
		subdiv.update(this); // update the item in the buckets

		this.show();
	}

	getNearAgents() {
		const as = []; // Agents
		const dsq = []; // Distances
		const r2 = perceptionRadius * perceptionRadius;
		const near = subdiv.getNearItems(this);

		let nearLength = 0;
		near.forEach(a => nearLength += a.length);
		// Limit the max agent which will be used for steering.
		const step = nearLength > maxFlockCount && !ACCURATE ? nearLength / maxFlockCount : 1;

		near.forEach(arr => {
			for (let i = 0; i < arr.length; i += step) {
				const a = arr[Math.floor(i)];
				const d = vec2.squaredDistance(this.position, a.position);
				if (a !== this && d < r2) {
					as.push(a);
					dsq.push(d);

					a.isNear |= this.debug;
				}
			};
		});	
		
		return [as, dsq];
	}

	limitAvgForce(avg) {
		const len = vec2.length(avg);
		if (len > 0) {
			vec2.scale(avg, avg, maxSpeed / len);
		}
		
		vec2.subtract(avg, avg, this.velocity);
		const forceSq = vec2.squaredLength(avg);
		
		if (forceSq > maxForce * maxForce) {
			const forceLen = Math.sqrt(forceSq);
			vec2.scale(avg, avg, maxForce / forceLen);
		}
	}

	separation(agents, dsq) {
		vec2.set(Agent.avgVec, 0, 0);
		
		if (agents.length === 0) return Agent.avgVec;

		agents.forEach((a, i) => {
			vec2.subtract(Agent.tmpVec, this.position, a.position);
			if (dsq[i] > 0) {
				vec2.scale(Agent.tmpVec, Agent.tmpVec, 1 / dsq[i]);
			}
			vec2.add(Agent.avgVec, Agent.avgVec, Agent.tmpVec);
		});

		vec2.scale(Agent.avgVec, Agent.avgVec, 1 / agents.length);
		this.limitAvgForce(Agent.avgVec);

		return Agent.avgVec;
	}

	cohesion(agents) {
		vec2.set(Agent.avgVec, 0, 0);
		
		if (agents.length === 0) return Agent.avgVec;

		agents.forEach(a => {
			vec2.add(Agent.avgVec, Agent.avgVec, a.position);
		});

		vec2.scale(Agent.avgVec, Agent.avgVec, 1 / agents.length);
		vec2.subtract(Agent.avgVec, Agent.avgVec, this.position);
		this.limitAvgForce(Agent.avgVec);

		return Agent.avgVec;
	}

	align(agents) {
		vec2.set(Agent.avgVec, 0, 0);
		
		if (agents.length === 0) return Agent.avgVec;

		agents.forEach(a => {
			vec2.add(Agent.avgVec, Agent.avgVec, a.velocity);
		});

		vec2.scale(Agent.avgVec, Agent.avgVec, 1 / agents.length);
		this.limitAvgForce(Agent.avgVec);

		return Agent.avgVec;
	}

	flocking() {
		const arrays = this.getNearAgents();
		const agents = arrays[0];
		const distancesSq = arrays[1];

		vec2.set(this.acceleration, 0, 0);

		const sV = this.separation(agents, distancesSq);
		vec2.scale(Agent.tmpVec, sV, sSliderValue);
		vec2.add(this.acceleration, this.acceleration, Agent.tmpVec);

		const cV = this.cohesion(agents);
		vec2.scale(Agent.tmpVec, cV, cSliderValue);
		vec2.add(this.acceleration, this.acceleration, Agent.tmpVec);

		const aV = this.align(agents);
		vec2.scale(Agent.tmpVec, aV, aSliderValue);
		vec2.add(this.acceleration, this.acceleration, Agent.tmpVec);

		// Add mouse avoidance
		if (isMouseInCanvas) {
			const mouseAvoid = this.avoidMouse();
			vec2.add(this.acceleration, this.acceleration, mouseAvoid);
		}
	}

	avoidMouse() {
		const dist = vec2.squaredDistance(this.position, mouse);
		const r2 = mouseRadius * mouseRadius;
		
		if (dist < r2) {
			vec2.subtract(Agent.tmpVec, this.position, mouse);
			
			if (dist > 0) {
				vec2.scale(Agent.tmpVec, Agent.tmpVec, 1 / dist);
			}
			
			const len = vec2.length(Agent.tmpVec);
			if (len > 0) {
				vec2.scale(Agent.tmpVec, Agent.tmpVec, maxSpeed * mouseForce / len);
			}
			
			vec2.subtract(Agent.tmpVec, Agent.tmpVec, this.velocity);
			
			const forceSq = vec2.squaredLength(Agent.tmpVec);
			if (forceSq > maxForce * maxForce) {
				const forceLen = Math.sqrt(forceSq);
				vec2.scale(Agent.tmpVec, Agent.tmpVec, maxForce / forceLen);
			}
			
			return Agent.tmpVec;
		}
		
		return vec2.create();
	}

	update(dv) {
		this.debug = DEBUG && flock[0] === this; // only for the first element

		this.flocking();

		vec2.add(this.position, this.position, this.velocity);
		// `width` and `height` is from the index.js
		if (this.position[0] < 0) this.position[0] += width;
		else if (this.position[0] >= width) this.position[0] -= width;
		if (this.position[1] < 0) this.position[1] += height;
		else if (this.position[1] >= height) this.position[1] -= height;

		subdiv.update(this);

		vec2.add(this.velocity, this.velocity, this.acceleration);
		// Limit the velocity
		const speedSq = vec2.squaredLength(this.velocity);
		if (speedSq > maxSpeed * maxSpeed) {
			const speed = Math.sqrt(speedSq);
			vec2.scale(this.velocity, this.velocity, maxSpeed / speed);
		}

		this.show();

		this.isNear = false;
	}

	show() {
		this.drawShape();

		this.shape.x = this.position[0];
		this.shape.y = this.position[1];
		this.shape.rotation = Math.atan2(this.velocity[1], this.velocity[0]);
	}
	
	getColor() {
		const speed = vec2.length(this.velocity);
		const normalizedSpeed = speed / maxSpeed;
		const colorIndex = Math.min(2, Math.floor(normalizedSpeed * 3));
		return Agent.colorCache[colorIndex];
	}

	drawShape() {
		if (this.shape === undefined) {
			this.shape = new PIXI.Graphics();
		}

		const sState = (this.debug ? 1 : 0) + (this.isNear ? 2 : 0);
		// Only update if state changed or speed changed very significantly
		const currentSpeed = vec2.length(this.velocity);
		if (this.shapeState !== sState || Math.abs(this.lastSpeed - currentSpeed) > maxSpeed / 3) {
			this.shapeState = sState;
			this.lastSpeed = currentSpeed;

			const color = this.debug ? Agent.lineColor[sState] : this.getColor();

			this.shape.clear();
			this.shape.beginFill(color, 1);
			this.shape.drawCircle(0, 0, 4);
			this.shape.endFill();

			if (this.debug) {
				this.shape.lineStyle(1, 0x00ffff, 1);
				this.shape.drawCircle(0, 0, perceptionRadius);
			}
		}
	}
}

