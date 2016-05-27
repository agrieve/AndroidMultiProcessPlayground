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

public class BaseActivity extends Activity {
    private final String TAG = getClass().getSimpleName();

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
}
