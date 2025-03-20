import { addPropertyControls, ControlType } from "framer"
import * as THREE from "three"
import React, { useRef, useEffect, useState } from "react"

// Define the component props interface with all customizable parameters
interface Props {
    width: number
    height: number
    backgroundColor: string
    materialColor: string
    sphereRadius: number
    displacementScale: number
    patternScale: number
    lineIntensity: number
    waveSpeed: number
    mouseInfluence: number
    autoRotate: boolean
    cameraDistance: number
}

export function SpherePattern(props: Props) {
    const {
        width,
        height,
        backgroundColor,
        materialColor,
        sphereRadius,
        displacementScale,
        patternScale,
        lineIntensity,
        waveSpeed,
        mouseInfluence,
        autoRotate,
        cameraDistance,
    } = props
    
    // Create refs for the container and animation frame
    const containerRef = useRef<HTMLDivElement>(null)
    const requestRef = useRef<number>()
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sphereGroupRef = useRef<THREE.Group | null>(null)
    const normalMapTextureRef = useRef<THREE.CanvasTexture | null>(null)
    const displacementMapTextureRef = useRef<THREE.CanvasTexture | null>(null)
    const normalMapCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const normalMapCtxRef = useRef<CanvasRenderingContext2D | null>(null)
    const waveTimeRef = useRef<number>(0)
    
    // Mouse tracking state
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const mouseRadius = 50

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return
        
        let isComponentMounted = true
        
        // Scene setup
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(backgroundColor)
        sceneRef.current = scene
        
        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        camera.position.set(0, -cameraDistance, 0)
        camera.up.set(0, 0, 1)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera
        
        // Renderer
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 1)
        scene.add(ambientLight)
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(1, 1, 1).normalize()
        scene.add(directionalLight)
        
        // Store textures
        const textureLoader = new THREE.TextureLoader()
        textureLoader.load(
            'https://files.catbox.moe/f3uh6q.png',
            (matcapTexture) => {
                if (!isComponentMounted) return
                
                // Create canvas for normal map generation
                const normalMapCanvas = document.createElement('canvas')
                normalMapCanvas.width = 256
                normalMapCanvas.height = 256
                normalMapCanvasRef.current = normalMapCanvas
                
                const normalMapCtx = normalMapCanvas.getContext('2d')
                normalMapCtxRef.current = normalMapCtx
                
                // Create textures
                if (normalMapCtx) {
                    const normalMapTexture = new THREE.CanvasTexture(normalMapCanvas)
                    normalMapTexture.needsUpdate = true
                    normalMapTextureRef.current = normalMapTexture
                    
                    const displacementMapTexture = new THREE.CanvasTexture(normalMapCanvas)
                    displacementMapTexture.needsUpdate = true
                    displacementMapTextureRef.current = displacementMapTexture
                }
                
                // Create object group
                const sphereGroup = new THREE.Group()
                scene.add(sphereGroup)
                sphereGroupRef.current = sphereGroup
                
                // Create the sphere
                createSphere()
                
                // Start rendering
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current)
                }
            },
            undefined,
            (error) => {
                console.error('Error loading matcap texture:', error)
            }
        )
        
        // Mouse move handler
        const handleMouseMove = (e: MouseEvent) => {
            // Get mouse position relative to the container
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect) {
                const x = ((e.clientX - rect.left) / width) * 2 - 1
                const y = -((e.clientY - rect.top) / height) * 2 + 1
                setMousePosition({ x, y })
            }
        }
        
        // Add mouse event listener
        containerRef.current.addEventListener('mousemove', handleMouseMove)
        
        // Handle window resize
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
            
            const newWidth = containerRef.current.clientWidth
            const newHeight = containerRef.current.clientHeight
            
            cameraRef.current.aspect = newWidth / newHeight
            cameraRef.current.updateProjectionMatrix()
            
            rendererRef.current.setSize(newWidth, newHeight)
        }
        
        window.addEventListener('resize', handleResize)
        
        // Clean up function
        return () => {
            isComponentMounted = false
            
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current)
            }
            
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement)
                rendererRef.current.dispose()
            }
            
            if (containerRef.current) {
                containerRef.current.removeEventListener('mousemove', handleMouseMove)
            }
            
            window.removeEventListener('resize', handleResize)
            
            // Dispose of materials and geometries
            if (sphereGroupRef.current) {
                sphereGroupRef.current.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        if (object.geometry) object.geometry.dispose()
                        
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach((material) => material.dispose())
                            } else {
                                object.material.dispose()
                            }
                        }
                    }
                })
            }
            
            // Dispose of textures
            if (normalMapTextureRef.current) {
                normalMapTextureRef.current.dispose()
            }
            if (displacementMapTextureRef.current) {
                displacementMapTextureRef.current.dispose()
            }
        }
    }, [width, height, backgroundColor, cameraDistance])
    
    // Animation and render loop
    useEffect(() => {
        if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !sphereGroupRef.current) return
        
        const animate = () => {
            waveTimeRef.current += waveSpeed
            
            generateNormalMap()
            
            if (autoRotate && sphereGroupRef.current) {
                sphereGroupRef.current.rotation.y += 0.005
            }
            
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current)
            }
            
            requestRef.current = requestAnimationFrame(animate)
        }
        
        requestRef.current = requestAnimationFrame(animate)
        
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current)
            }
        }
    }, [waveSpeed, autoRotate, mouseInfluence, patternScale, lineIntensity])
    
    // Recreate sphere when relevant props change
    useEffect(() => {
        createSphere()
    }, [materialColor, sphereRadius, displacementScale])
    
    // Function to generate normal map with spiral pattern
    const generateNormalMap = () => {
        if (!normalMapCanvasRef.current || !normalMapCtxRef.current) return
        if (!normalMapTextureRef.current || !displacementMapTextureRef.current) return
        if (!cameraRef.current) return
        
        const width = normalMapCanvasRef.current.width
        const height = normalMapCanvasRef.current.height
        const ctx = normalMapCtxRef.current
        
        const imageData = ctx.createImageData(width, height)
        const data = imageData.data
        
        // Center point for patterns
        const centerX = width / 2
        const centerY = height / 2
        
        // Convert mouse position to texture coordinates
        const mouseTexX = (mousePosition.x + 1) * width / 2
        const mouseTexY = (mousePosition.y + 1) * height / 2
        
        // Get camera direction
        const cameraDirection = new THREE.Vector3()
        cameraRef.current.getWorldDirection(cameraDirection)
        
        // Generate pattern
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let intensity = 0
                
                // Calculate distance from mouse
                const dx = x - mouseTexX
                const dy = y - mouseTexY
                const distanceFromMouse = Math.sqrt(dx * dx + dy * dy)
                
                // Calculate mouse influence
                const mouseInfluenceFactor = Math.exp(-distanceFromMouse * distanceFromMouse / (2 * mouseRadius * mouseRadius))
                
                // Calculate camera direction influence
                const cameraInfluenceX = cameraDirection.x * 0.5 + 0.5
                const cameraInfluenceY = cameraDirection.y * 0.5 + 0.5
                
                // Spiral pattern with mouse influence
                const dx3 = x - centerX
                const dy3 = y - centerY
                const angle = Math.atan2(dy3, dx3)
                const distance = Math.sqrt(dx3 * dx3 + dy3 * dy3)
                const spiral = Math.sin(angle * 10 + distance * patternScale - waveTimeRef.current * 5) * 0.5 + 0.5
                intensity = spiral * lineIntensity
                intensity *= (1 + mouseInfluenceFactor * mouseInfluence)
                intensity *= (1 + (cameraInfluenceX + cameraInfluenceY) * 0.5)
                
                // Calculate normal vector components
                const normalX = intensity * 2 - 1
                const normalY = 0
                const normalZ = 1
                
                // Convert to RGB (normal map format)
                const index = (y * width + x) * 4
                data[index] = (normalX + 1) * 127.5     // Red channel (X normal)
                data[index + 1] = (normalY + 1) * 127.5 // Green channel (Y normal)
                data[index + 2] = (normalZ + 1) * 127.5 // Blue channel (Z normal)
                data[index + 3] = 255                   // Alpha channel
            }
        }
        
        ctx.putImageData(imageData, 0, 0)
        normalMapTextureRef.current.needsUpdate = true
        displacementMapTextureRef.current.needsUpdate = true
    }
    
    // Function to create the sphere
    const createSphere = () => {
        if (!sceneRef.current) return
        if (!normalMapTextureRef.current || !displacementMapTextureRef.current) return
        
        // Remove existing sphere
        if (sphereGroupRef.current) {
            while (sphereGroupRef.current.children.length > 0) {
                const object = sphereGroupRef.current.children[0]
                sphereGroupRef.current.remove(object)
                
                if (object instanceof THREE.Mesh) {
                    if (object.geometry) object.geometry.dispose()
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach((material) => material.dispose())
                        } else {
                            object.material.dispose()
                        }
                    }
                }
            }
        }
        
        // Create the sphere geometry
        const widthSegments = 500
        const heightSegments = 250
        const scale = 3
        
        const geometry = new THREE.SphereGeometry(
            sphereRadius,
            widthSegments,
            heightSegments
        )
        
        // Create Matcap 3 material
        const material = new THREE.MeshMatcapMaterial({
            color: new THREE.Color(materialColor),
            matcap: normalMapTextureRef.current,
            side: THREE.DoubleSide,
            normalMap: normalMapTextureRef.current,
            normalScale: new THREE.Vector2(1, 1),
            displacementMap: displacementMapTextureRef.current,
            displacementScale: displacementScale
        })
        
        // Create the mesh and add to scene
        const mesh = new THREE.Mesh(geometry, material)
        mesh.scale.set(scale, scale, scale)
        
        if (sphereGroupRef.current) {
            sphereGroupRef.current.add(mesh)
        }
    }
    
    // Handle the texture loader
    const textureLoader = new THREE.TextureLoader()
    
    return (
        <div 
            key="sphere-pattern-container"
            ref={containerRef} 
            style={{ 
                width: width, 
                height: height, 
                position: "relative", 
                overflow: "hidden" 
            }}
        />
    )
}

// Define the default properties
SpherePattern.defaultProps = {
    width: 500,
    height: 500,
    backgroundColor: "#18181A",
    materialColor: "#FFFFFF",
    sphereRadius: 5,
    displacementScale: 8.0,
    patternScale: 3.0,
    lineIntensity: 0.2,
    waveSpeed: 0.007,
    mouseInfluence: 4.0,
    autoRotate: true,
    cameraDistance: 80
}

// Add Framer property controls for all customizable properties
addPropertyControls(SpherePattern, {
    width: {
        type: ControlType.Number,
        title: "Width",
        defaultValue: 500,
        min: 100,
        max: 2000,
        step: 10
    },
    height: {
        type: ControlType.Number,
        title: "Height",
        defaultValue: 500,
        min: 100,
        max: 2000,
        step: 10
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#18181A"
    },
    materialColor: {
        type: ControlType.Color,
        title: "Material",
        defaultValue: "#FFFFFF"
    },
    sphereRadius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 5,
        min: 1,
        max: 50,
        step: 0.5
    },
    displacementScale: {
        type: ControlType.Number,
        title: "Displacement",
        defaultValue: 8.0,
        min: 0,
        max: 50,
        step: 0.5
    },
    patternScale: {
        type: ControlType.Number,
        title: "Pattern Scale",
        defaultValue: 3.0,
        min: 0.1,
        max: 10,
        step: 0.1
    },
    lineIntensity: {
        type: ControlType.Number,
        title: "Intensity",
        defaultValue: 0.2,
        min: 0.01,
        max: 2,
        step: 0.01
    },
    waveSpeed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 0.007,
        min: 0,
        max: 0.1,
        step: 0.001
    },
    mouseInfluence: {
        type: ControlType.Number,
        title: "Mouse Effect",
        defaultValue: 4.0,
        min: 0,
        max: 20,
        step: 0.5
    },
    autoRotate: {
        type: ControlType.Boolean,
        title: "Auto Rotate",
        defaultValue: true
    },
    cameraDistance: {
        type: ControlType.Number,
        title: "Camera Distance",
        defaultValue: 80,
        min: 10,
        max: 200,
        step: 5
    }
})
