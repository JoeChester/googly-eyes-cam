var width;
var height;
var ip;
var rs;

var photo = document.getElementById('photo');
var debugCanvas = document.getElementById('debugCanvas');
var x3dElem = document.getElementById('x3dom');
var x3dCanvas;
var ctx = photo.getContext('2d');
var dCtx = debugCanvas.getContext('2d');

var socket = null;
var isOpen = false;

var saveNextFrame = false;

var pendingRequest = false;
var isSavingPhoto = false;

var localTracker;

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function jqUpdateSize() {
    // Get the dimensions of the viewport
    width = $(window).width();
    height = $(window).height();

    $('.fullscreen').attr('height', height);
    $('.fullscreen').attr('width', width);
}

//Deprecated Function,  still here as lookup
function video2CanvasOld() {
    var _videoWidth = video.videoWidth;
    var _videoHeight = video.videoHeight;
    var videoRatio = _videoWidth / _videoHeight;
    var currentHeight = $('#video').innerHeight();
    var currentWidth = videoRatio * currentHeight;
    var anchorX = (width / 2) - (currentWidth / 2);
    ctx.drawImage(video, anchorX, 0, currentWidth, currentHeight);
}

//Deprecated Function,  still here as lookup
function snapshotOld() {
    video2CanvasOld();
    x3dCanvas = document.getElementById('x3dom-x3dom-canvas');
    ctx.drawImage(x3dCanvas, 0, 0, width, height);
}

function video2Canvas() {
    CameraPreview.takePicture({
        maxWidth: width,
        maxHeight: height
    });
}

function snapshot(){
    saveNextFrame = true;
    takePhoto();
}

function savePhoto(){
    isSavingPhoto = true;
    $('.button-container').addClass('hidden');
    $('#photo').removeClass('hidden');

    if(!canvas3){
        canvas3 = document.getElementById('threejsCanvas');
    }

    ctx.drawImage(canvas3, 0, 0, width, height);

    //small preview timeout
    setTimeout(function(){
        window.canvas2ImagePlugin.saveImageDataToLibrary(
            function(msg){
                console.log(msg);
                $('.button-container').removeClass('hidden');
                $('#photo').addClass('hidden');
                isSavingPhoto = false;
            },
            function(err){
                console.log(err);
                $('.button-container').removeClass('hidden');
                $('#photo').addClass('hidden');
                isSavingPhoto = false;
            },
            document.getElementById('photo')
        ); 
    }, 50);
}

function takePictureCallback(picture) {
    var dbg_img = document.getElementById('debugImage');
    dbg_img.src = picture;

    var img = new Image();
    img.onload = function() {
        //Dont Overdraw a saving photo request
        if(!isSavingPhoto){
            ctx.drawImage(this, 0, 0, photo.width, photo.height);
        }
        if(saveNextFrame){
            saveNextFrame = false;
            savePhoto();
        }
        pendingRequest = true;
        if(rs){
            sendToServer();
        } else {
            localTracking(ctx.getImageData(0, 0, photo.width, photo.height));
        }
        
    }
    img.src = picture;
}

function takePhoto() {
    if(!CameraPreview.takePicture({
        maxWidth: width,
        maxHeight: height
    })){
        //console.error("unable to take a photo, trying again!");
        if(!pendingRequest){
            setTimeout(takePhoto, 500);
        }
    }
}

function settings() {
    window.location = "settings.html?ip=" + ip + "&rs=" + rs;
}

function resetWhite() {
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.fillStyle = "white";
    ctx.fill();
}

// POST to PHP saver script (ul.php) (DEBUG/DEV function)
function saveToServer() {
    var dataURL = photo.toDataURL();

    $.ajax({
        type: "POST",
        url: ip + "/kibucam/ul.php",
        data: {
            imgBase64: dataURL
        }
    }).done(function (o) {
        console.log('saved');
        isSavingPhoto = false;
    });
}

// Web Socket Functions
function doStream() {
    if (isOpen) {
        if (socket.bufferedAmount == 0) {
            video2Canvas();
        }
    }
}

function initLocalTracking(){
    localTracker = new tracking.ObjectTracker(['face']);
    localTracker.setInitialScale(4);
    localTracker.setStepSize(2);
    localTracker.setEdgesDensity(0.1);
    localTracker.on('track', function(event) {
        localTrackingResults(event.data);
    });
}

function localTracking(imageData){
    console.log("localTracking()");
    //tracking.track('#photo', localTracker);
    setTimeout(function(){
        tracking.track('#photo', localTracker);
    }, 10);   
}

function localTrackingResults(localFaces){
    pendingRequest = false;
    console.log("found " + localFaces.length + " faces locally!");
    var allEyes = convertLocalTrackingFormat(localFaces);
    //drawDebugSquares(allEyes);
    setEyeData(allEyes);
    takePhoto();
}

function convertFaceFormat(localFaces){
     var allEyes = [];
    for(var i in localFaces){
        var eye = {};
        eye.x = 0;
        eye.y = 0;
        eye.ex = localFaces[i].x;
        eye.ey = localFaces[i].y;
        eye.ew = localFaces[i].width;
        eye.eh = localFaces[i].height;
        allEyes.push(eye);
    }
    return allEyes;
}

function convertLocalTrackingFormat(localFaces){
    var allEyes = [];
    for(var i in localFaces){
        var eyeLeft = {};
        var eyeRight = {};
        //Approximation of Eyes due to insufficient tracking
        var unitX = (localFaces[i].width) / 8;
        var unitY = (localFaces[i].height) / 4;

        eyeLeft.x = 0;
        eyeLeft.y = 0;
        eyeLeft.ex = localFaces[i].x + (unitX*2);
        eyeLeft.ey = localFaces[i].y + unitY;
        eyeLeft.ew = unitX*2;
        eyeLeft.eh = unitY;

        eyeRight.x = 0;
        eyeRight.y = 0;
        eyeRight.ex = localFaces[i].x + (unitX*5);
        eyeRight.ey = localFaces[i].y + unitY;
        eyeRight.ew = unitX*2;
        eyeRight.eh = unitY;

        allEyes.push(eyeLeft);
        allEyes.push(eyeRight);
    }
    return allEyes;
}

function sendToServer() {
    var dataURL = photo.toDataURL("image/jpeg", 0.5);
    if (isOpen) {
        socket.send(dataURL);
    }
}

function statusButton(connected){
    $('#statusButton').removeClass('red');
    $('#statusButton').removeClass('green');
    if(connected){
        $('#statusButton').addClass('green');
    } else {
        $('#statusButton').addClass('red');
    }
}

function handleOpen() {
    console.log("Connected to Websocket!");
    isOpen = true;
    statusButton(true);
    takePhoto();
}

function drawDebugSquares(allEyes){
    dCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
    for (var i in allEyes) {
        dCtx.lineWidth = 3;
        dCtx.strokeStyle = '#FF3300';
        dCtx.beginPath();
        //IMPORTANT! Eye Center is ((x+ex) + (x+ex+ew)/2)!!!!!!!
        dCtx.rect(allEyes[i].x + allEyes[i].ex ,allEyes[i].y + allEyes[i].ey, allEyes[i].ew, allEyes[i].eh);
        dCtx.stroke();
    }
}

function handleMessage(event) {
    pendingRequest = false;
    if (typeof event.data == "string") {
        var allEyes = JSON.parse(event.data);
        console.log("found "  + allEyes.length +  " eyes.");
        //console.log(allEyes[0].eh + " : " + allEyes[0].ew);
        //console.log(window.height + " : " + window.width);
        //drawDebugSquares(allEyes);
        setEyeData(allEyes);
    }
    //Send the next frame after this one was received!
    takePhoto();
}

function debugSquare() {
    var myW = 10;
    dCtx.strokeStyle = '#FF3300';
    dCtx.rect(debugCanvas.width / 2 - (myW / 2), debugCanvas.height / 2 - (myW / 2), myW, myW);
    dCtx.stroke();
}

function handleClose(event) {
    console.log("Connection closed.");
    statusButton(false);
    socket = null;
    isOpen = false;
}

function connect(ip) {
    socket = new WebSocket("ws://" + ip);
    socket.onopen = handleOpen;
    socket.onmessage = handleMessage;
    socket.onclose = handleClose;
}

$(document).ready(jqUpdateSize);
$(window).resize(jqUpdateSize);

function resync(){
    if(socket && isOpen){
        socket.close()
    }
    setTimeout(function(){
        connect(ip);
    }, 200)
    
}

document.addEventListener('deviceready', function () {

    if(typeof(Worker) !== "undefined"){
        console.log("WebWorker Supported!");
    }else{
        console.log("WebWorker not supported!");
    }

    initEye3D();

    CameraPreview.startCamera({
        x: 0,
        y: 0,
        width: width,
        height: height,
        camera: "front",
        tapPhoto: false,
        previewDrag: false,
        toBack: true
    });
    console.log('camera started!');

    CameraPreview.setOnPictureTakenHandler(takePictureCallback);

    console.log('camera callback handler set!');

    ip = getParameterByName("ip");
    rs = getParameterByName("rs") == "true";

    if(rs){
        connect(ip);
    } else { //disable resync/connection button
        $('#statusButton').addClass('hidden');
        initLocalTracking();
        takePhoto();
    }
}, false);