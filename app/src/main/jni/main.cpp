//
// Created by Andrew Grieve on 5/30/16.
//

#include <jni.h>
#include <vector>
#include <map>
#include <string>
#include <stdlib.h>
#include <cassert>

#include <errno.h>
#include <pthread.h>
#include <sched.h>
#include <stddef.h>
#include <stdint.h>
#include <sys/types.h>
#include <sys/prctl.h>

#include <android/log.h>


namespace {
    struct ThreadParams {
        std::string name;
        jobject runnable;
        pthread_t handle;
    };

    std::vector<char*> wasted_memory;
    std::map<std::string, ThreadParams*> threads_by_id;


    JavaVM *g_jvm = nullptr;

    void* ThreadFunc(void* _params) {
        __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Thread main");
        ThreadParams* params = (ThreadParams*)_params;
        int err = prctl(PR_SET_NAME, params->name.c_str());
        assert(!err);
        __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Thread main2");
        JNIEnv* env = NULL;
        jint ret = g_jvm->AttachCurrentThread(&env, NULL);
        assert(ret == JNI_OK);
        jclass cls = env->GetObjectClass(params->runnable);
        jmethodID mid = env->GetMethodID(cls, "run", "()V");
        __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Thread main3!");
        env->CallVoidMethod(params->runnable, mid);
        __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Thread main4!");
        env->DeleteGlobalRef(params->runnable);
        delete params;
        return nullptr;
    }
}

extern "C" {
JNIEXPORT void JNICALL
Java_com_example_agrieve_multiprocessdemo_JniMethods_consumeNativeMemory(JNIEnv *env, jclass thiz, jint num_bytes) {
    wasted_memory.push_back(new char[num_bytes]);
    for (int i = 0; i < num_bytes; ++i) {
        wasted_memory.back()[i] = rand() % 256;
    }
}

JNIEXPORT jstring JNICALL Java_com_example_agrieve_multiprocessdemo_JniMethods_createPosixThread(JNIEnv *env, jclass thiz, jint priority, jstring thread_name, jobject runnable) {
    pthread_attr_t attributes;
    pthread_attr_init(&attributes);
    pthread_t handle;
    ThreadParams* params = new ThreadParams();
    params->name = env->GetStringUTFChars(thread_name, NULL);
    params->runnable = env->NewGlobalRef(runnable);
    params->handle = handle;
    int err = pthread_create(&handle, &attributes, ThreadFunc, params);
    pthread_attr_destroy(&attributes);
    assert(!err);
    return env->NewStringUTF("success"); ;
}

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "JNI_OnLoad");
    return JNI_VERSION_1_4;
}

}  // extern "C"

