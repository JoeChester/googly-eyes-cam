var width;
var height;

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

// Camera Live Preview
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
        video.src = window.URL.createObjectURL(stream);
        video.play();
    });
}