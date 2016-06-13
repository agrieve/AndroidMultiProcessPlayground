// IMyAidlInterface.aidl
package com.example.agrieve.multiprocessdemo;

import com.example.agrieve.multiprocessdemo.IMyAidlInterfaceCallback;

interface IMyAidlInterface {
    int setupConnection(com.example.agrieve.multiprocessdemo.IMyAidlInterfaceCallback callback);
    void killProcess();

    void consumeJavaMemory(int numBytes);
    void consumeNativeMemory(int numBytes);

    String createWorkerThread(int priority, boolean posix);
    void killWorkerThread(String threadId);
    float[] describeSpeed(String threadId);
    void setWorkerNice(String threadId, int value);
    void resetWorkerStats(String threadId);

    void setNice(int value);
    int getNice();
}