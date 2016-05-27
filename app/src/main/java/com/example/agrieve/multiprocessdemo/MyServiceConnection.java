package com.example.agrieve.multiprocessdemo;

import android.content.ComponentName;
import android.content.Context;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

public class MyServiceConnection implements ServiceConnection {
    final Context mContext;
    IMyAidlInterface mIRemoteService;

    /**
     * This implementation is used to receive callbacks from the remote
     * service.
     */
    IMyAidlInterfaceCallback mCallback = new IMyAidlInterfaceCallback.Stub() {
        // Background thread
        public void callback(String message) {
            Log.i("IMyAidlInterfaceCb", "Callback Message Recieved: " + message);
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
        JsApi.instance.callback("onServiceConnected", this, className);
    }

    // Called when the connection with the service disconnects unexpectedly
    public void onServiceDisconnected(ComponentName className) {
        JsApi.instance.callback("onServiceDisconnected", this, className);
        mIRemoteService = null;
    }
}
