# AndroidMultiProcessPlayground

An Android app that allows for easy experimention of:
 * OutOfMemory handling
 * Affects of thread priorities

Build it via:

    ./gradlew assembleDebug

Install it via:

    adb install app/build/outputs/apk/app-debug.apk

## How to use it

1. Start the app & connect your device with a USB cable
2. On your host machine, navigate to `chrome://inspect/#devices`
3. Click on the "Stetho" link
4. Type `init()` into the JS console.

### Example Workflow #1 - BIND flags

In devtools:

    ren1 = api.createRenderer()
    // Show what bindings they have enabled:
    api.listBindings()
    // Add a custom binding:
    api.addBinding('Service1', ['BIND_AUTO_CREATE', 'BIND_ADJUST_WITH_ACTIVITY'])
    // Remove existing binding:
    ren1.moderateBinding.unbind()

In a terminal:

    # See OOM buckets and memory use:
    adb shell dumpsys meminfo

### Example Workflow #2 - OOM Killing in Action

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

### Example Workflow #3 - Thread Priorities

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
    ren1.createWorker(0)  // high priority
    ren1.createWorker(10)  // low priority
    api.listWorkers()

