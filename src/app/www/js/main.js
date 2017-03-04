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
    x3dCanvas = x3dCanvas = document.getElementById('x3dom-x3dom-canvas');
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
    $('.button-container').addClass('hidden');
    $('#photo').removeClass('hidden');
    setTimeout(function(){
        window.canvas2ImagePlugin.saveImageDataToLibrary(
            function(msg){
                console.log(msg);
                $('.button-container').removeClass('hidden');
                $('#photo').addClass('hidden');
            },
            function(err){
                console.log(err);
                $('.button-container').removeClass('hidden');
                $('#photo').addClass('hidden');
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
        ctx.drawImage(this, 0, 0, photo.width, photo.height);
        if(saveNextFrame){
            saveNextFrame = false;
            savePhoto();
        }
    }
    img.src = picture;
    sendToServer();
    
}

function takePhoto() {
    if(!CameraPreview.takePicture({
        maxWidth: width,
        maxHeight: height
    })){
        console.error("unable to take a photo, trying again!");
        setTimeout(takePhoto, 500);
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
        url: "http://localhost/ul.php",
        data: {
            imgBase64: dataURL
        }
    }).done(function (o) {
        console.log('saved');
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
    if (typeof event.data == "string") {
        var allEyes = JSON.parse(event.data);
        console.log("found "  + allEyes.length +  " eyes.");
        dCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
        drawDebugSquares(allEyes);
    }
    //Send the next frame after this one was received!
    doStream();
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
    connect(ip);
    //setInterval(doStream, 100);

}, false);

// Camera Live Preview
/*
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        video.src = window.URL.createObjectURL(stream);
        video.play();
    });
}
*/