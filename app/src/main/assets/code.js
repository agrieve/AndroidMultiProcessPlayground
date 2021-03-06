var appPackageStr = 'com.example.agrieve.multiprocessdemo';
var appPackage = com.example.agrieve.multiprocessdemo;
var Context = android.content.Context;
var File = java.io.File;
var Intent = android.content.Intent;
var Process = android.os.Process;
var Thread = java.lang.Thread;
var Runtime = java.lang.Runtime;

var bindRecords = [];
var workerThreads = [];
var renderers = [];
var lastRenderer = 0;
var window = this;

function setTimeout(func, delay) {
  appPackage.JsApi.uiHandler.postDelayed(func, delay || 0);
}

function readFile(f) {
  var is = new java.io.FileInputStream(f);
  try {
    var s = new java.util.Scanner(is).useDelimiter("\\A");
    return s.hasNext() ? s.next() : "";
  } finally {
    is.close();
  }
}

function lsDir(f) {
  var f = new File(f);
  return f.list();
}

function exec(cmd) {
  var p = Runtime.getRuntime().exec(cmd);
  var br = new java.io.BufferedReader(new java.io.InputStreamReader(p.getInputStream()));
  var br2 = new java.io.BufferedReader(new java.io.InputStreamReader(p.getErrorStream()));
  var returnCode = p.waitFor();
  console.log('ReturnCode=' + returnCode)
  while (br.ready()) {
      console.log('' + br.readLine());
  }
  while (br2.ready()) {
      console.log('' + br2.readLine());
  }
}

function BindRecord(activityOrConnection, serviceName, bindFlagsAsStrList) {
  this.activityOrConnection = activityOrConnection;
  this.connection = null;
  var isLocal = activityOrConnection instanceof appPackage.BaseActivity;
  this.fromName = isLocal ? activityOrConnection.getClass().getSimpleName() : activityOrConnection.mConnectedComponentName;
  this.serviceName = serviceName;
  this.bindFlagsAsStrList = bindFlagsAsStrList;
  this.pid = null;
}

BindRecord.prototype.toString = function() {
  return this.fromName + ' -> ' + this.serviceName + ':' + this.pid + ' (' + this.bindFlagsAsStrList.join('|') + ')'
};

function Binding(renderer, bindFlagsAsStrList) {
  this.renderer = renderer;
  this.bindFlagsAsStrList = bindFlagsAsStrList;
  this.bindRecord = null;
}

Binding.prototype.bind = function(callback) {
  if (this.isBound()) {
    console.log('Already Bound.');
    throw Error();
  }
  this.bindRecord = api.bindService(this.renderer.serviceName, this.bindFlagsAsStrList, this.renderer.context, callback);
};

Binding.prototype.unbind = function() {
  if (!this.isBound()) {
    console.log('Already Unbound.');
    throw Error();
  }
  api.unbindService(this.bindRecord);
  this.bindRecord = null;
};

Binding.prototype.isBound = function() {
  return bindRecords.indexOf(this.bindRecord) != -1;
};

function Renderer(context, serviceName, opt_extraBindFlagsAsStrList) {
  this.context = context;
  this.serviceName = serviceName;
  this.pid = 0;
  this.strongBinding = new Binding(this, ['BIND_AUTO_CREATE', 'BIND_IMPORTANT']);
  this.moderateBinding = new Binding(this, ['BIND_AUTO_CREATE']);
  this.perceptBinding = new Binding(this, ['BIND_AUTO_CREATE', 'BIND_NOT_VISIBLE']);
  this.waivedBinding = new Binding(this, ['BIND_AUTO_CREATE', 'BIND_WAIVE_PRIORITY']);
  if (opt_extraBindFlagsAsStrList) {
    [].push.apply(this.strongBinding.bindFlagsAsStrList, opt_extraBindFlagsAsStrList);
    [].push.apply(this.moderateBinding.bindFlagsAsStrList, opt_extraBindFlagsAsStrList);
    [].push.apply(this.perceptBinding.bindFlagsAsStrList, opt_extraBindFlagsAsStrList);
    [].push.apply(this.waivedBinding.bindFlagsAsStrList, opt_extraBindFlagsAsStrList);
  }
}

Renderer.prototype._findConnection = function() {
  for (var i = 0; i < bindRecords.length; ++i) {
    if (bindRecords[i].serviceName == this.serviceName) {
      if (bindRecords[i].connection) {
        return bindRecords[i].connection;
      }
    }
  }
  console.log('Found no directly connection to ' + this.serviceName);
};

Renderer.prototype.consumeJavaMemory = function(megs, opt_chunkSize) {
  api.consumeJavaMemory(megs, opt_chunkSize, this._findConnection().mIRemoteService);
};

Renderer.prototype.consumeNativeMemory = function(megs, opt_chunkSize) {
  api.consumeNativeMemory(megs, opt_chunkSize, this._findConnection().mIRemoteService);
};

Renderer.prototype.consumeNativeMemoryUntilLow = function(opt_chunkSize) {
  api.consumeNativeMemoryUntilLow(opt_chunkSize, this);
};

Renderer.prototype.createWorker = function(opt_threadPriority, opt_posix) {
  return api.createWorker(opt_threadPriority, opt_posix, this._findConnection().mIRemoteService, this.serviceName);
};

Renderer.prototype.createWorkerNative = function(opt_threadPriority) {
  return api.createWorkerNative(opt_threadPriority, this._findConnection().mIRemoteService, this.serviceName);
};

Renderer.prototype.setNice = function(value) {
  this._findConnection().mIRemoteService.setNice(value);
};

Renderer.prototype.getNice = function() {
  return this._findConnection().mIRemoteService.getNice();
};

Renderer.prototype.killProcess = function() {
  return this._findConnection().mIRemoteService.killProcess();
};

Renderer.prototype.bindService = function(serviceName, bindFlagsAsStrList, opt_callback) {
  return api.bindService(serviceName, bindFlagsAsStrList, this._findConnection(), opt_callback);;
};

Renderer.prototype.bindAbove = function(otherRenderer, opt_callback) {
  return this.bindService(otherRenderer.serviceName, ['BIND_ABOVE_CLIENT'], opt_callback);
};



function WorkerThread(target, threadId, threadPriority) {
  this.target = target;
  this.threadId = threadId;
  this.threadPriority = threadPriority;
};

WorkerThread.prototype.kill = function() {
  var idx = workerThreads.indexOf(this);
  if (idx == -1) {
    console.log('Thread already killed.');
    throw Error();
  }
  workerThreads.splice(idx, 1);
  this.target.killWorkerThread(this.threadId);
};

WorkerThread.prototype.describeSpeed = function() {
  return this.target.describeSpeed(this.threadId);
};

WorkerThread.prototype.toString = function() {
  return this.threadId + '(pri=' + this.threadPriority + ')';
};

WorkerThread.prototype.getJavaThread = function() {
  // Works only for local threads (not on Renderers).
  return appPackage.WorkerThread.getJavaThread(this.threadId);
};

WorkerThread.prototype.setNice = function(value) {
  this.threadPriority = value;
  this.target.setWorkerNice(this.threadId, value);
};

WorkerThread.prototype.resetStats = function() {
  this.target.resetWorkerStats(this.threadId);
};

var api = {};

api.jsApi = appPackage.JsApi.instance;

// These 3 show that the foreground activity makes no difference to OOM order.
api.startSecondActivity = function() {
  var intent = new Intent(api.jsApi.activeActivity, appPackage.SecondActivity);
  api.jsApi.activeActivity.startActivity(intent);
};

api.startAffinityActivity = function() {
  var intent = new Intent(api.jsApi.activeActivity, appPackage.AffinityActivity);
  intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  api.jsApi.activeActivity.startActivity(intent);
};

api.finishActivity = function() {
  api.jsApi.activeActivity.finish();
};

api.help = function() {
  function desc(objName, obj) {
    for (var k in obj) {
      if (k[0] != '_' && !(obj[k] instanceof Function)) {
        console.log('  ' + objName + '.' + k + ' = ' + obj[k]);
      }
    }
    for (var k in obj) {
      if (k[0] != '_' && obj[k] instanceof Function) {
        console.log('  ' + objName + '.' + k + /.*?(\(.*?\))/.exec(obj[k])[1]);
      }
    }
  }
  function descConstants(clazz, prefix, showValues) {
    var names = [];
    for (var k in clazz) {
      if (k.indexOf(prefix) == 0) {
        if (showValues) {
          names.push(k + '=' + clazz[k]);
        } else {
          names.push(k);
        }
      }
    }
    console.log(names.join(', '));
  }
  console.log('Main API:');
  desc('api', api);
  console.log('');
  console.log("class Renderer api:");
  desc('renderer', new Renderer());
  console.log('');
  console.log("class Binding:");
  desc('binding', new Binding({}, []));
  console.log('');
  console.log("class WorkerThread:");
  desc('worker', new WorkerThread({}, []));
  console.log('');
  console.log("Binding Constants:");
  descConstants(Context, 'BIND_');
  console.log('');
  console.log("Thread Priority Constants (Process.*)");
  descConstants(Process, 'THREAD_PRIORITY', true);
  console.log('');

  console.log('Useful shell commands:')
  console.log("  adb shell dumpsys meminfo")
  console.log("  adb shell dumpsys activity | sed -n -e '/dumpsys activity processes/,$p'")
  console.log("  adb shell top -m 20 -t")
  console.log("  adb shell top -n 1 -t | grep example")
  console.log("  adb shell ps -p -t | grep _a" + (Process.myUid() % 10000));
};

api.bindService = function(serviceName, bindFlagsAsStrList, opt_activityOrConnection, opt_callback) {
  if (callbackApi.connectionCallback) {
    console.log('already a connection callback')
    throw Error();
  }
  opt_activityOrConnection = opt_activityOrConnection || api.jsApi.activeActivity;

  var bindFlags = 0;
  bindFlagsAsStrList.forEach(function(str) {
    bindFlags |= Context[str];
  });
  var isLocal = opt_activityOrConnection instanceof appPackage.BaseActivity;
  var bindRecord = new BindRecord(opt_activityOrConnection, serviceName, bindFlagsAsStrList);
  // Never bothered to wire up non-local bind callbacks.
  if (isLocal) {
    callbackApi.connectionCallback = function(connection) {
      bindRecord.connection = connection;
      if (connection) {
        bindRecord.pid = connection.mPid;
      }
      if (opt_callback) {
        opt_callback();
      }
    };
  } else {
    callbackApi.connectionCallback = opt_callback;
  }
  var bindFrom = isLocal ? opt_activityOrConnection : opt_activityOrConnection.mIRemoteService;
  bindFrom.bindService(appPackageStr + '.' + serviceName, bindFlags);
  bindRecords.push(bindRecord);
  return bindRecord;
};

api.unbindService = function(indexOrRecord) {
  var bindRecord = indexOrRecord;
  if (typeof indexOrRecord == 'number') {
    bindRecord = bindRecords[indexOrRecord];
  }
  var bindRecordIndex = bindRecords.indexOf(bindRecord);
  if (bindRecordIndex == -1) {
    console.log('Invalid index.');
    throw Error();
  }
  console.log('Removing binding ' + bindRecordIndex + ': ' + bindRecord);

  if (bindRecord.connection) {
    bindRecord.activityOrConnection.unbindService(bindRecord.connection);
  } else {
    bindRecord.activityOrConnection.mIRemoteService.unbindService(bindRecord.connectionIndex);
  }
  bindRecords.splice(bindRecordIndex, 1);
};

api.createMainProcessService = function(opt_callback) {
  browser = new Renderer(api.jsApi.activeActivity, 'Service0');
  browser.strongBinding.bind(function() {
    browser.pid = browser.strongBinding.bindRecord.pid;
    browser.waivedBinding.bind(opt_callback);
  });
  renderers.unshift(browser);
  return browser;
};

api.createRenderer = function(opt_extraBindFlagsAsStrList, opt_serviceName, opt_callback) {
  if (!opt_serviceName) {
    opt_serviceName = 'Service' + (++lastRenderer);
  }
  var renderer = new Renderer(api.jsApi.activeActivity, opt_serviceName, opt_extraBindFlagsAsStrList);
  renderer.moderateBinding.bind(function() {
    renderer.pid = renderer.moderateBinding.bindRecord.pid;
    renderer.waivedBinding.bind(opt_callback);
  });
  renderers.push(renderer);
  window['ren' + renderers.length] = renderer;
  return renderer;
};

api.createRenderer2 = function(mainBindingName, opt_callback) {
  var serviceName = 'Service' + (++lastRenderer);
  var renderer = new Renderer(api.jsApi.activeActivity, serviceName);
  renderer[mainBindingName].bind(function() {
    renderer.pid = renderer[mainBindingName].bindRecord.pid;
    if (mainBindingName != 'waivedBinding') {
      renderer.waivedBinding.bind(opt_callback);
    } else if (opt_callback) {
      opt_callback();
    }
  });
  renderers.push(renderer);
  window['ren' + renderers.length] = renderer;
  return renderer;
};

api.createAllRenderers = function(opt_consumeJavaMegs, opt_chainOom, opt_extraBindFlagsAsStrList) {
  var r1 = api.createRenderer(opt_extraBindFlagsAsStrList, null, function() {
    var r2 = api.createRenderer(opt_extraBindFlagsAsStrList, null, function() {
      // BIND_NOT_FOREGROUND puts processes in a different linux cgroup.
      var r3 = api.createRenderer(opt_extraBindFlagsAsStrList || ['BIND_NOT_FOREGROUND'], null, function() {
        var r4 = api.createRenderer(opt_extraBindFlagsAsStrList || ['BIND_NOT_FOREGROUND'], null, function() {
          if (opt_chainOom) {
            r4.bindService(r3.serviceName, ['BIND_ABOVE_CLIENT']);
            r3.bindService(r2.serviceName, ['BIND_ABOVE_CLIENT']);
            r2.bindService(r1.serviceName, ['BIND_ABOVE_CLIENT']);
          }
          if (opt_consumeJavaMegs) {
            r1.consumeNativeMemory(opt_consumeJavaMegs, 20);
            r2.consumeNativeMemory(opt_consumeJavaMegs, 20);
            r3.consumeNativeMemory(opt_consumeJavaMegs, 20);
            r4.consumeNativeMemory(opt_consumeJavaMegs, 20);
          }
        });
      });
    });
  });
};

api.listBindings = function() {
  for (var i = 0; i < bindRecords.length; ++i) {
    console.log('' + i + ': ' + bindRecords[i]);
  }
};

api.listOomScores = function() {
  function printScore(name, pid) {
    try {
      var adjust = readFile('/proc/' + pid + '/oom_adj').trim();
      var score = readFile('/proc/' + pid + '/oom_score').trim();
      var scoreAdj = readFile('/proc/' + pid + '/oom_score_adj').trim();
      console.log(name + ': pid=' + pid + ' adj=' + adjust + ' score=' + score + ' score_adj=' + scoreAdj);
    } catch(e) {
      console.log(name + ': pid=' + pid + ' ERROR. Likely process has died.');
    }
  }
  printScore('MainApp', Process.myPid());
  renderers.forEach(function(ren) {
    printScore(ren.serviceName, ren.pid);
  });
};

api.printMemoryInfo = function() {
  function formatMb(bytes) {
    return (Math.round(bytes / 1024 / 102.4) / 10) + 'mb';
  }
  var memInfo = new android.app.ActivityManager.MemoryInfo();
  var activityManager = api.jsApi.activeActivity.getSystemService(Context.ACTIVITY_SERVICE);
  activityManager.getMemoryInfo(memInfo);
  console.log('Main Process Java Heap: ' + formatMb(java.lang.Runtime.getRuntime().totalMemory()));
  console.log('Device Available RAM: ' + formatMb(memInfo.availMem));
  console.log('Device Low memory threshold: ' + formatMb(memInfo.threshold));
  console.log('Debug.getNativeHeapSize() = ' + formatMb(android.os.Debug.getNativeHeapSize()));
  console.log('Debug.getPss() = ' + formatMb(android.os.Debug.getPss()));

  var myInfo = new android.app.ActivityManager.RunningAppProcessInfo();
  activityManager.getMyMemoryState(myInfo);
  console.log('');
  console.log('myInfo.lastTrimLevel=' + myInfo.lastTrimLevel);
  console.log('myInfo.importance=' + myInfo.importance);
  console.log('myInfo.lru=' + myInfo.lru);
  console.log('myInfo.importanceReasonCode=' + myInfo.importanceReasonCode);
  return activityManager.getRunningAppProcesses();
};

api.listThreads = function() {
  var numThreads = Thread.activeCount();
  threads = java.lang.reflect.Array.newInstance(Thread, numThreads);
  Thread.enumerate(threads);
  console.log('Threads in the main process:');
  for (var i = 0; i < threads.length; ++i) {
    console.log(i + ': ' + threads[i].getName() + '(priority=' + threads[i].getPriority() + ')');
  }
  console.log('Number of processors: ' + Runtime.getRuntime().availableProcessors());
};

api.listWorkers = function(sortKey) {  // 0 = none, 1 = total, 2 = recent (default)
  var data = workerThreads.map(function(worker) {
    var speed = worker.describeSpeed();
    return {
      name: worker.threadId,
      priority: worker.threadPriority,
      totalComputations: speed[0],
      totalComputationsPerSecond: speed[1],
      recentComputationsPerSecond: speed[2]
    };
  });
  if (typeof sortKey == 'undefined') {
    sortKey = 2;
  }
  if (sortKey) {
    data.sort(function(a, b) {
      if (sortKey == 1) {
        return b.totalComputationsPerSecond - a.totalComputationsPerSecond;
      }
      return b.recentComputationsPerSecond - a.recentComputationsPerSecond;
    });
  }
  function round(num) {
    return Math.round(num * 10) / 10;
  }
  console.log('Number of processors: ' + Runtime.getRuntime().availableProcessors());
  data.forEach(function(entry) {
    console.log(entry.name + '(pri=' + entry.priority + ')\t' +
        round(entry.recentComputationsPerSecond) + ' recent loops/s,\t' +
        round(entry.totalComputationsPerSecond) + ' total loops/s,\t' +
        round(entry.totalComputations) + ' total loops');
  });
};

api.consumeJavaMemory = function(megs, opt_chunkSize, opt_target) {
  opt_chunkSize = opt_chunkSize || 2;
  opt_target = opt_target || api.jsApi.activeActivity;
  var amountConsumed = 0;
  while (amountConsumed == 0 || amountConsumed + opt_chunkSize < megs) {
    opt_target.consumeJavaMemory(Math.round(opt_chunkSize * 1024 * 1024))
    amountConsumed += opt_chunkSize;
  }
};

api.consumeNativeMemory = function(megs, opt_chunkSize, opt_target) {
  opt_chunkSize = opt_chunkSize || 2;
  opt_target = opt_target || api.jsApi.activeActivity;
  var amountConsumed = 0;
  while (amountConsumed == 0 || amountConsumed + opt_chunkSize < megs) {
    opt_target.consumeNativeMemory(Math.round(opt_chunkSize * 1024 * 1024))
    amountConsumed += opt_chunkSize;
  }
};

api.consumeNativeMemoryUntilLow = function(opt_chunkSize, opt_renderer) {
  opt_chunkSize = opt_chunkSize || 10;
  var target = opt_renderer || api;
  var count = 0;
  callbackApi.lastTrimCallbackLevel = null;
  function helper() {
    if (count > 0 && count % 200 == 0) {
      console.log('Consumed ' + count + 'mb...');
    }
    if (callbackApi.lastTrimCallbackLevel) {
      console.log('Consumed ' + count + 'mb total.');
    } else {
      count += 1;
      target.consumeNativeMemory(opt_chunkSize);
      setTimeout(helper, 1);
    }
  }
  helper();
};

api.createWorker = function(opt_threadPriority, opt_posix, opt_target, opt_targetName) {
  opt_threadPriority = opt_threadPriority || 0; // THREAD_PRIORITY_DEFAULT = 0.
  opt_target = opt_target || api.jsApi.activeActivity;
  opt_targetName = opt_targetName || 'ActivityApplication';
  var threadId = opt_target.createWorkerThread(opt_threadPriority, false);
  var ret = new WorkerThread(opt_target, threadId, opt_threadPriority);
  workerThreads.push(ret);
  return ret;
};

api.createWorkerNative = function(opt_threadPriority, opt_target, opt_targetName) {
  return api.createWorker(opt_threadPriority, true, opt_target, opt_targetName);
};

api.resetWorkerStats = function() {
  workerThreads.forEach(function(worker) {
    worker.resetStats();
  });
};

api.createAllWorkers = function() {
  var targets = [api];
  targets.push.apply(targets, renderers);
  targets.forEach(function(target) {
    for (var i = 0; i < 8; ++i) {
      var priority = 10 - i;
      var posix = i % 2 != 0;
      target.createWorker(priority, posix);
    }
  });
  console.log('Created 8 workers per process.');
};

api.clearBindings = function() {
  while (bindRecords.length) {
    api.unbindService(0);
  }
};

api.clearWorkers = function() {
  while (workerThreads.length) {
    workerThreads[0].kill();
  }
  lastRenderer = 0;
};

// Functions that are called by java.
var callbackApi = {};

callbackApi.connectionCallback = null;
callbackApi.lastTrimCallbackLevel = null;

callbackApi.onServiceConnected = function(targetName, serviceName, opt_connection) {
  console.log('Confirmed ' + targetName + ' binded to ' + serviceName);
  if (callbackApi.connectionCallback) {
    var cb = callbackApi.connectionCallback;
    callbackApi.connectionCallback = null;
    cb(opt_connection);
  }
};

callbackApi.onServiceDisconnected = function(targetName, serviceName) {
  console.log('Confirmed ' + targetName + ' unbinded from ' + serviceName);
};

callbackApi.onActivityDestroyed = function(activity) {
  var activityName = activity.getClass().getSimpleName();
  console.log('Activity Destroyed: ' + activityName);
};

callbackApi.onTrimMemory = function(contextName, level) {
  for (var k in android.content.ComponentCallbacks2) {
    if (android.content.ComponentCallbacks2[k] === level) {
      level = k;
      break;
    }
  }
  callbackApi.lastTrimCallbackLevel = level;
  console.log(contextName + '.onTrimMemory(' + level + ')');
};

macros = {}

macros.approach1 = function() {
  browser = api.createMainProcessService(function() { // main App
    gpuProcess = api.createRenderer2('strongBinding', function() { // service1
      activeTab = api.createRenderer2('strongBinding', function() { // service2
        doghouse = api.createRenderer2('strongBinding', function() { // service3
          moderateTab1 = api.createRenderer2('perceptBinding', function() { //service4
            moderateTab2 = api.createRenderer2('perceptBinding', function() { //service5
              cchProcess = api.createRenderer2('waivedBinding', function() { //service6
                cchDoghouseProcess = api.createRenderer2('waivedBinding', function() { //service7
                  doghouse.bindAbove(activeTab, function() {
                    cchDoghouseProcess.bindAbove(cchProcess, function() {
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

// This puts gpu process all the way in cch+6. Too aggressive...
macros.approach1OnPause1 = function() {
  gpuProcess.bindAbove(moderateTab1, function() {
    moderateTab1.perceptBinding.unbind();
    moderateTab2.perceptBinding.unbind();
    moderateTab1.bindAbove(doghouse, function() {
      moderateTab2.bindAbove(doghouse, function() {
      });
    });
  });
};

macros.approach1OnPause2 = function() {
  gpuProcess.bindAbove(moderateTab1, function() {
    moderateTab1.perceptBinding.unbind();
    moderateTab2.perceptBinding.unbind();
    moderateTab1.bindAbove(activeTab, function() {
      moderateTab2.bindAbove(activeTab, function() {
      });
    });
  });
};


api.help();
console.log('Starting trim level = ' + context.startMemInfo.lastTrimLevel);
