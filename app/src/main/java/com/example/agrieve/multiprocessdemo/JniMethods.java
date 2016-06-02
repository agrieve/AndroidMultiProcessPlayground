package com.example.agrieve.multiprocessdemo;

import android.util.Log;

/**
 * Created by agrieve on 5/30/16.
 */
public class JniMethods {
    static {
        Log.w("JniMethods", "Start loading native code.");
        System.loadLibrary("nativecode");
        Log.w("JniMethods", "Done loading native code.");
    }
    public static native void consumeNativeMemory(int amountInBytes);
    public static native String createPosixThread(int priority, String threadName, Runnable func);
}
