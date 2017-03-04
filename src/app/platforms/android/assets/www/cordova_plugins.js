cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/cordova-plugin-camera-preview/www/CameraPreview.js",
        "id": "cordova-plugin-camera-preview.CameraPreview",
        "clobbers": [
            "CameraPreview"
        ]
    },
    {
        "file": "plugins/cordova-mm-canvas2image/www/Canvas2ImagePlugin.js",
        "id": "cordova-mm-canvas2image.Canvas2ImagePlugin",
        "clobbers": [
            "window.canvas2ImagePlugin"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{}
// BOTTOM OF METADATA
});