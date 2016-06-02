// IMyAidlInterface.aidl
package com.example.agrieve.multiprocessdemo;

import com.example.agrieve.multiprocessdemo.IMyAidlInterfaceCallback;

interface IMyAidlInterface {

    int setupConnection(com.example.agrieve.multiprocessdemo.IMyAidlInterfaceCallback callback);

    void consumeJavaMemory(int numBytes);
    void consumeNativeMemory(int numBytes);

    String createWorkerThread(int priority);
    String createWorkerThreadNative(int priority);
    void killWorkerThread(String threadId);
    String describeSpeed(String threadId);
}
