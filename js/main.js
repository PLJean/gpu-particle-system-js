var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
var backgroundColor = 0x000000;
var width = $(window.document).width();
var height = $(window.document).height();

var renderer = new THREE.WebGLRenderer({antialias: true });
renderer.setClearColor(backgroundColor, 1);
renderer.setSize(width, height);

var position = new THREE.Vector3(0,0,0);

var particleOptions = {
    textureSize: 512,
    gravityFactor: 1.0,
    explodeRate: 0.001,
    pointSize: 1.2,
    targetPosition: position,
    start: new THREE.Vector3(0.0, 0.0 , 0.0),
    maxVelocity: 0.15,
    minColor: "#ffae23",
    maxColor: "#bf0f23",
    randomness: true,
    resistance: 0.0
};

var particles = new Particles(renderer, scene, particleOptions);

var gui = new dat.GUI();
gui.add(particles.settings, 'gravityFactor', 0.00, 3.0);
gui.add(particles.settings, 'maxVelocity', 0.0, 1.0);

var randomness = gui.add(particles.settings, 'randomness');
var minColor = gui.addColor( particles.settings, 'minColor');
var maxColor = gui.addColor( particles.settings, 'maxColor');

minColor.onChange(function(color) {particles.changeMinColor(color)});
maxColor.onChange(function(color) {particles.changeMaxColor(color)});

gui.domElement.onclick = function(event) {
    event.stopPropagation();
};

camera.position.set( 0, 0, 10 );
camera.lookAt( new THREE.Vector3(0,0,0) );
scene.add(camera);
document.body.appendChild( renderer.domElement );

function screenToWorld(x, y) {
    var vector = new THREE.Vector3(x, y, 0.5);
    vector.set(
        ( event.clientX / window.innerWidth ) * 2 - 1,
        - ( event.clientY / window.innerHeight ) * 2 + 1,
        0.5 );
    vector.unproject( camera );
    var dir = vector.sub( camera.position ).normalize();
    var distance = - camera.position.z / dir.z;
    return camera.position.clone().add( dir.multiplyScalar( distance ) );
}

var timer;
var down = false;
var space = false;

$(renderer.domElement).mousedown(function(event){
    down = true;
    setGravity(event);
});

$(renderer.domElement).mouseup(function(event) {
    down = false;
});

$(renderer.domElement).mousemove(function(event) {
    if (down == true) {
        setGravity(event);
    }
});

var starCount = 1000;

var points1 = new THREE.Geometry();
var starMaterial1 = new THREE.PointsMaterial( { size: 1, sizeAttenuation: false, color: 0xffffff } );
for (let i = 0; i < starCount; i++) {
    let x = randomRange(-7.5, 7.5);
    let y = randomRange(-7.5, 7.5);
    let z = randomRange(-7.5, 7.5);
    let pos = new THREE.Vector3(x, y, z);
    points1.vertices.push(pos);
}

var stars1 = new THREE.Points(points1, starMaterial1);
scene.add(stars1);

var points2 = new THREE.Geometry();
var starMaterial2 = new THREE.PointsMaterial( { size: 1.5, sizeAttenuation: false, color: 0xffffff } );
for (let i = 0; i < starCount; i++) {
    let x = randomRange(-7.5, 7.5);
    let y = randomRange(-7.5, 7.5);
    let z = randomRange(-7.5, 7.5);
    let pos = new THREE.Vector3(x, y, z);
    points2.vertices.push(pos);
}

var stars2 = new THREE.Points(points2, starMaterial2);
scene.add(stars2);

$(function() {
    $(document).keyup(function(evt) {
        if (evt.keyCode == 32) {
            space = false;
        }
    }).keydown(function(evt) {
        if (evt.keyCode == 32) {
            space = true;
            console.log('space')
        }
    });
});

function setGravity(event) {
    console.log(event);
    if (event.clientX && event.clientY) {
        var pos = screenToWorld(event.clientX, event.clientY);
        particles.changeTargetPosition(pos);
    }
}

function render() {
    particles.update();
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

render();