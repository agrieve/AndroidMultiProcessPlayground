package com.example.agrieve.multiprocessdemo;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.os.Process;
import android.os.RemoteException;
import android.util.Log;

public class BaseService extends Service {
    private final String TAG;
    private IMyAidlInterfaceCallback mCallback;

    public BaseService() {
        super();
        TAG = this.getClass().getSimpleName();
    }

    // Binder object used by clients for this service.
    private final IMyAidlInterface.Stub mBinder = new IMyAidlInterface.Stub() {
        // NOTE: Implement any IChildProcessService methods here.
        @Override
        public int setupConnection(IMyAidlInterfaceCallback callback) {
            mCallback = callback;
            return Process.myPid();
        }

        @Override
        public void postMessage(String aString) throws RemoteException {
            Log.i(TAG, "Post Message Recieved: " + aString);
        }
    };


    @Override
    public void onCreate() {
        Log.i(TAG, "Creating new ChildProcessService pid=" + Process.myPid());
        super.onCreate();
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "Destroying ChildProcessService pid=" + Process.myPid());
        super.onDestroy();
        System.exit(0);  // Don't be a re-usable process.
    }

    @Override
    public IBinder onBind(Intent intent) {
        // We call stopSelf() to request that this service be stopped as soon as the client
        // unbinds. Otherwise the system may keep it around and available for a reconnect. The
        // child processes do not currently support reconnect; they must be initialized from
        // scratch every time.
        stopSelf();
        return mBinder;
    }
}
