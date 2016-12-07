var width;
var height;
var ip;

var video = document.getElementById('video');
var photo = document.getElementById('photo');
var x3dElem = document.getElementById('x3dom');
var x3dCanvas;
var ctx = photo.getContext('2d');

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function jqUpdateSize(){
    // Get the dimensions of the viewport
    width = $(window).width();
    height = $(window).height();

    $('.fullscreen').attr('height', height);      
    $('.fullscreen').attr('width', width);       
}

function snapshot(){

    var _videoWidth = video.videoWidth;
    var _videoHeight = video.videoHeight;
    var videoRatio = _videoWidth / _videoHeight;
    console.log(videoRatio);

    var currentHeight = $('#video').innerHeight();
    console.log(currentHeight);

    var currentWidth = videoRatio * currentHeight;
    console.log(currentWidth);

    var anchorX = (width / 2) - (currentWidth / 2);
    console.log(anchorX);


    ctx.drawImage(video, anchorX, 0, currentWidth, currentHeight);
    x3dCanvas = x3dCanvas = document.getElementById('x3dom-x3dom-canvas');
    ctx.drawImage(x3dCanvas, 0, 0, width, height);

    saveToServer();

}

function settings(){
    window.location = "/?ip=" + ip; 
}

function resetWhite(){
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.fillStyle = "white";
  ctx.fill();
}

// POST to PHP saver script (ul.php)
function saveToServer(){
  var dataURL = photo.toDataURL();

  $.ajax({
    type: "POST",
    url: "http://localhost/ul.php",
    data: {
      imgBase64: dataURL
    }
  }).done(function(o) {
    console.log('saved');
  });
}

$(document).ready(jqUpdateSize);    
$(window).resize(jqUpdateSize);  

ip = getParameterByName("ip");

// Camera Live Preview
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        video.src = window.URL.createObjectURL(stream);
        video.play();
    });
}