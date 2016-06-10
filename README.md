# AndroidMultiProcessPlayground

An Android app that allows for easy experimention of:
 * `BIND_*` flags for `bindService()`
 * OutOfMemory handling
 * Thread priorities

## Build & Run:

    ./gradlew assembleDebug
    adb install -r app/build/outputs/apk/app-debug.apk
    adb shell am start -n com.example.agrieve.multiprocessdemo/.MainActivity

## How to use it

 1. Start the app & connect your device with a USB cable
 2. On your host machine, navigate to `chrome://inspect/#devices`
 3. Click on the "Stetho" link
 4. Type `init()` into the JS console.
 5. Try out example workflows, but **DO NOT** copy & paste them more than one line at a time or you may execute commands too quickly.

### Example Workflow #1 - BIND flags

In devtools:

    ren1 = api.createRenderer()
    // Show what bindings they have enabled:
    api.listBindings()
    // Add a custom binding:
    api.bindService('Service1', ['BIND_AUTO_CREATE', 'BIND_ADJUST_WITH_ACTIVITY'])
    // Remove existing binding:
    ren1.moderateBinding.unbind()

In a terminal:

    # See OOM buckets and memory use:
    adb shell dumpsys meminfo

### Example Workflow #2 - OOM Order and Task Stacks

    // Create a process bound to main activity
    api.createRenderer()
    // Switch to a different activity stack
    api.startAffinityActivity()
    api.createRenderer()

In a terminal:

    # Show which OOM bucket each bound service ends up in.
    adb shell dumpsys activity | sed -n -e '/dumpsys activity processes/,$p'
    # Note that both services are always together despite being bound by different activities.
    
### Example Workflow #3 - OOM Killing in Action

In devtools:

    // Create 4 child services (ren1, ren2, ren3, ren4), have each consume 100meg
    api.createAllRenderers(100)
    // Show what bindings they have enabled:
    api.listBindings()
    api.consumeNativeMemoryUntilLow()

In a terminal:

    # Watch memory usage go up and apps disappear from cached list
    adb shell dumpsys meminfo
    
In devtools:

    // This function stops as soon as an onTrimMemory callback is called.
    // Call it again to reach the next threshold.
    api.consumeNativeMemoryUntilLow()
    api.consumeNativeMemoryUntilLow()

### Example Workflow #4 - Thread Priorities

In devtools:

    // Create 4 native threads, and 4 java threads, all at different priorities.
    api.createAllWorkers()
    // Show performance of each thread
    api.listWorkers()

In a terminal:

    # List all threads of the process
    adb shell top -n 1 | grep multiprocessdemo
    # Monitor CPU usage of top threads
    adb shell top -m 20 -t
    
In devtools:

    // Create workers on another process.
    api.createAllRenderers()
    ren1.createWorker(9)
    // Starting at 10, threads go to a low-power cgroup.
    ren1.createWorker(10)
    api.listWorkers()

### Example Workflow #5 - BIND_NOT_FOREGROUND

In devtools:

    // Create a workers with & without BIND_NOT_FOREGROUND.
    ren1 = api.createRenderer()
    ren2 = api.createRenderer(['BIND_NOT_FOREGROUND'])
    // Create 2 threads per process of equal priority
    ren1.createWorker(0)
    ren1.createWorkerNative(0)
    ren2.createWorker(0)
    ren2.createWorkerNative(0)
    // Show performance of each thread
    api.listWorkers()

In a terminal:

    # Monitor CPU usage of top threads
    adb shell top -m 20 -t

### Example Workflow #6 - Changing Thread Priorities

In devtools:

    api.createWorker(0)
    api.createWorker(0)
    api.createWorker(10)
    // Show performance of each thread
    api.listWorkers()
    
    workerThreads[2].setNice(0)
    api.resetWorkerStats()
    // Show that changed priority worked.
    api.listWorkers()
    
