package org.devgeeks.Canvas2ImagePlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Calendar;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PermissionHelper;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;

import android.Manifest;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Base64;
import android.util.Log;
import android.content.Context;
import android.content.pm.PackageManager;



/**
 * Canvas2ImagePlugin.java
 *
 * Android implementation of the Canvas2ImagePlugin for iOS.
 * Inspirated by Joseph's "Save HTML5 Canvas Image to Gallery" plugin
 * http://jbkflex.wordpress.com/2013/06/19/save-html5-canvas-image-to-gallery-phonegap-android-plugin/
 *
 * @author Vegard Løkken <vegard@headspin.no>
 */
public class Canvas2ImagePlugin extends CordovaPlugin {
  public static final String ACTION = "saveImageDataToLibrary";

  protected final static String[] permissions = { Manifest.permission.WRITE_EXTERNAL_STORAGE };
  public static final int WRITE_CODE = 1;
  public static final int PERMISSION_DENIED_ERROR = 20;
  private CallbackContext callbackContext;
  private Bitmap bmp;

  @Override
  public boolean execute(String action, JSONArray data,
      CallbackContext callbackContext) throws JSONException {

    if (action.equals(ACTION)) {

      String base64 = data.optString(0);
      if (base64.equals("")) // isEmpty() requires API level 9
        callbackContext.error("Missing base64 string");

      // Create the bitmap from the base64 string
      Log.d("Canvas2ImagePlugin", base64);
      byte[] decodedString = Base64.decode(base64, Base64.DEFAULT);
      Bitmap bmp = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
      if (bmp == null) {
        callbackContext.error("The image could not be decoded");
      } else {
        this.bmp = bmp;
        this.callbackContext = callbackContext;

        resolvePermission();
      }

      return true;
    } else {
      return false;
    }
  }

  private void resolvePermission() {
    if (PermissionHelper.hasPermission(this, permissions[0])) {
      Log.d("Canvas2ImagePlugin", "Permission already granted or before Android 6");
      startSave();
    } else {
      Log.d("Canvas2ImagePlugin", "Requesting permission");
      PermissionHelper.requestPermission(this, WRITE_CODE, permissions[0]);
    }
  }

  private void startSave() {
    File imageFile = savePhoto(this.bmp);
    if (imageFile == null) {
      this.callbackContext.error("Error while saving image");
    }

    // Update image gallery
    scanPhoto(imageFile);

    this.callbackContext.success(imageFile.toString());
  }

  private File savePhoto(Bitmap bmp) {
    File retVal = null;

    try {
      Calendar c = Calendar.getInstance();
      String date = "" + c.get(Calendar.DAY_OF_MONTH)
          + c.get(Calendar.MONTH)
          + c.get(Calendar.YEAR)
          + c.get(Calendar.HOUR_OF_DAY)
          + c.get(Calendar.MINUTE)
          + c.get(Calendar.SECOND);

      String deviceVersion = Build.VERSION.RELEASE;
      Log.i("Canvas2ImagePlugin", "Android version " + deviceVersion);
      int check = deviceVersion.compareTo("2.3.3");
      int check6 = deviceVersion.compareTo("6.0.0");

      File folder;
      /*
       * File path = Environment.getExternalStoragePublicDirectory(
       * Environment.DIRECTORY_PICTURES ); //this throws error in Android
       * 2.2
       */
      if (check >= 1) {
        folder = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
        if(!folder.exists()) {
          folder.mkdirs();
        }
      } else {
        folder = Environment.getExternalStorageDirectory();
      }

      Log.d("Canvas2ImagePlugin", "***********" + folder);
      File imageFile = new File(folder, "c2i_" + date.toString() + ".png");

      FileOutputStream out = new FileOutputStream(imageFile);
      bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
      out.flush();
      out.close();

      retVal = imageFile;
    } catch (Exception e) {
      Log.e("Canvas2ImagePlugin", "An exception occured while saving image: "
          + e.toString());
    }
    return retVal;
  }

  /* Invoke the system's media scanner to add your photo to the Media Provider's database,
   * making it available in the Android Gallery application and to other apps. */
  private void scanPhoto(File imageFile)
  {
    Intent mediaScanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
    Uri contentUri = Uri.fromFile(imageFile);
    mediaScanIntent.setData(contentUri);
    cordova.getActivity().sendBroadcast(mediaScanIntent);
  }


  public void onRequestPermissionResult(int requestCode, String[] permissions,
                                        int[] grantResults) throws JSONException {
    for (int r : grantResults) {
      if (r == PackageManager.PERMISSION_DENIED) {
        this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, PERMISSION_DENIED_ERROR));
        return;
      }
    }
    switch (requestCode) {
      case WRITE_CODE:
          startSave();
          break;
    }
  }
}
