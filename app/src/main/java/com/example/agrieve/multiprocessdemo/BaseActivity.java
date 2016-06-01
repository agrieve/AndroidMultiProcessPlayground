package com.example.agrieve.multiprocessdemo;

import android.app.Activity;
import android.app.Service;
import android.content.ComponentName;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Process;
import android.os.RemoteException;
import android.util.Log;

import java.util.ArrayList;
import java.util.Random;

public class BaseActivity extends Activity {
    private final String TAG = getClass().getSimpleName();
    private ArrayList<byte[]> mWastedMemory = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (JsApi.instance == null) {
            JsApi.init(getApplicationContext());
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        JsApi.instance.setActiveActivity(this);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        JsApi.instance.callback("onActivityDestroyed", this);
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        JsApi.instance.callback("onTrimMemory", level);
    }

    public void consumeJavaMemory(int numBytes) {
        mWastedMemory.add(new byte[numBytes]);
        new Random().nextBytes(mWastedMemory.get(mWastedMemory.size() - 1));
    }

    public void consumeNativeMemory(int numBytes) {
        JniMethods.consumeNativeMemory(numBytes);
    }
}
