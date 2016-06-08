package com.example.agrieve.multiprocessdemo;

import android.util.Log;

import java.util.HashMap;
import java.util.Random;

/**
 * Created by agrieve on 5/31/16.
 */

public class WorkerThread extends Thread {
    private static final long MEASUREMENT_DURATION_NANOS = 5 * 1000000;
    private static HashMap<String, WorkerThread> threadMap = new HashMap<>();
    private static int instanceCounter;

    private String friendlyId;
    private volatile int totalComputations;
    private float recentComputationsPerSecond;
    private float totalComputationsPerSecond;
    private volatile boolean stop;  // interrupt() doesn't work in pthread since thread isn't actually started.
    private int processPriority;

    public static String create(int priority, String contextName) {
        WorkerThread thread = new WorkerThread();
        thread.processPriority = priority;
        thread.friendlyId = contextName + '.' + "jthr" + ++instanceCounter;
        Log.i("WorkerThread", "Creating java thread: " + thread.friendlyId);
        threadMap.put(thread.friendlyId, thread);
        thread.start();
        return thread.friendlyId;
    }

    public static String createNative(int priority, String contextName) {
        WorkerThread thread = new WorkerThread();
        thread.processPriority = priority;
        thread.friendlyId = contextName + '.' + "pthr" + ++instanceCounter;
        Log.i("WorkerThread", "Creating native thread: " + thread.friendlyId);
        threadMap.put(thread.friendlyId, thread);
        JniMethods.createPosixThread(priority, thread.friendlyId, thread);
        return thread.friendlyId;
    }

    public static void kill(String threadId) {
        WorkerThread thread = threadMap.remove(threadId);
        thread.stop = true;
    }

    public static float[] describeSpeed(String threadId) {
        WorkerThread thread = threadMap.get(threadId);
        return new float[] { thread.totalComputations, thread.totalComputationsPerSecond, thread.recentComputationsPerSecond };
    }

    @Override
    public void run() {
        Thread.currentThread().setName(friendlyId);  // currentThread() for pthread case.
        // Refer to https://github.com/deepakkathayat/android/blob/master/art/runtime/thread_android.cc
        android.os.Process.setThreadPriority(processPriority);
        Random rand = new Random();
        long prevNanos = System.nanoTime();
        long startNanos = prevNanos;
        totalComputations = 0;
        for (; ; ) {
            for (int i = 0; i < 100; ++i) {
                rand.nextInt();
            }
            ++totalComputations;
            long curNanos = System.nanoTime();
            if (curNanos - prevNanos > MEASUREMENT_DURATION_NANOS) {
                recentComputationsPerSecond = (float)totalComputations / (curNanos - prevNanos) * 1000000;
                totalComputationsPerSecond = (float)totalComputations / (curNanos - startNanos) * 1000000;
                prevNanos = curNanos;
            }
            if (stop) {
                break;
            }
        }
    }
}
