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
    var rs = $("#rs").prop("checked");

    if(!ip || ip == "" && rs){
        $("#ip").addClass("settings-error");
        $("#ip").focus();
        return;
    }

    if (typeof(Storage) !== "undefined") {
        localStorage.setItem("ip", ip);
        localStorage.setItem("rs", rs);
    }
    
    console.log(ip);
    console.log(rs);
    window.location = "index.html?ip=" + ip + "&rs=" + rs;
}

$(function(){

    var ip;
    var rs = true;

    if (typeof(Storage) !== "undefined") {
        ip = localStorage.getItem("ip");
        rs = localStorage.getItem("rs") == "true";
    }

    if(!ip) ip = getParameterByName("ip");
    if(!rs) rs = getParameterByName("rs") == "true";

    $("#ip").val(ip || "192.168.2.63:9000");
    $("#rs").prop("checked", rs);
    
    $("#ip").focus();
});