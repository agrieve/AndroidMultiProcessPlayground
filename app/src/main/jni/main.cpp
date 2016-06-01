//
// Created by Andrew Grieve on 5/30/16.
//

#include <jni.h>
#include <vector>
#include <stdlib.h>

static std::vector<char*> wasted_memory;

extern "C" {
JNIEXPORT void JNICALL
Java_com_example_agrieve_multiprocessdemo_JniMethods_consumeNativeMemory__I(JNIEnv *env, jclass thiz, jint num_bytes) {
    wasted_memory.push_back(new char[num_bytes]);
    for (int i = 0; i < num_bytes; ++i) {
        wasted_memory.back()[i] = rand() % 256;
    }
}

}

