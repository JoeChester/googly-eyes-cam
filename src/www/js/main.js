var width;
var height;
var ip;

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

    $('#x3dom').attr('height', height);      
    $('#x3dom').attr('width', width);

    $('#video').attr('height', height);      
    $('#video').attr('width', width);        
};
$(document).ready(jqUpdateSize);    
$(window).resize(jqUpdateSize);    

ip = getParameterByName("ip");
console.log(ip);

// Camera Live Preview
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        video.src = window.URL.createObjectURL(stream);
        video.play();
    });
}

function photo(){
    console.log("PHOTO!");
}

function settings(){
    window.location = "/?ip=" + ip; 
}