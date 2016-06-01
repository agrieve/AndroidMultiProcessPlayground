// IMyAidlInterface.aidl
package com.example.agrieve.multiprocessdemo;

import com.example.agrieve.multiprocessdemo.IMyAidlInterfaceCallback;

interface IMyAidlInterface {

    int setupConnection(com.example.agrieve.multiprocessdemo.IMyAidlInterfaceCallback callback);

    /**
     * Demonstrates some basic types that you can use as parameters
     * and return values in AIDL.
     */
    void postMessage(String aString);

    void consumeJavaMemory(int numBytes);
    void consumeNativeMemory(int numBytes);
}
