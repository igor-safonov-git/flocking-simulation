class Agent {
	static lineWidth = [1, 1, 1, 1];
	static lineColor = [0xFFFFFF, 0xFFFFFF, 0xffFFff, 0xFFffFF];
	static fillColor = [0, 0, 0, 0];
	// Reduce to just 5 colors
   static colorCache = [
       0x303033,  // Darkest (raised brightness to contrast background)
		0x303033,  // Medium
		0x76767D,  // Light
		0xC6C6CE,
		0xD4D4DA// Brightest
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
		
		// create sprite shape using pre-generated boid texture
		this.shape = new PIXI.Sprite(boidTex);
		this.shape.anchor.set(0.5);
		this.show();
		subdiv.update(this);
	}

	getNearAgents() {
		const as = [];
		const dsq = [];
		const r2 = perceptionRadius * perceptionRadius;
		const near = subdiv.getNearItems(this);

		// Count total nearby slots across buckets
		let total = 0;
		for (const bucket of near) {
			total += bucket.length;
		}
		// Determine sampling step to limit steering cost
		const step = total > maxFlockCount && !ACCURATE ? total / maxFlockCount : 1;

		for (const bucket of near) {
			for (let i = 0; i < bucket.length; i += step) {
				const a = bucket[Math.floor(i)];
				const d = vec2.squaredDistance(this.position, a.position);
				if (a !== this && d < r2) {
					as.push(a);
					dsq.push(d);
					a.isNear = a.isNear || this.debug;
				}
			}
		}
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

			if (agents.length === 0) {
				return Agent.avgVec;
			}

			for (let i = 0; i < agents.length; i++) {
				const a = agents[i];
				vec2.subtract(Agent.tmpVec, this.position, a.position);
				if (dsq[i] > 0) {
					vec2.scale(Agent.tmpVec, Agent.tmpVec, 1 / dsq[i]);
				}
				vec2.add(Agent.avgVec, Agent.avgVec, Agent.tmpVec);
			}

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
        // SVG path attractor: sample points along the SVG circle
        if (window.attractorPoints) {
            let minD2 = Infinity;
            let nearestX = 0, nearestY = 0;
            const pts = window.attractorPoints;
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                const dxp = p[0] - this.position[0];
                const dyp = p[1] - this.position[1];
                const d2 = dxp * dxp + dyp * dyp;
                if (d2 < minD2) {
                    minD2 = d2;
                    nearestX = p[0];
                    nearestY = p[1];
                }
            }
            // spring-like pull with dead-zone
            const dx = nearestX - this.position[0];
            const dy = nearestY - this.position[1];
            const dist = Math.hypot(dx, dy);
            const band = window.attractorDeadZone || 0;
            if (dist > band) {
                const strength = window.attractorStrength || 0.05;
                const ux = dx / dist;
                const uy = dy / dist;
                Agent.tmpVec[0] = ux * strength;
                Agent.tmpVec[1] = uy * strength;
                vec2.add(this.acceleration, this.acceleration, Agent.tmpVec);
            }
        }
	}

	avoidMouse() {
		const dist = vec2.squaredDistance(this.position, mouse);
		const r2 = mouseRadius * mouseRadius;
		
		if (dist < r2) {
			vec2.subtract(Agent.tmpVec, this.position, mouse);
			
			if (dist > 0) {
				const force = Math.pow(1 - dist / r2, 2);
				vec2.scale(Agent.tmpVec, Agent.tmpVec, force * 2);
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
		
		vec2.set(Agent.tmpVec, 0, 0);
		return Agent.tmpVec;
	}

	update(dv) {
		this.debug = DEBUG && flock.indexOf(this) < 5; // show first 5 agents in debug mode

		this.flocking();

		// Apply acceleration to velocity first
		vec2.add(this.velocity, this.velocity, this.acceleration);
		
		// Limit the velocity
		const speedSq = vec2.squaredLength(this.velocity);
		if (speedSq > maxSpeed * maxSpeed) {
			const speed = Math.sqrt(speedSq);
			vec2.scale(this.velocity, this.velocity, maxSpeed / speed);
		}
		
		// Update position based on velocity
		vec2.add(this.position, this.position, this.velocity);
		
		// `width` and `height` is from the index.js
		// bounce off walls
		if (this.position[0] < 0) {
			this.position[0] = 0;
			this.velocity[0] *= -1;
		} else if (this.position[0] >= width) {
			this.position[0] = width;
			this.velocity[0] *= -1;
		}
		if (this.position[1] < 0) {
			this.position[1] = 0;
			this.velocity[1] *= -1;
		} else if (this.position[1] >= height) {
			this.position[1] = height;
			this.velocity[1] *= -1;
		}

		subdiv.update(this);
		this.show();
		this.isNear = false;
	}

	show() {
			this.shape.tint = this.getColor();

		this.shape.x = this.position[0];
		this.shape.y = this.position[1];
		this.shape.rotation = Math.atan2(this.velocity[1], this.velocity[0]);
	}
	
	getColor() {
		const speed = vec2.length(this.velocity);
		const normalizedSpeed = speed / maxSpeed;
		const colorIndex = Math.min(4, Math.floor(normalizedSpeed * 5));
		return Agent.colorCache[colorIndex];
	}

	drawShape() {
		if (this.shape === undefined) {
			this.shape = new PIXI.Graphics();
		}

		const sState = (this.debug ? 1 : 0) + (this.isNear ? 2 : 0);
		const color = this.debug ? Agent.lineColor[sState] : this.getColor();

		this.shape.clear();
			// Base radius now 2 (half size)
			this.shape.beginFill(color, 1);
			this.shape.drawCircle(0, 0, 2);
		this.shape.endFill();

		if (this.debug) {
			this.shape.lineStyle(1, 0xFFFFFF, 1);
			this.shape.drawCircle(0, 0, perceptionRadius);
		}
	}
}

