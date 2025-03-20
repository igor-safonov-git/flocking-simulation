import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d';

export class Particle {
    constructor(world, position, type, color) {
        // Physics body
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z);
        this.body = world.createRigidBody(rigidBodyDesc);

        // Collider
        const colliderDesc = RAPIER.ColliderDesc.ball(0.5)
            .setRestitution(0.7)
            .setFriction(0.1);
        this.collider = world.createCollider(colliderDesc, this.body);

        // Visual representation
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        const material = new THREE.MeshPhongMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);

        this.type = type;
        this.color = color;
    }

    update() {
        const position = this.body.translation();
        this.mesh.position.set(position.x, position.y, position.z);
        
        const rotation = this.body.rotation();
        this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    applyForce(force) {
        this.body.applyImpulse(force, true);
    }

    getPosition() {
        const position = this.body.translation();
        return new THREE.Vector3(position.x, position.y, position.z);
    }

    setPosition(position) {
        this.body.setTranslation(position, true);
    }

    getVelocity() {
        const velocity = this.body.linvel();
        return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
    }

    setVelocity(velocity) {
        this.body.setLinvel(velocity, true);
    }
}
