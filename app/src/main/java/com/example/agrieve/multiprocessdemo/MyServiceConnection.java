package com.example.agrieve.multiprocessdemo;

import android.content.ComponentName;
import android.content.Context;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

public class MyServiceConnection implements ServiceConnection {
    public final Context mContext;
    public IMyAidlInterface mIRemoteService;
    public String mConnectedComponentName;

    /**
     * This implementation is used to receive callbacks from the remote
     * service.
     */
    public final IMyAidlInterfaceCallback mCallback = new IMyAidlInterfaceCallback.Stub() {
        public void onTrimMemory(int level) {
            JsApi.instance.callback("onTrimMemory", mConnectedComponentName, level);
        }
    };


    public MyServiceConnection(Context context) {
        mContext = context;
    }

    // Called when the connection with the service is established
    public void onServiceConnected(ComponentName className, IBinder service) {
        // Following the example above for an AIDL interface,
        // this gets an instance of the IRemoteInterface, which we can use to call on the service
        mIRemoteService = IMyAidlInterface.Stub.asInterface(service);
        mConnectedComponentName = className.getShortClassName();
        JsApi.instance.callback("onServiceConnected", this, className);
    }

    // Called when the connection with the service disconnects unexpectedly
    public void onServiceDisconnected(ComponentName className) {
        JsApi.instance.callback("onServiceDisconnected", this, className);
        mConnectedComponentName = null;
        mIRemoteService = null;
    }
}
