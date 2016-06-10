package com.example.agrieve.multiprocessdemo;

import android.util.Log;

import java.util.HashMap;
import java.util.Random;

/**
 * Created by agrieve on 5/31/16.
 */

public class WorkerThread implements Runnable {
    private static final long MEASUREMENT_DURATION_NANOS = 5 * 1000000;
    private static HashMap<String, WorkerThread> threadMap = new HashMap<>();
    private static int instanceCounter;

    private String friendlyId;
    private volatile int totalComputations;
    private volatile int newProcessPriority = -1000;
    private volatile long startNanos;
    private volatile boolean stop;  // interrupt() doesn't work in pthread since thread isn't actually started.
    private float recentComputationsPerSecond;
    private float totalComputationsPerSecond;
    private int processPriority;
    private Thread thread;

    public static String create(int priority, String contextName, boolean posix) {
        WorkerThread worker = new WorkerThread();
        worker.processPriority = priority;
        String prefix = posix ? "pthr" : "jthr";
        worker.friendlyId = contextName + '.' + prefix + ++instanceCounter;
        Log.i("WorkerThread", "Creating thread: " + worker.friendlyId);
        threadMap.put(worker.friendlyId, worker);
        if (posix) {
            JniMethods.createPosixThread(priority, worker.friendlyId, worker);
        } else {
            new Thread(worker).start();
        }
        return worker.friendlyId;
    }

    public static Thread getJavaThread(String threadId) {
        return threadMap.get(threadId).thread;
    }

    public static void kill(String threadId) {
        WorkerThread worker = threadMap.remove(threadId);
        worker.stop = true;
    }

    public static float[] describeSpeed(String threadId) {
        WorkerThread worker = threadMap.get(threadId);
        return new float[] { worker.totalComputations, worker.totalComputationsPerSecond, worker.recentComputationsPerSecond };
    }

    public static void setWorkerNice(String threadId, int value) {
        WorkerThread worker = threadMap.get(threadId);
        worker.newProcessPriority = value;
        worker.processPriority = value;
    }

    public static void resetStats(String threadId) {
        WorkerThread worker = threadMap.get(threadId);
        worker.startNanos = System.nanoTime();
        worker.totalComputations = 0;
    }

    @Override
    public void run() {
        thread = Thread.currentThread();
        thread.setName(friendlyId);  // currentThread() for pthread case.
        // Refer to https://github.com/deepakkathayat/android/blob/master/art/runtime/thread_android.cc
        android.os.Process.setThreadPriority(processPriority);
        Random rand = new Random();
        long prevNanos = System.nanoTime();
        startNanos = prevNanos;
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
            if (newProcessPriority != -1000) {
                android.os.Process.setThreadPriority(newProcessPriority);
                newProcessPriority = -1000;
            }
        }
    }

}
