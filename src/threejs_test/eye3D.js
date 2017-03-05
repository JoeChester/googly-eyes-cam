//Three.js core objects
var scene3, camera3, renderer3, light3;
var tmpMesh;

//Eye 3D Mesh objects
var eyeTexture, eyeMaterial, eyeGeometry;
var eyeRadius = 25;
var maxEyeCount = 20;

//Premise: Just Initialize like 20 eyes on startup or so..
var activeEyePool = [];
var inactiveEyePool = []; 

var eyeData = [];
var eyeCoordinates = [];

var demoEyes2 = [
    {x: 0, ex: 100, y: 0, ey: 100, ew: 20, eh: 20},
    {x: 0, ex: 200, y: 0, ey: 110, ew: 16, eh: 17}
    ];
var demoEyes3 = [
    {x: 0, ex: 1200, y: 0, ey: 600, ew: 16, eh: 17},
    {x: 0, ex: 860, y: 0, ey: 700, ew: 31, eh: 26},
    {x: 0, ex: 970, y: 0, ey: 440, ew: 39, eh: 40}
    ];
var demoEyes4 = [
    {x: 0, ex: 1300, y: 0, ey: 590, ew: 10, eh: 9},
    {x: 0, ex: 500, y: 0, ey: 450, ew: 46, eh: 32},
    {x: 0, ex: 400, y: 0, ey: 710, ew: 67, eh: 60},
    {x: 0, ex: 100, y: 0, ey: 800, ew: 78, eh: 67}
    ]

function init(width, height) {
    scene3 = new THREE.Scene();
    // Setup cameta with 45 deg field of view and same aspect ratio
    var aspect = width / height;
    camera3 = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    // Set the camera to 400 units along `z` axis
    camera3.position.set(0, 0, 400);
    renderer3 = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3.setSize(width, height);
    renderer3.shadowMap.enabled = true;
    renderer3.domElement.id = "threejsCanvas";
    document.body.appendChild(renderer3.domElement);
}

function initLight() {
    light3 = new THREE.SpotLight(0xffffff);
    // Position the light slightly to a side to make 
    // shadows look better.
    light3.position.set(400, 100, 1000);
    light3.castShadow = true;
    scene3.add(light3);
    scene3.add( new THREE.AmbientLight( 0x999999, 0.2 ) );
    camera3.add(new THREE.PointLight( 0xffffff, 1 ));
}

function initEyes(){
    eyeTexture = THREE.ImageUtils.loadTexture("eye_texture.jpg");
    eyeMaterial = new THREE.MeshPhongMaterial( {
		color: 0xffffff, 
		specular: 0x050505,
		shininess: 50,
		map: eyeTexture
	} );
    eyeGeometry = new THREE.SphereGeometry(eyeRadius, 16, 16);

    // modify UVs to accommodate MatCap texture
    var faceVertexUvs = eyeGeometry.faceVertexUvs[0];
	for ( i = 0; i < faceVertexUvs.length; i ++ ) {
		var uvs = faceVertexUvs[i];
		var face = eyeGeometry.faces[i];
		for ( var j = 0; j < 3; j ++ ) {
			uvs[j].x = face.vertexNormals[j].x * 0.5 + 0.5;
			uvs[j].y = face.vertexNormals[j].y * 0.5 + 0.5;
		}
	}
}

function createEye(){
    var eyeMesh = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeMesh.receiveShadow = true;
    eyeMesh.castShadow = true;
    //Do the "googly" rotation for the eye, so that it can rotate
    //around the world axis later
    eyeMesh.rotateY(-0.2); 
    //TODO: Start with random Z rotation for each eye!
    inactiveEyePool.push(eyeMesh);
    scene3.add(eyeMesh)
}

function initPlane() {
    // The plane needs to be large to be sure it'll always intersect
    var tmpGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
    tmpGeometry.position = new THREE.Vector3(0, 0, 0);
    tmpMesh = new THREE.Mesh(tmpGeometry);
}

function synchronizePools(){
    if(eyeData.length <= 0) return; //dont sync if no eyeData available
    var diff, i;
    if(activeEyePool.length < eyeData.length){
        //Add up active from inactive Pool
        diff = eyeData.length - activeEyePool.length;
        for(i = 0; i < diff; i++){
            activeEyePool.push(inactiveEyePool.pop());
        }
    }
    else if(activeEyePool.length > eyeData.length){
        //Remove down from active to inactive Pool
        diff = activeEyePool.length - eyeData.length;
        for(i = 0; i < diff; i++){
            inactiveEyePool.push(activeEyePool.pop());
        }
    }
}

function hideInactiveEyes(){
    for(var i in inactiveEyePool){
        //Large number to move completely from screen
        inactiveEyePool[i].position.x = 3000; 
    }
}

function moveEye(eyeMesh, pointX, pointY){
    // x y position with [0,0] in the center of the document
    // and ranging from -1.0 to +1.0 with `y` axis inverted.
    pointX = (pointX / window.innerWidth) * 2 - 1;
    pointY = - (pointY / window.innerHeight) * 2 + 1;

    var vector = new THREE.Vector3(pointX, pointY, 0.0);
    // Unproject camera distortion (fov, aspect ratio)
    vector.unproject(camera3);
    var norm = vector.sub(camera3.position).normalize();
    // Cast a line from our camera to the tmpMesh and see where these
    // two intersect. That's our 2D position in 3D coordinates.
    var ray = new THREE.Raycaster(camera3.position, norm);
    var intersects = ray.intersectObject(tmpMesh);

    var point = intersects[0].point;
    eyeMesh.position.x = point.x;
    eyeMesh.position.y = point.y;
}

// Update position of objects in the scene
function update() {
    synchronizePools();
    hideInactiveEyes();
    for(var i in eyeData){
        moveEye(activeEyePool[i], (eyeData[i].x + eyeData[i].ex), (eyeData[i].y + eyeData[i].ey));
    }
    //Rotate all eye meshes!
    for(var i in activeEyePool){
        activeEyePool[i].rotateOnAxis(new THREE.Vector3(0.3,0,1).normalize(), 2 * Math.PI/180);
    }
    for(var i in inactiveEyePool){
        inactiveEyePool[i].rotateOnAxis(new THREE.Vector3(0.3,0,1).normalize(), 2 * Math.PI/180);
    }
}

// Redraw entire scene
function render() {
    update();
    renderer3.setClearColor(0x000000, 0);
    renderer3.render(scene3, camera3);
    // Schedule another frame
    requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', function(event) {
    // Initialize everything and start rendering
    init(window.innerWidth, window.innerHeight);
    initEyes();
    initLight();
    initPlane();
    for(var i = 0; i < maxEyeCount; i++){
        createEye();
    }
    eyeData = demoEyes2;
    requestAnimationFrame(render);
});
