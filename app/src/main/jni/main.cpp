//
// Created by Andrew Grieve on 5/30/16.
//

#include <jni.h>
#include <vector>
#include <map>
#include <string>
#include <cassert>

#include <errno.h>
#include <pthread.h>
#include <sched.h>
#include <stddef.h>
#include <stdint.h>
#include <sys/types.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <sys/resource.h>
#include <sys/time.h>

#include <android/log.h>


namespace {
    struct ThreadParams {
        std::string name;
        jobject runnable;
        int priority;
    };

    std::vector<char*> wasted_memory;
    std::map<std::string, ThreadParams*> threads_by_id;
    JavaVM *g_jvm = nullptr;

//http://stackoverflow.com/questions/16319725/android-set-thread-affinity
    // http://miss-cache.blogspot.ca/2013/01/android-running-native-code-on-multiple.html
    // Valid values can change over time depending on how many cpus are powered up.
    // System can reset your value when processors are powered down, so may need to set over and over.
    void setCurrentThreadAffinityMask(int mask)
    {
        int err, syscallres;
        pid_t pid = gettid();
        syscallres = syscall(__NR_sched_setaffinity, pid, sizeof(mask), &mask);
        if (syscallres)
        {
            err = errno;
            __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Error in the syscall setaffinity: mask=%d=0x%x err=%d=0x%x", mask, mask, err, err);
        }
    }
//    CPU_ZERO(&cpuset);
//    CPU_SET(*(int *) cpu, &cpuset);
//    s = pthread_setaffinity_np(id, sizeof(cpu_set_t), &cpuset);
//    if (s != 0)
//    handle_error_en(s, "pthread_setaffinity_np");



    void* ThreadFunc(void* _params) {
        __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Thread main");
        ThreadParams* params = (ThreadParams*)_params;
        int err = prctl(PR_SET_NAME, params->name.c_str());
        assert(!err);

//        pid_t tid = gettid();
//        setpriority(PRIO_PROCESS, tid, params->priority);
//        __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Thread nice=%d", getpriority(PRIO_PROCESS, tid));

//        int policy = -1;
//        sched_param param;
//        pthread_t handle = pthread_self();
//        pthread_getschedparam(handle, &policy, &param);
//        __android_log_print(ANDROID_LOG_VERBOSE, "main.cpp", "Thread policy %d, param %d", policy, param.sched_priority);


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
        g_jvm->DetachCurrentThread();
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
    __android_log_print(ANDROID_LOG_INFO, "main.cpp", "consumeNativeMemory");
}

JNIEXPORT jstring JNICALL Java_com_example_agrieve_multiprocessdemo_JniMethods_createPosixThread(JNIEnv *env, jclass thiz, jint priority, jstring thread_name, jobject runnable) {
    pthread_attr_t attributes;
    pthread_attr_init(&attributes);
//    pthread_attr_setschedpolicy(attributes, SCHED_IDLE);
//    pthread_attr_setinheritsched(attributes, PTHREAD_EXPLICIT_SCHED);
    ThreadParams* params = new ThreadParams();
    params->name = env->GetStringUTFChars(thread_name, NULL);
    params->runnable = env->NewGlobalRef(runnable);
    params->priority = priority;
    pthread_t handle;
    int err = pthread_create(&handle, &attributes, ThreadFunc, params);
    pthread_attr_destroy(&attributes);
    assert(!err);
    return env->NewStringUTF("success"); ;
}

JNIEXPORT jint JNICALL
Java_com_example_agrieve_multiprocessdemo_JniMethods_getNice(JNIEnv *env, jclass type) {
    pid_t pid = getpid();
    return getpriority(PRIO_PROCESS, pid);
}

JNIEXPORT void JNICALL
Java_com_example_agrieve_multiprocessdemo_JniMethods_setNice(JNIEnv *env, jclass type,
                                                                 jint priority) {
    pid_t pid = getpid();
    setpriority(PRIO_PROCESS, pid, priority);
}


extern "C" JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    __android_log_print(ANDROID_LOG_INFO, "main.cpp", "JNI_OnLoad");
    return JNI_VERSION_1_4;
}

}  // extern "C"

