function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function ok(){
    var ip = $("#ip").val();
    if(!ip || ip == ""){
        $("#ip").addClass("settings-error");
        $("#ip").focus();
        return;
    }
    console.log(ip);
    window.location = "index.html?ip=" + ip;
}

$(function(){
    $("#ip").val(getParameterByName("ip") || "localhost:9000");
    $("#ip").focus();
});