package com.example.agrieve.multiprocessdemo;

import android.app.ActivityManager;
import android.app.Application;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.stetho.InspectorModulesProvider;
import com.facebook.stetho.Stetho;
import com.facebook.stetho.inspector.protocol.ChromeDevtoolsDomain;
import com.facebook.stetho.rhino.JsRuntimeReplFactoryBuilder;

import org.mozilla.javascript.BaseFunction;
import org.mozilla.javascript.Scriptable;

/**
 * Created by agrieve on 5/25/16.
 */
public class MainApplication extends Application {
    public final ActivityManager.RunningAppProcessInfo startMemInfo = new ActivityManager.RunningAppProcessInfo();

    @Override
    public void onCreate() {
        super.onCreate();
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        am.getMyMemoryState(startMemInfo);
        Log.i("MainApplication", "START TRIM LEVEL=" + startMemInfo.lastTrimLevel);
    }
}
