var startVert = `
varying vec2 uv_vary;

void main() {
  uv_vary = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

var startFrag = `
varying vec2 uv_vary;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  vec3 start;
  start.x = rand(vec2(uv_vary.xy));
  start.y = rand(vec2(uv_vary.x + 1.0, uv_vary.y));
  start.z = rand(vec2(uv_vary.x, uv_vary.y + 2.0));
  gl_FragColor = vec4(start, 1.0);
}
`;

var velocityVert = `
varying vec2 uv_vary;

void main() {
  uv_vary = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

var velocityFrag = `
varying vec2 uv_vary;
uniform sampler2D velTexture;
uniform sampler2D posTexture;
uniform vec3 targetPosition;
uniform float maxVelocity;
uniform float gravityFactor;
uniform float seed;
uniform float seed2;

float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  vec3 inVelocity = texture2D(velTexture, uv_vary).rgb;
  vec3 inPosition = texture2D(posTexture, uv_vary).rgb;
  vec3 targetPos = targetPosition;
  vec3 outVelocity;

  float dist = distance(targetPos, inPosition);
  vec3 direction = normalize(targetPos - inPosition);

  dist = max(dist, 1.0);
  outVelocity = inVelocity + (direction * gravityFactor * 0.01);
  outVelocity.z = 0.0;
  
  if (outVelocity.x > maxVelocity) {
    outVelocity.x = maxVelocity;
  }
  if (outVelocity.y > maxVelocity) {
    outVelocity.y = maxVelocity;
  }
  
  if (outVelocity.x < -maxVelocity) {
    outVelocity.x = -maxVelocity;
  }
  
  if (outVelocity.y < -maxVelocity) {
    outVelocity.y = -maxVelocity;
  }

  vec3 random = 0.05 * vec3(seed, seed2, 0.0) * rand(uv_vary);
  gl_FragColor = vec4(outVelocity + random, 1.0);
}
`;

var positionVert = `
varying vec2 uv_vary;

void main() {
  uv_vary = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

var positionFrag = `
varying vec2 uv_vary;
uniform sampler2D velTexture;
uniform sampler2D posTexture;

void main() {
  vec3 velocity = texture2D(velTexture, uv_vary).rgb;
  vec3 pos = texture2D(posTexture, uv_vary).rgb;

  pos += velocity;
  
  gl_FragColor = vec4( pos, 1.0 );
}  
`;

var particleVert = `
uniform sampler2D posTexture;
uniform float pointSize;
uniform vec3 targetPosition;
varying float dist;

void main() {
  vec3 pos = texture2D(posTexture, position.xy).rgb;
  dist = distance(targetPosition, pos);
  gl_PointSize = pointSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

var particleFrag = `
varying float dist;
uniform float alpha;
uniform vec3 minColor;
uniform vec3 maxColor;

void main() {
  vec4 color;
  float colorFactor = dist / 4.0;
  color.x = minColor.x < maxColor.x ? mix(minColor.x, maxColor.x, colorFactor) : mix(maxColor.x, minColor.x, colorFactor);
  color.y = minColor.y < maxColor.y ? mix(minColor.y, maxColor.y, colorFactor) : mix(maxColor.y, minColor.y, colorFactor);
  color.z = minColor.z < maxColor.z ? mix(minColor.z, maxColor.z, colorFactor) : mix(maxColor.z, minColor.z, colorFactor);
  color.w = 1.0;  
  gl_FragColor = color;
}
`;

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

var initBuffer = function(size, options) {
    options = options || {
            format: THREE.RGBFormat,
            generateMipmaps: false,
            magFilter: THREE.NearestFilter,
            minFilter: THREE.NearestFilter,
            type: THREE.HalfFloatType
        };

    return new THREE.WebGLRenderTarget(size, size, options);
};

var initMaterial = function(vertex, fragment, uniforms) {
    var defaults = {
        uniforms: uniforms,
        vertexShader: vertex,
        fragmentShader: fragment
    };

    return new THREE.ShaderMaterial(defaults);
};

var initMesh = function(size, material) {
    return new THREE.Mesh(
        new THREE.PlaneBufferGeometry( size, size ),
        material
    );
};

var initParticlePoints = function(size, material) {
    var points = new THREE.Geometry();
    var count = size * size;
    for (var i = 0; i < size * size; i++) {
        var pos = new THREE.Vector3((i % size)/size, Math.floor(i/size)/size , 0);
        points.vertices.push(pos);
    }
    return new THREE.Points(points, material);
};

var bufferIndex = 0;

class Particles {
    constructor(renderer, scene, options) {
        this.settings = {
            pointSize: 1.0,
            textureSize: 256,
            gravityFactor: 10.0,
            particleCount: textureSize * textureSize,
            targetPosition: new THREE.Vector3(0.0, 0.0, 0.0),
            lifetime: 5
        };

        this.setSettings(options);

        this.clock = new THREE.Clock(false);

        var textureSize = this.settings.textureSize;
        var bufferSettings = {
            format: THREE.RGBFormat,
            magFilter: THREE.NearestFilter,
            minFilter: THREE.NearestFilter,
            type: THREE.HalfFloatType
        };

        this.buffers = {
            velocity: [
                initBuffer(this.settings.textureSize, bufferSettings),
                initBuffer(this.settings.textureSize, bufferSettings),
            ],
            position: [
                initBuffer(this.settings.textureSize, bufferSettings),
                initBuffer(this.settings.textureSize, bufferSettings),
            ]
        };

        var shaders = {
            velocityVertex: velocityVert,
            velocityFragment: velocityFrag,
            positionVertex: positionVert,
            positionFragment: positionFrag,
            particleVertex: particleVert,
            particleFragment: particleFrag,
            randomVertex: startVert,
            randomFragment: startFrag
        };

        var velocityUniform = {
            velTexture: {type: "t", value: this.buffers.velocity[0]},
            posTexture: {type: "t", value: this.buffers.position[0]},
            targetPosition: {type: "v3", value: this.settings.targetPosition},
            gravityFactor: {type: "f", value: this.settings.gravityFactor},
            maxVelocity: {type: "f", value: this.settings.maxVelocity},
            randomness: {type: "f", value: this.settings.randomness},
            seed: {type: "f", value: 0.0},
            seed2: {type: "f", value: 0.5}
        };

        var positionUniform = {
            velTexture: {type: "t", value: this.buffers.velocity[0]},
            posTexture: {type: "t", value: this.buffers.position[0]}
        };

        console.log(this.settings.minColor);
        var minColor = new THREE.Color();
        var maxColor = new THREE.Color();
        minColor.setStyle(this.settings.minColor);
        maxColor.setStyle(this.settings.maxColor);


        var particleUniform = {
            pointSize: {type: "f", value: this.pointSize},
            posTexture: {type: "t", value: this.buffers.position[0]},
            targetPosition: {type: "v3", value: this.settings.targetPosition},
            alpha: {type: "f", value: 0.5},
            minColor: {type: "c", value: minColor},
            maxColor: {type: "c", value: maxColor}
        };

        this.uniforms = {
            velocity: velocityUniform,
            position: positionUniform,
            particles: particleUniform,
        };

        var particleMaterialOptions = {
                transparent: true,
                wireframe: false,
                blending: THREE.NormalBlendingg,
                depthWrite: false
        };

        var velShaderMaterial = initMaterial(shaders.velocityVertex, shaders.velocityFragment, this.uniforms.velocity);
        var posShaderMaterial = initMaterial(shaders.positionVertex, shaders.positionFragment, this.uniforms.position);
        var particlesShaderMaterial = initMaterial(shaders.particleVertex, shaders.particleFragment, this.uniforms.particles, particleMaterialOptions);
        var startShaderMaterial = initMaterial(shaders.randomVertex, shaders.randomFragment, this.uniforms.start);

        this.scenes = {
            velocity: new THREE.Scene(),
            position: new THREE.Scene(),
            display: scene,
            random: new THREE.Scene()
        };

        this.scenes.velocity.add(initMesh(textureSize, velShaderMaterial));
        this.scenes.position.add(initMesh(textureSize, posShaderMaterial));
        this.scenes.random.add(initMesh(textureSize, startShaderMaterial));
        this.scenes.display.add(initParticlePoints(textureSize, particlesShaderMaterial));

        this.processor = new THREE.OrthographicCamera(-textureSize / 2, textureSize / 2, textureSize / 2, -textureSize / 2, -1, 0);

        renderer.render(this.scenes.random, this.processor, this.buffers.velocity[0]);
        renderer.render(this.scenes.random, this.processor, this.buffers.position[0]);
        this.clock.start();
    }

    update() {
        update(renderer, this.scenes, this.processor, this.buffers, this.uniforms, this.settings.gravityFactor, this.settings.maxVelocity, this.settings.randomness);
    }

    changeTargetPosition(position) {
        this.uniforms.velocity.targetPosition.value = new THREE.Vector3(position.x, position.y, 0);
        this.uniforms.particles.targetPosition.value = new THREE.Vector3(position.x, position.y, 0);
    }

    setSettings(options) {
        for (let option of Object.keys(options)) {
            this.settings[option] = options[option];
        }
    }

    changeMinColor(color) {
        var minColor = new THREE.Color();
        minColor.setStyle(color);
        this.uniforms.particles.minColor.value = minColor;
    }

    changeMaxColor(color) {
        var maxColor = new THREE.Color();
        maxColor.setStyle(color);
        this.uniforms.particles.maxColor.value = maxColor;
    }
}

var update = function(renderer, scenes, processor, buffers, uniforms, gravityFactor, maxVelocity, randomness){
    var newBufferIndex;
    if (bufferIndex == 0)
        newBufferIndex = 1;
    else
        newBufferIndex = 0;

    uniforms.velocity.gravityFactor.value = gravityFactor;
    uniforms.velocity.maxVelocity.value = maxVelocity;

    if (randomness == true) {
        uniforms.velocity.seed.value  = randomRange(-0.1, 0.1);
        uniforms.velocity.seed2.value = randomRange(-0.1, 0.1);
    }

    uniforms.velocity.velTexture.value = buffers.velocity[bufferIndex];
    uniforms.position.posTexture.value = buffers.position[bufferIndex];

    renderer.render(scenes.velocity, processor, buffers.velocity[newBufferIndex]);

    uniforms.position.velTexture.value = buffers.velocity[newBufferIndex];
    uniforms.position.posTexture.value = buffers.position[bufferIndex];

    renderer.render(scenes.position, processor, buffers.position[newBufferIndex]);

    uniforms.particles.posTexture.value = buffers.position[newBufferIndex];

    bufferIndex = newBufferIndex;
};

