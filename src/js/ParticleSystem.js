import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';
import { Particle } from './Particle.js';

export class ParticleSystem {
    constructor(scene) {
        // Initialize Rapier physics world
        this.gravity = new RAPIER.Vector3(0.0, 0.0, 0.0);
        this.world = new RAPIER.World(this.gravity);

        this.scene = scene;
        this.particles = [];
        
        // Particle types and their colors
        this.types = [
            { color: 0xff0000 }, // Red
            { color: 0x00ff00 }, // Green
            { color: 0x0000ff }  // Blue
        ];

        // Interaction matrix for particle types
        this.interactionMatrix = Array(this.types.length).fill().map(() => 
            Array(this.types.length).fill().map(() => ({
                attractionForce: Math.random() * 2 - 1,
                repulsionForce: Math.random() * 0.5
            }))
        );

        // Configuration
        this.config = {
            attractionMultiplier: 0.5,
            repulsionMultiplier: 0.5,
            interactionRadius: 5,
            maxForce: 10,
            dampingFactor: 0.99
        };
    }

    createParticle(position) {
        const typeIndex = Math.floor(Math.random() * this.types.length);
        const type = this.types[typeIndex];
        
        const particle = new Particle(
            this.world,
            position,
            typeIndex,
            type.color
        );

        this.particles.push(particle);
        this.scene.add(particle.mesh);
        
        return particle;
    }

    removeParticle(particle) {
        const index = this.particles.indexOf(particle);
        if (index > -1) {
            this.particles.splice(index, 1);
            this.scene.remove(particle.mesh);
            this.world.removeRigidBody(particle.body);
        }
    }

    update() {
        // Step the physics world
        this.world.step();

        // Update particle interactions
        for (let i = 0; i < this.particles.length; i++) {
            const particleA = this.particles[i];
            const posA = particleA.getPosition();
            let totalForce = new THREE.Vector3(0, 0, 0);

            for (let j = 0; j < this.particles.length; j++) {
                if (i === j) continue;

                const particleB = this.particles[j];
                const posB = particleB.getPosition();

                // Calculate distance and direction
                const direction = new THREE.Vector3().subVectors(posB, posA);
                const distance = direction.length();

                if (distance < this.config.interactionRadius) {
                    const interaction = this.interactionMatrix[particleA.type][particleB.type];
                    
                    // Normalize direction
                    direction.normalize();

                    // Calculate forces
                    const attractionStrength = interaction.attractionForce * 
                        this.config.attractionMultiplier * 
                        (1 - distance / this.config.interactionRadius);

                    const repulsionStrength = interaction.repulsionForce * 
                        this.config.repulsionMultiplier * 
                        (1 - distance / this.config.interactionRadius);

                    // Apply attraction
                    const attractionForce = direction.clone().multiplyScalar(attractionStrength);
                    totalForce.add(attractionForce);

                    // Apply repulsion
                    const repulsionForce = direction.clone().multiplyScalar(-repulsionStrength);
                    totalForce.add(repulsionForce);
                }
            }

            // Limit maximum force
            if (totalForce.length() > this.config.maxForce) {
                totalForce.normalize().multiplyScalar(this.config.maxForce);
            }

            // Apply damping to current velocity
            const currentVel = particleA.getVelocity();
            currentVel.multiplyScalar(this.config.dampingFactor);
            particleA.setVelocity(currentVel);

            // Apply the total force
            particleA.applyForce(totalForce);

            // Update visual representation
            particleA.update();
        }
    }

    setAttractionMultiplier(value) {
        this.config.attractionMultiplier = value;
    }

    setRepulsionMultiplier(value) {
        this.config.repulsionMultiplier = value;
    }

    setParticleCount(count) {
        const currentCount = this.particles.length;
        
        if (count > currentCount) {
            // Add particles
            for (let i = 0; i < count - currentCount; i++) {
                const position = new THREE.Vector3(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20
                );
                this.createParticle(position);
            }
        } else if (count < currentCount) {
            // Remove particles
            for (let i = 0; i < currentCount - count; i++) {
                this.removeParticle(this.particles[this.particles.length - 1]);
            }
        }
    }
}
