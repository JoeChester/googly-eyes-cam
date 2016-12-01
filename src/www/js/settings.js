$(function(){
    $("#ip").focus();
});

function ok(){
    var ip = $("#ip").val();
    if(!ip || ip == ""){
        $("#ip").addClass("settings-error");
        $("#ip").focus();
        return;
    }
    console.log(ip);
    window.location = "cam.html?ip=" + ip;
}