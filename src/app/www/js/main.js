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

function takePictureCallback(picture) {
    var dbg_img = document.getElementById('debugImage');
    dbg_img.src = picture;

    var img = new Image();
    img.onload = function() {
        ctx.drawImage(this, 0, 0, photo.width, photo.height);
    }
    img.src = picture;

    sendToServer();
    if(saveNextFrame){
        saveNextFrame = false;
        //TODO: Combine Canvases and Save // Screenshot maybe?
    }
}

function takePhoto() {
    CameraPreview.takePicture({
        maxWidth: width,
        maxHeight: height
    });
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

// POST to PHP saver script (ul.php)
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
    console.log("doSteam()")
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

function handleOpen() {
    console.log("Connected to Websocket!");
    isOpen = true;
}

function handleMessage(event) {
    if (typeof event.data == "string") {
        var allEyes = JSON.parse(event.data);
        console.log(allEyes);
        dCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);
        for (var i in allEyes) {
            dCtx.beginPath();
            dCtx.arc(
                allEyes[i].x + allEyes[i].ex,
                allEyes[i].y + allEyes[i].ey,
                (allEyes[i].ew + allEyes[i].ew) / 4, 0, 2 * Math.PI,
                false
            );
            dCtx.fillStyle = 'green';
            dCtx.fill();
            dCtx.lineWidth = 3;
            dCtx.strokeStyle = '#FF3300';
            dCtx.stroke();
        }
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