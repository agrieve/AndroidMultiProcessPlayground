// IMyAidlInterfaceCallback.aidl
package com.example.agrieve.multiprocessdemo;


interface IMyAidlInterfaceCallback {
    void onTrimMemory(int level);
    void consoleLog(String message);
    void onSubServiceConnected(String targetComponentName);
}