// GLSL Shader System for DOPPELGANGER VJ Duo
class ShaderManager {
    constructor() {
        this.shaders = new Map();
        this.scenes = new Map();
        this.cameras = new Map();
        this.renderers = new Map();
        this.uniforms = new Map();
        this.animationIds = new Map();
    }

    // Vertex shader (same for all)
    getVertexShader() {
        return `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
    }


    // Experiment Shaders from experiments.js
    getLiquidMetalShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            // SDF for sphere
            float sphereSDF(vec3 p, float radius) {
                return length(p) - radius;
            }
            
            // Noise function
            float noise(vec3 p) {
                return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
            }
            
            // Raymarching function
            float map(vec3 pos) {
                // Create flowing liquid surface
                vec3 q = pos;
                q.y += sin(pos.x * 2.0 + time) * 0.3;
                q.y += sin(pos.z * 1.5 + time * 0.8) * 0.2;
                q.x += cos(pos.z * 1.8 + time * 0.6) * 0.25;
                
                // Multiple spheres creating liquid drops
                float d1 = sphereSDF(q, 0.8);
                float d2 = sphereSDF(q + vec3(1.2, 0.3, 0.5), 0.6);
                float d3 = sphereSDF(q - vec3(0.8, 0.2, 1.0), 0.5);
                
                // Smooth union of shapes
                float d = min(d1, min(d2, d3));
                
                // Add noise for surface texture
                d += noise(pos * 8.0 + time * 0.5) * 0.05;
                
                return d;
            }
            
            vec3 getNormal(vec3 pos) {
                float eps = 0.001;
                return normalize(vec3(
                    map(pos + vec3(eps, 0, 0)) - map(pos - vec3(eps, 0, 0)),
                    map(pos + vec3(0, eps, 0)) - map(pos - vec3(0, eps, 0)),
                    map(pos + vec3(0, 0, eps)) - map(pos - vec3(0, 0, eps))
                ));
            }
            
            void main() {
                vec2 uv = (vUv - 0.5) * 2.0;
                
                // Camera setup
                vec3 rayDir = normalize(vec3(uv, 1.0));
                vec3 rayPos = vec3(0.0, 0.0, -3.0);
                
                // Raymarching
                float totalDist = 0.0;
                float minDist = 999.0;
                
                for(int i = 0; i < 64; i++) {
                    float dist = map(rayPos + rayDir * totalDist);
                    minDist = min(minDist, dist);
                    
                    if(dist < 0.001) break;
                    
                    totalDist += dist;
                    if(totalDist > 50.0) break;
                }
                
                vec3 color = vec3(0.05); // Background
                
                if(totalDist < 50.0) {
                    vec3 pos = rayPos + rayDir * totalDist;
                    vec3 normal = getNormal(pos);
                    
                    // Metallic reflection
                    float fresnel = pow(1.0 - dot(-rayDir, normal), 2.0);
                    float metallic = fresnel * 0.9 + 0.1;
                    
                    color = vec3(metallic);
                    
                    // Add highlights
                    vec3 lightDir = normalize(vec3(1.0, 1.0, -1.0));
                    float spec = pow(max(0.0, dot(normal, lightDir)), 32.0);
                    color += spec * 0.8;
                } else {
                    // Ambient glow from near misses
                    color += exp(-minDist * 3.0) * 0.2;
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    getChromeLiquidShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
            
            // Noise function
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            void main() {
                vec2 st = vUv;
                
                // Liquid chrome flow
                vec2 flow = vec2(
                    sin(st.y * 4.0 + time * 1.5) * 0.2,
                    cos(st.x * 3.0 + time * 1.2) * 0.15
                );
                
                vec2 chromeSt = st + flow;
                
                // Chrome surface simulation
                float surface = 0.0;
                
                // Primary liquid shape - reduced intensity to prevent white spots
                for(int i = 0; i < 3; i++) {
                    float fi = float(i);
                    vec2 center = vec2(
                        0.3 + fi * 0.2 + sin(time * 0.8 + fi) * 0.1,
                        0.5 + cos(time * 0.6 + fi * 1.5) * 0.2
                    );
                    
                    float dist = length(chromeSt - center);
                    // Reduced intensity and added distance-based falloff
                    float blob = exp(-dist * 4.0) * 0.6;
                    // Further reduce based on distance to prevent bright centers
                    blob *= smoothstep(0.0, 0.1, dist);
                    surface += blob;
                }
                
                // Surface ripples
                float ripples = noise(chromeSt * 12.0 + time * 2.0) * 0.3;
                surface += ripples;
                
                // Chrome threshold
                float chrome = smoothstep(0.3, 0.8, surface);
                
                // Simplified, lower-amplitude offset to avoid regular pointy artefacts
                vec2 reflectionCoord = st + vec2(
                    sin(st.x * 20.0 + time),
                    cos(st.y * 18.0 + time * 0.8)
                ) * chrome * 0.05;
                
                // Reflection patterns
                float reflection = 0.0;
                
                // Horizontal reflection bands
                reflection += sin(reflectionCoord.y * 15.0 + time * 2.0) * 0.5 + 0.5;
                
                // Vertical reflection bands removed to eliminate dot-grid intersections
                // reflection += sin(reflectionCoord.x * 12.0 + time * 1.5) * 0.3 + 0.7;
                
                // Diagonal reflections already removed
                
                // To keep brightness consistent, lightly scale the remaining reflection
                reflection *= 0.9;
                
                // Fresnel effect - modified to avoid bright center spots
                vec2 center = vec2(0.5);
                float dist = length(st - center);
                // Make fresnel less extreme and avoid creating a bright center
                float fresnel = (1.0 - smoothstep(0.1, 0.9, dist)) * 0.5;
                
                // Chrome color with perfect reflections
                vec3 baseChrome = vec3(0.7, 0.8, 0.9);
                vec3 highlight = vec3(1.0, 1.0, 1.0);
                vec3 shadow = vec3(0.3, 0.4, 0.5);
                
                vec3 color = mix(shadow, baseChrome, reflection);
                color = mix(color, highlight, fresnel * chrome);
                
                // Apply chrome mask
                color *= chrome;
                
                // Perfect mirror highlights - reduced where already bright
                float mirror = smoothstep(0.8, 1.0, reflection * chrome);
                // Reduce mirror highlights where surface is already bright to avoid white spots
                float brightness = (color.r + color.g + color.b) / 3.0;
                mirror *= 1.0 - smoothstep(0.7, 0.9, brightness);
                color += mirror * vec3(1.0) * 0.1;
                
                // Disabled previous speckle-like distortion to remove moving white dots
                // float distortion = sin(st.x * 30.0 + time * 4.0) * sin(st.y * 25.0 + time * 3.5);
                // distortion = smoothstep(0.9, 1.0, distortion * 0.5 + 0.5) * chrome * 0.15;
                // distortion *= 1.0 - smoothstep(0.7, 0.9, brightness);
                // color += distortion;
                
                // Final clamp to prevent any white spots
                color = min(color, vec3(0.85));
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }


    initShader(canvas, shaderType) {
        console.log('Initializing shader for canvas:', canvas.id, 'type:', shaderType);
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                antialias: false,
                alpha: false
            });
            console.log('WebGL renderer created successfully');
        } catch (error) {
            console.error('Failed to create WebGL renderer:', error);
            throw error;
        }
        
        // Set canvas size - special handling for background shader
        let width, height;
        if (canvas.id === 'background-shader') {
            width = window.innerWidth * window.devicePixelRatio;
            height = window.innerHeight * window.devicePixelRatio;
        } else {
            const rect = canvas.getBoundingClientRect();
            width = rect.width * window.devicePixelRatio;
            height = rect.height * window.devicePixelRatio;
        }
        
        
        renderer.setSize(width, height, false);
        canvas.width = width;
        canvas.height = height;
        
        // Shader uniforms
        const uniforms = {
            time: { value: 0.0 },
            resolution: { value: new THREE.Vector2(width, height) }
        };
        
        // Get fragment shader based on type
        let fragmentShader;
        switch(shaderType) {
            case 'liquid-metal':
                fragmentShader = this.getLiquidMetalShader();
                break;
            case 'chrome-liquid':
                fragmentShader = this.getChromeLiquidShader();
                break;
            default:
                fragmentShader = this.getChromeLiquidShader();
        }
        
        // Create shader material
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: this.getVertexShader(),
            fragmentShader: fragmentShader
        });
        
        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        // Store references with unique ID
        const id = canvas.id ? `${canvas.id}-${canvas.dataset.shader}` : `canvas-${Date.now()}-${canvas.dataset.shader}`;
        this.scenes.set(id, scene);
        this.cameras.set(id, camera);
        this.renderers.set(id, renderer);
        this.uniforms.set(id, uniforms);
        
        // Start animation
        this.animate(id);
    }

    animate(id) {
        const animateLoop = () => {
            const scene = this.scenes.get(id);
            const camera = this.cameras.get(id);
            const renderer = this.renderers.get(id);
            const uniforms = this.uniforms.get(id);
            
            if (scene && camera && renderer && uniforms) {
                uniforms.time.value = performance.now() * 0.001;
                renderer.render(scene, camera);
                
                // Debug: Flash the background every 2 seconds to verify animation
                if (id === 'background-shader' && Math.floor(uniforms.time.value) % 2 === 0 && uniforms.time.value % 1 < 0.016) {
                    console.log('Background shader animating, time:', uniforms.time.value);
                }
            }
            
            const animationId = requestAnimationFrame(animateLoop);
            this.animationIds.set(id, animationId);
        };
        
        animateLoop();
    }

    handleResize() {
        this.renderers.forEach((renderer, id) => {
            const canvas = renderer.domElement;
            const rect = canvas.getBoundingClientRect();
            const width = rect.width * window.devicePixelRatio;
            const height = rect.height * window.devicePixelRatio;
            
            if (canvas.width !== width || canvas.height !== height) {
                renderer.setSize(width, height, false);
                canvas.width = width;
                canvas.height = height;
                
                const uniforms = this.uniforms.get(id);
                if (uniforms) {
                    uniforms.resolution.value.set(width, height);
                }
            }
        });
    }


    destroy() {
        // Clean up animations
        this.animationIds.forEach(id => cancelAnimationFrame(id));
        
        // Dispose of Three.js resources
        this.renderers.forEach(renderer => {
            renderer.dispose();
        });
        
        this.scenes.forEach(scene => {
            scene.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
    }
}

// Google Sheets Live Dates Integration
class LiveDatesManager {
    constructor() {
        this.sheetId = '1bqvKiGueaivqoURlw-QHvouj89WAeob3rx67caetPWQ';
        this.sheetName = 'Dates';
        this.init();
    }

    async init() {
        try {
            await this.loadLiveDates();
        } catch (error) {
            console.error('Error loading live dates:', error);
            this.showError();
        }
    }

    async loadLiveDates() {
        const url = `https://opensheet.elk.sh/${this.sheetId}/${this.sheetName}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        this.processDates(data);
    }

    processDates(data) {
        const upcomingDates = [];
        const pastDates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

        // Handle object format (each row is an object with named properties)
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            if (row && row.Date && row.Venue) {
                // Remove quotes from the values
                const dateStr = row.Date.replace(/"/g, '');
                const venue = row.Venue.replace(/"/g, '');
                const link = row.Link ? row.Link.replace(/"/g, '') : '';

                // Parse the date string
                const eventDate = new Date(dateStr);
                
                // Check if date is valid
                if (isNaN(eventDate.getTime())) {
                    console.warn('Invalid date format:', dateStr);
                    continue;
                }

                // Set event date to start of day for comparison
                eventDate.setHours(0, 0, 0, 0);

                const dateItem = { date: dateStr, venue, link };

                // Categorize based on date comparison
                if (eventDate >= today) {
                    upcomingDates.push(dateItem);
                } else {
                    pastDates.push(dateItem);
                }
            }
        }

        // Sort upcoming dates (earliest first)
        upcomingDates.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Sort past dates (most recent first)
        pastDates.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.renderDates('upcoming-dates', upcomingDates);
        this.renderDates('past-dates', pastDates);
    }

    renderDates(containerId, dates) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (dates.length === 0) {
            container.innerHTML = '<div class="no-dates">No dates available</div>';
            return;
        }

        const datesHTML = dates.map(item => {
            let venueHTML;
            if (item.link && item.link.trim() !== '') {
                venueHTML = `<a class=\"venue\" href=\"${item.link}\" target=\"_blank\" rel=\"noopener noreferrer\">${item.venue}</a>`;
            } else {
                venueHTML = `<span class=\"venue\">${item.venue}</span>`;
            }
            return `
                <div class=\"date-item\">
                    <span class=\"date\">${item.date}</span>
                    ${venueHTML}
                </div>
            `;
        }).join('');

        container.innerHTML = datesHTML;
    }

    showError() {
        const containers = ['upcoming-dates', 'past-dates'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = '<div class="error">Unable to load dates. Please check back later.</div>';
            }
        });
    }
}

// Initialize shader system
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing shaders...');
    console.log('THREE.js loaded:', typeof THREE);
    console.log('THREE.WebGLRenderer available:', typeof THREE.WebGLRenderer);
    
    const shaderManager = new ShaderManager();
    window.shaderManager = shaderManager; // Make globally accessible
    
    // Initialize background shader
    const backgroundCanvas = document.getElementById('background-shader');
    if (backgroundCanvas) {
        console.log('Background canvas found, initializing...');
        const backgroundShaderType = backgroundCanvas.dataset.shader;
        console.log('Background shader type:', backgroundShaderType);
        try {
            shaderManager.initShader(backgroundCanvas, backgroundShaderType);
            console.log('Background shader initialized successfully');
        } catch (error) {
            console.error('Failed to initialize background shader:', error);
        }
    } else {
        console.error('Background canvas not found!');
    }
    
    // Initialize hero shader canvas
    const heroCanvas = document.querySelector('.hero-shader');
    if (heroCanvas) {
        console.log('Hero canvas found, initializing...');
        const heroShaderType = heroCanvas.dataset.shader;
        console.log('Hero shader type:', heroShaderType);
        try {
            shaderManager.initShader(heroCanvas, heroShaderType);
            console.log('Hero shader initialized successfully');
        } catch (error) {
            console.error('Failed to initialize hero shader:', error);
        }
    }
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            shaderManager.handleResize();
        }, 250);
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        shaderManager.destroy();
    });
    
    // Burger menu functionality
    const burgerMenu = document.querySelector('.burger-menu');
    const navMobile = document.querySelector('.nav-mobile');
    
    if (burgerMenu && navMobile) {
        burgerMenu.addEventListener('click', function() {
            burgerMenu.classList.toggle('open');
            navMobile.classList.toggle('open');
        });
        
        // Close mobile menu when clicking on a link
        const mobileNavLinks = document.querySelectorAll('.nav-mobile a');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function() {
                burgerMenu.classList.remove('open');
                navMobile.classList.remove('open');
            });
        });
    }
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Initialize content manager
    new LiveDatesManager();
    
    // Console messages
    console.log('DOPPELGANGER - GLSL Shaders Loaded');
    console.log('Visual systems online');
});