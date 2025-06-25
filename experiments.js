// SHADER EXPERIMENTS FOR DOPPELGANGER VJ DUO
class ExperimentShaderManager {
    constructor() {
        this.scenes = new Map();
        this.cameras = new Map();
        this.renderers = new Map();
        this.uniforms = new Map();
        this.animationIds = new Map();
    }

    // Vertex shader (same for all experiments)
    getVertexShader() {
        return `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
    }

    // EXPERIMENT 01: Liquid Metal Flow
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

    // EXPERIMENT 02: Geometric Spiral
    getGeometricSpiralShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            void main() {
                vec2 st = (vUv - 0.5) * 2.0;
                
                // Convert to polar coordinates
                float r = length(st);
                float a = atan(st.y, st.x);
                
                // Golden ratio spiral
                float golden = 1.618033988749;
                float spiral1 = sin(a * golden + time * 0.5 - log(r * 4.0) * golden) * 0.5 + 0.5;
                float spiral2 = sin(a * golden * 2.0 - time * 0.3 - log(r * 2.0) * golden) * 0.5 + 0.5;
                
                // Multiple spiral arms
                float arms = 5.0;
                float armSpiral = sin(a * arms - time * 0.8 + r * 8.0) * 0.5 + 0.5;
                
                // Radial pulsing
                float pulse = sin(r * 10.0 - time * 2.0) * 0.5 + 0.5;
                pulse = smoothstep(0.3, 0.7, pulse);
                
                // Combine patterns
                float pattern = spiral1 * 0.6 + spiral2 * 0.3 + armSpiral * 0.4;
                pattern *= pulse;
                
                // Distance fade
                pattern *= 1.0 - smoothstep(0.5, 1.2, r);
                
                // High contrast
                pattern = smoothstep(0.4, 0.6, pattern);
                
                vec3 color = vec3(pattern);
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    // EXPERIMENT 03: Pulse Grid
    getPulseGridShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            void main() {
                vec2 st = vUv;
                
                // Multiple grid scales
                vec2 grid1 = st * 8.0;
                vec2 grid2 = st * 16.0;
                vec2 grid3 = st * 4.0;
                
                // Grid cell positions
                vec2 cell1 = floor(grid1);
                vec2 cell2 = floor(grid2);
                vec2 cell3 = floor(grid3);
                
                // Different pulse frequencies for each grid
                float pulse1 = sin(time * 2.0 + (cell1.x + cell1.y) * 0.5) * 0.5 + 0.5;
                float pulse2 = sin(time * 3.0 + (cell2.x + cell2.y) * 0.3) * 0.5 + 0.5;
                float pulse3 = sin(time * 1.5 + (cell3.x + cell3.y) * 0.8) * 0.5 + 0.5;
                
                // Grid lines
                vec2 gridLine1 = abs(fract(grid1) - 0.5);
                vec2 gridLine2 = abs(fract(grid2) - 0.5);
                
                float line1 = 1.0 - smoothstep(0.0, 0.05, min(gridLine1.x, gridLine1.y));
                float line2 = 1.0 - smoothstep(0.0, 0.02, min(gridLine2.x, gridLine2.y));
                
                // Pulsing cells
                float cellPulse1 = smoothstep(0.3, 0.7, pulse1);
                float cellPulse2 = smoothstep(0.4, 0.6, pulse2);
                float cellPulse3 = smoothstep(0.2, 0.8, pulse3);
                
                // Combine patterns
                float pattern = line1 * 0.8 + line2 * 0.4;
                pattern += cellPulse1 * 0.3 + cellPulse2 * 0.2 + cellPulse3 * 0.1;
                
                // Beat synchronization effect
                float beat = sin(time * 4.0) * 0.5 + 0.5;
                beat = smoothstep(0.6, 0.8, beat);
                pattern *= 0.7 + beat * 0.3;
                
                vec3 color = vec3(pattern);
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    // EXPERIMENT 04: Morse Code Matrix
    getMorseMatrixShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
            
            // Morse code patterns (1 = dot, 3 = dash, 0 = space)
            float morsePattern(float t, vec2 cell) {
                float seed = random(cell);
                
                // Different morse sequences based on cell position
                float sequence = mod(t + seed * 10.0, 8.0);
                
                if(sequence < 1.0) return 1.0; // dot
                else if(sequence < 2.0) return 0.0; // space
                else if(sequence < 5.0) return 1.0; // dash
                else if(sequence < 6.0) return 0.0; // space
                else if(sequence < 7.0) return 1.0; // dot
                else return 0.0; // space
            }
            
            void main() {
                vec2 st = vUv;
                
                // Multiple communication layers
                vec2 grid1 = st * vec2(20.0, 40.0);
                vec2 grid2 = st * vec2(15.0, 30.0);
                vec2 grid3 = st * vec2(25.0, 50.0);
                
                vec2 cell1 = floor(grid1);
                vec2 cell2 = floor(grid2);
                vec2 cell3 = floor(grid3);
                
                // Morse code timing
                float speed1 = time * 3.0;
                float speed2 = time * 2.5;
                float speed3 = time * 4.0;
                
                // Generate morse patterns
                float morse1 = morsePattern(speed1 - cell1.y * 0.5, cell1);
                float morse2 = morsePattern(speed2 - cell2.y * 0.3, cell2);
                float morse3 = morsePattern(speed3 - cell3.y * 0.7, cell3);
                
                // Cascade effect (messages flow down)
                float cascade1 = smoothstep(0.0, 0.1, fract(st.y * 8.0 - time * 1.5));
                float cascade2 = smoothstep(0.0, 0.1, fract(st.y * 6.0 - time * 2.0));
                float cascade3 = smoothstep(0.0, 0.1, fract(st.y * 10.0 - time * 1.0));
                
                // Apply cascade to morse
                morse1 *= cascade1;
                morse2 *= cascade2;
                morse3 *= cascade3;
                
                // Combine layers
                float pattern = morse1 * 0.7 + morse2 * 0.5 + morse3 * 0.3;
                
                // Add transmission interference
                float interference = sin(st.x * 100.0 + time * 20.0) * 0.1;
                pattern += interference;
                
                // Digital quantization
                pattern = step(0.3, pattern);
                
                vec3 color = vec3(pattern);
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    // EXPERIMENT 05: Plasma Storm
    getPlasmaStormShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            // HSV to RGB conversion
            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }
            
            // Noise function
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                
                float a = dot(vec2(sin(dot(i, vec2(127.1,311.7)))), vec2(43758.5453));
                float b = dot(vec2(sin(dot(i + vec2(1.0, 0.0), vec2(127.1,311.7)))), vec2(43758.5453));
                float c = dot(vec2(sin(dot(i + vec2(0.0, 1.0), vec2(127.1,311.7)))), vec2(43758.5453));
                float d = dot(vec2(sin(dot(i + vec2(1.0, 1.0), vec2(127.1,311.7)))), vec2(43758.5453));
                
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            void main() {
                vec2 st = vUv;
                
                // Multiple plasma layers with different frequencies
                vec2 pos1 = st * 4.0 + vec2(time * 0.5, time * 0.3);
                vec2 pos2 = st * 6.0 + vec2(time * -0.4, time * 0.6);
                vec2 pos3 = st * 8.0 + vec2(time * 0.7, time * -0.2);
                
                // Electric field distortions
                float field1 = sin(pos1.x + sin(pos1.y + time * 2.0) * 2.0) * 0.5 + 0.5;
                float field2 = sin(pos2.x * 1.5 + cos(pos2.y * 1.2 + time * 1.5) * 1.8) * 0.5 + 0.5;
                float field3 = cos(pos3.y + sin(pos3.x * 1.3 + time * 1.8) * 1.5) * 0.5 + 0.5;
                
                // Noise for organic variation
                float n1 = noise(pos1 + time * 0.1);
                float n2 = noise(pos2 * 1.5 + time * 0.15);
                float n3 = noise(pos3 * 0.8 + time * 0.08);
                
                // Combine fields
                float plasma = field1 * 0.4 + field2 * 0.35 + field3 * 0.25;
                plasma += (n1 + n2 + n3) * 0.1;
                
                // Lightning-like discharge patterns
                float lightning = 0.0;
                for(int i = 0; i < 3; i++) {
                    float fi = float(i);
                    vec2 lightPos = st + vec2(sin(time * 2.0 + fi), cos(time * 1.5 + fi)) * 0.3;
                    float dist = length(lightPos - vec2(0.5));
                    lightning += exp(-dist * 8.0) * sin(time * 10.0 + fi * 2.0) * 0.5 + 0.5;
                }
                
                // Energy intensity
                float intensity = plasma + lightning * 0.3;
                intensity = clamp(intensity, 0.0, 1.0);
                
                // Color mapping - electric blues, purples, and whites
                float hue = 0.6 + intensity * 0.2 + sin(time * 0.5) * 0.1;
                float saturation = 0.8 + intensity * 0.2;
                float value = intensity * 0.9 + 0.1;
                
                // Add white hot spots
                if(intensity > 0.8) {
                    value = mix(value, 1.0, (intensity - 0.8) * 5.0);
                    saturation = mix(saturation, 0.0, (intensity - 0.8) * 3.0);
                }
                
                vec3 color = hsv2rgb(vec3(hue, saturation, value));
                
                // Add electric glow
                color += lightning * 0.5 * vec3(0.8, 0.9, 1.0);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    // EXPERIMENT 06: Fluid Dynamics
    getFluidDynamicsShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
            
            // Simplified fluid simulation
            vec2 fluidVelocity(vec2 pos, float t) {
                vec2 vel = vec2(0.0);
                
                // Multiple vortices
                for(int i = 0; i < 4; i++) {
                    float fi = float(i);
                    vec2 center = vec2(
                        0.5 + 0.3 * sin(t * 0.8 + fi * 2.0),
                        0.5 + 0.3 * cos(t * 0.6 + fi * 1.5)
                    );
                    
                    vec2 diff = pos - center;
                    float dist = length(diff);
                    float strength = 0.5 / (1.0 + dist * 8.0);
                    
                    // Vortex rotation
                    vel += strength * vec2(-diff.y, diff.x);
                }
                
                return vel;
            }
            
            void main() {
                vec2 st = vUv;
                
                // Advect particles through fluid field
                vec2 particle_pos = st;
                for(int i = 0; i < 8; i++) {
                    vec2 vel = fluidVelocity(particle_pos, time);
                    particle_pos -= vel * 0.02;
                }
                
                // Create density field
                float density = 0.0;
                
                // Multiple density sources
                for(int i = 0; i < 6; i++) {
                    float fi = float(i);
                    vec2 source = vec2(
                        0.5 + 0.4 * sin(time * 0.5 + fi),
                        0.5 + 0.4 * cos(time * 0.7 + fi * 1.3)
                    );
                    
                    float dist = length(particle_pos - source);
                    density += exp(-dist * 12.0) * (0.8 + 0.2 * sin(time * 3.0 + fi));
                }
                
                // Turbulence
                vec2 turbulence = st * 8.0 + time * 0.5;
                float turb = sin(turbulence.x) * sin(turbulence.y) * 0.1;
                density += turb;
                
                // Pressure waves
                float pressure = sin(length(st - 0.5) * 20.0 - time * 4.0) * 0.2;
                density += pressure;
                
                // Color based on density
                vec3 color = vec3(smoothstep(0.1, 0.8, density));
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    // EXPERIMENT 09: Typography Morph
    getTypographyMorphShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            // SDF for rectangle
            float rectSDF(vec2 p, vec2 size) {
                vec2 d = abs(p) - size;
                return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
            }
            
            // SDF for circle
            float circleSDF(vec2 p, float r) {
                return length(p) - r;
            }
            
            // Letter A approximation
            float letterA(vec2 p) {
                p *= 2.0;
                float bar = rectSDF(p - vec2(0.0, 0.1), vec2(0.4, 0.05));
                float left = rectSDF(p - vec2(-0.2, 0.0), vec2(0.05, 0.8));
                float right = rectSDF(p - vec2(0.2, 0.0), vec2(0.05, 0.8));
                float top = rectSDF(p - vec2(0.0, 0.6), vec2(0.15, 0.05));
                
                return min(min(bar, left), min(right, top));
            }
            
            // Letter B approximation
            float letterB(vec2 p) {
                p *= 2.0;
                float left = rectSDF(p - vec2(-0.15, 0.0), vec2(0.05, 0.8));
                float top = rectSDF(p - vec2(0.05, 0.6), vec2(0.2, 0.05));
                float middle = rectSDF(p - vec2(0.05, 0.0), vec2(0.15, 0.05));
                float bottom = rectSDF(p - vec2(0.05, -0.6), vec2(0.2, 0.05));
                float curve1 = circleSDF(p - vec2(0.1, 0.3), 0.25);
                float curve2 = circleSDF(p - vec2(0.1, -0.3), 0.25);
                
                return min(min(min(left, top), min(middle, bottom)), min(curve1, curve2));
            }
            
            void main() {
                vec2 st = (vUv - 0.5) * 2.0;
                
                // Morphing between letters
                float morph = sin(time * 0.8) * 0.5 + 0.5;
                
                // Create multiple letters at different positions
                float letter1 = letterA(st + vec2(-0.6, 0.0));
                float letter2 = letterB(st + vec2(0.0, 0.0));
                float letter3 = letterA(st + vec2(0.6, 0.0));
                
                // Apply morphing
                letter1 += sin(time * 2.0 + st.x * 5.0) * 0.1;
                letter2 += cos(time * 1.5 + st.y * 4.0) * 0.15;
                letter3 += sin(time * 2.5 + length(st) * 3.0) * 0.12;
                
                // Combine letters
                float letters = min(min(letter1, letter2), letter3);
                
                // Create solid letters
                float pattern = 1.0 - smoothstep(0.0, 0.02, letters);
                
                // Add outline effect
                float outline = 1.0 - smoothstep(0.02, 0.08, letters);
                outline -= pattern;
                
                // Typography effects
                float dissolve = sin(time * 3.0 + st.x * 10.0 + st.y * 8.0) * 0.5 + 0.5;
                pattern *= smoothstep(0.3, 0.7, dissolve);
                
                // Color
                vec3 color = vec3(pattern) + outline * vec3(0.5);
                
                // Add digital distortion
                float distortion = sin(st.y * 50.0 + time * 8.0) * 0.02;
                color.r = pattern * (1.0 + distortion);
                color.g = pattern * (1.0 - distortion * 0.5);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    // EXPERIMENT 25: Chrome Liquid
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

    // EXPERIMENT 26: Neon Genesis (Halftone)
    getNeonGenesisShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            void main() {
                vec2 st = vUv;
                vec2 pos = st * 20.0;
                
                // Create moving halftone pattern
                float pattern = 0.0;
                for(int i = 0; i < 3; i++) {
                    float fi = float(i);
                    vec2 offset = vec2(sin(time * 0.5 + fi), cos(time * 0.3 + fi)) * 2.0;
                    vec2 grid = fract(pos + offset) - 0.5;
                    float dist = length(grid);
                    
                    // Varying dot sizes
                    float dotSize = 0.3 + 0.2 * sin(time * 0.8 + fi * 2.0);
                    pattern += smoothstep(dotSize, dotSize - 0.1, dist);
                }
                
                // Color shifts
                vec3 color1 = vec3(0.9, 0.9, 0.9);
                vec3 color2 = vec3(0.2, 0.2, 0.2);
                
                vec3 finalColor = mix(color2, color1, pattern);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
    }

    // EXPERIMENT 27: Quantum Flux (Flow)
    getQuantumFluxShader() {
        return `
            uniform float time;
            uniform vec2 resolution;
            varying vec2 vUv;
            
            // Perlin noise approximation
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                
                float a = dot(vec2(sin(dot(i, vec2(127.1,311.7)))),vec2(43758.5453));
                float b = dot(vec2(sin(dot(i + vec2(1.0, 0.0), vec2(127.1,311.7)))),vec2(43758.5453));
                float c = dot(vec2(sin(dot(i + vec2(0.0, 1.0), vec2(127.1,311.7)))),vec2(43758.5453));
                float d = dot(vec2(sin(dot(i + vec2(1.0, 1.0), vec2(127.1,311.7)))),vec2(43758.5453));
                
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            void main() {
                vec2 st = vUv;
                
                // Moving organic patterns
                vec2 flowPos = st * 3.0 + vec2(time * 0.1, time * 0.08);
                
                float n1 = noise(flowPos);
                float n2 = noise(flowPos * 2.0 + vec2(time * 0.15));
                float n3 = noise(flowPos * 4.0 - vec2(time * 0.2));
                
                // Combine noise layers
                float pattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
                
                // Create flowing forms
                vec2 distort = vec2(
                    sin(st.y * 8.0 + time + pattern),
                    cos(st.x * 6.0 + time * 0.8 + pattern)
                ) * 0.1;
                
                vec2 flowSt = st + distort;
                float flow = noise(flowSt * 5.0 + time * 0.3);
                
                // Grayscale organic flow
                float intensity = smoothstep(0.3, 0.7, flow + pattern * 0.5);
                vec3 color = vec3(intensity);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
    }

    // Shader method mapping
    getShaderByType(type) {
        switch(type) {
            case 'liquid-metal':
                return this.getLiquidMetalShader();
            case 'geometric-spiral':
                return this.getGeometricSpiralShader();
            case 'pulse-grid':
                return this.getPulseGridShader();
            case 'morse-matrix':
                return this.getMorseMatrixShader();
            case 'plasma-storm':
                return this.getPlasmaStormShader();
            case 'fluid-dynamics':
                return this.getFluidDynamicsShader();
            case 'typography-morph':
                return this.getTypographyMorphShader();
            case 'chrome-liquid':
                return this.getChromeLiquidShader();
            case 'neon-genesis':
                return this.getNeonGenesisShader();
            case 'quantum-flux':
                return this.getQuantumFluxShader();
            default:
                return this.getLiquidMetalShader();
        }
    }

    // Initialize shader
    initShader(canvas, shaderType) {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: false,
            alpha: false
        });
        
        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        const width = rect.width * window.devicePixelRatio;
        const height = rect.height * window.devicePixelRatio;
        
        renderer.setSize(width, height, false);
        canvas.width = width;
        canvas.height = height;
        
        // Shader uniforms
        const uniforms = {
            time: { value: 0.0 },
            resolution: { value: new THREE.Vector2(width, height) }
        };
        
        // Create shader material
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: this.getVertexShader(),
            fragmentShader: this.getShaderByType(shaderType)
        });
        
        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        // Store references
        const id = canvas.dataset.shader || shaderType;
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

// Initialize shader system
document.addEventListener('DOMContentLoaded', function() {
    const shaderManager = new ExperimentShaderManager();
    
    // Initialize all shader canvases
    const canvases = document.querySelectorAll('.experiment-canvas');
    canvases.forEach(canvas => {
        const shaderType = canvas.dataset.shader;
        shaderManager.initShader(canvas, shaderType);
    });
    
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
    
    console.log('DOPPELGANGER - Shader Experiments Loaded');
    console.log('8 high-quality experiments ready');
});