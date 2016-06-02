package com.example.agrieve.multiprocessdemo;

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
    private volatile String speed;

    public static String create(int priority, String contextName) {
        WorkerThread thread = new WorkerThread();
        thread.setPriority(priority);
        thread.friendlyId = contextName + '.' + "javaworker" + ++instanceCounter;
        threadMap.put(thread.friendlyId, thread);
        thread.start();
        return thread.friendlyId;
    }

    public static String createNative(int priority, String contextName) {
        WorkerThread thread = new WorkerThread();
        thread.friendlyId = contextName + '.' + "pthreadworker" + ++instanceCounter;
        threadMap.put(thread.friendlyId, thread);
        JniMethods.createPosixThread(priority, thread.friendlyId, thread);
        return thread.friendlyId;
    }

    public static void kill(String threadId) {
        WorkerThread thread = threadMap.remove(threadId);
        thread.interrupt();
    }

    public static String describeSpeed(String threadId) {
        WorkerThread thread = threadMap.get(threadId);
        return thread.speed;
    }

    @Override
    public void run() {
        Thread.currentThread().setName(friendlyId);  // currentThread() for pthread case.
        Random rand = new Random();
        long prevNanos = System.nanoTime();
        int computations = 0;
        for (; ; ) {
            for (int i = 0; i < 100; ++i) {
                rand.nextInt();
            }
            ++computations;
            long curNanos = System.nanoTime();
            long durationNanos = curNanos - prevNanos;
            if (durationNanos > MEASUREMENT_DURATION_NANOS) {
                float computationsPerSecond = (float)computations / durationNanos * 1000000;
                float rounded = Math.round(computationsPerSecond * 100) / 100;
                speed = "" + computations + " (" + rounded + " loops/sec)";
                prevNanos = curNanos;
            }
            if (isInterrupted()) {
                break;
            }
        }
    }
}
