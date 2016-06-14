package com.example.agrieve.multiprocessdemo;

import android.content.ComponentName;
import android.content.Context;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

public class MyServiceConnection implements ServiceConnection {
    private static final String TAG = "MyServiceConnection";
    public final Context mContext;
    public IMyAidlInterface mIRemoteService;
    public String mConnectedComponentName;
    public int mPid;

    /**
     * This implementation is used to receive callbacks from the remote
     * service.
     */
    public final IMyAidlInterfaceCallback mCallback = new IMyAidlInterfaceCallback.Stub() {
        public void onTrimMemory(int level) {
            JsApi.instance.callback("onTrimMemory", mConnectedComponentName, level);
        }
        public void consoleLog(String message) {
            JsApi.log(mConnectedComponentName + ": " + message);
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
        if (JsApi.instance != null) {
            try {
                mPid = mIRemoteService.setupConnection(mCallback);
            } catch (RemoteException e) {
                throw new RuntimeException(e);
            }
            JsApi.instance.callback("onServiceConnected", mContext.getClass().getSimpleName(), mConnectedComponentName, this);
        } else if (mContext instanceof BaseService) {
            ((BaseService)mContext).jsLog("CONNECTED: " +  mContext.getClass().getSimpleName() + " -> " + mConnectedComponentName);
        }

    }

    // Called when the connection with the service disconnects unexpectedly
    public void onServiceDisconnected(ComponentName className) {
        mIRemoteService = null;
        mPid = 0;
        if (JsApi.instance != null) {
            JsApi.instance.callback("onServiceDisconnected", mContext.getClass().getSimpleName(), mConnectedComponentName, this);
        } else if (mContext instanceof BaseService) {
            ((BaseService)mContext).jsLog("DISCONNECTED: " +  mContext.getClass().getSimpleName() + " -> " + mConnectedComponentName);
        }
    }
}
