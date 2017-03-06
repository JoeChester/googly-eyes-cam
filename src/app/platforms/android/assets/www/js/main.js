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

//JSFEAT SETUPS
var img_u8, ii_sum, ii_sqsum, ii_tilted, edg, ii_canny;

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
    var w = width;
    var h = height;
    img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    edg = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    ii_sum = new Int32Array((w+1)*(h+1));
    ii_sqsum = new Int32Array((w+1)*(h+1));
    ii_tilted = new Int32Array((w+1)*(h+1));
    ii_canny = new Int32Array((w+1)*(h+1));
}

function localTracking(imageData){
    console.log("localTracking()");
    //tracking.track('#photo', localTracker);
    jsfeat.imgproc.grayscale(imageData.data, width, height, img_u8);
    jsfeat.imgproc.equalize_histogram(img_u8, img_u8);
    jsfeat.haar.edges_density = 0.13;
    jsfeat.imgproc.compute_integral_image(img_u8, ii_sum, ii_sqsum, jsfeat.haar.frontalface.tilted ? ii_tilted : null);

    var faces = jsfeat.haar.detect_multi_scale(ii_sum, ii_sqsum, ii_tilted, null, img_u8.cols, img_u8.rows, jsfeat.haar.frontalface, 1.15, 2);
    faces = jsfeat.haar.group_rectangles(faces, 1);

    var eyes = jsfeat.haar.detect_multi_scale(ii_sum, ii_sqsum, ii_tilted, null, img_u8.cols, img_u8.rows, jsfeat.haar.eye, 1.15, 2);
    eyes = jsfeat.haar.group_rectangles(eyes, 1);
    localTrackingResults(eyes, faces)
}

function localTrackingResults(localEyes, localFaces){
    pendingRequest = false;
    console.log("found " + localEyes.length + " eyes locally!");
    console.log(localEyes.toString());
    var allEyes = convertLocalTrackingFormat(localEyes, localFaces);
    //drawDebugSquares(allEyes);
    setEyeData(allEyes);
    takePhoto();
}

function checkEyeInFace(eye, face){
    if(eye.x > face.x && (eye.x + eye.width) < (face.x + face.width) && eye.y > face.y && (eye.y + eye.height) > (face.y + face.height)){
        return true;
    } else {
        return false;
    }
}

function checkEyeInAllFaces(eye, faces){
    for(var i in faces){
        if(checkEyeInFace(eye, faces[i])){
            return true;
        }
    }
    return false;
}

function convertLocalTrackingFormat(localEyes, localFaces){
    var allEyes = [];
    for(var i in localEyes){
        if(checkEyeInAllFaces(localEyes[i], localFaces)){
            var eye = {};
            eye.x = 0;
            eye.y = 0;
            eye.ex = localEyes[i].x;
            eye.ey = localEyes[i].y;
            eye.ew = localEyes[i].width;
            eye.eh = localEyes[i].height;
            allEyes.push(eye);
        }
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