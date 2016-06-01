var appPackage = com.example.agrieve.multiprocessdemo;
var Context = android.content.Context;
var Intent = android.content.Intent;
var bindRecords = [];
var lastRenderer = 0;
var lastTrimCallbackLevel;

function setTimeout(func, delay) {
  appPackage.JsApi.uiHandler.postDelayed(func, delay || 0);
}

function BindRecord(connection, serviceName, bindFlagsAsStrList) {
  this.connection = connection;
  this.contextName = connection.mContext.getClass().getSimpleName();
  this.serviceName = serviceName;
  this.bindFlagsAsStrList = bindFlagsAsStrList;
  this.pid = null;
}

BindRecord.prototype.toString = function() {
  return this.contextName + ' -> ' + this.serviceName + ':' + this.pid + ' (' + this.bindFlagsAsStrList.join('|') + ')'
};

function Binding(renderer, bindFlagsAsStrList) {
  this.renderer = renderer;
  this.bindFlagsAsStrList = bindFlagsAsStrList;
  this.isBound = false;
  this.bindRecord = null;
}

Binding.prototype.bind = function(callback) {
  if (this.isBound) {
    return 'Already Bound.';
  }
  this.bindRecord = api.bindService(this.renderer.serviceName, this.bindFlagsAsStrList, this.renderer.context, callback);
  this.isBound = true;
};

Binding.prototype.unbind = function() {
  if (!this.isBound) {
    return 'Already Unbound.';
  }
  api.unbindService(this.bindRecord);
  this.bindRecord = null;
  this.isBound = false;
};

function Renderer(context, serviceName) {
  this.context = context;
  this.serviceName = serviceName;
  this.strongBinding = new Binding(this, ['BIND_AUTO_CREATE', 'BIND_IMPORTANT']);
  this.moderateBinding = new Binding(this, ['BIND_AUTO_CREATE']);
  this.waivedBinding = new Binding(this, ['BIND_AUTO_CREATE', 'BIND_WAIVE_PRIORITY']);
}

Renderer.prototype.consumeJavaMemory = function(megs) {
  if (!this.waivedBinding.isBound) {
    return 'Requires waivedBinding to be bound.';
  }
  api.consumeJavaMemory(megs, this.waivedBinding.bindRecord.connection.mIRemoteService);
};

Renderer.prototype.consumeNativeMemory = function(megs) {
  if (!this.waivedBinding.isBound) {
    return 'Requires waivedBinding to be bound.';
  }
  api.consumeNativeMemory(megs, this.waivedBinding.bindRecord.connection.mIRemoteService);
};


var api = {};

api.jsApi = appPackage.JsApi.instance;

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
      if (!(obj[k] instanceof Function)) {
        console.log('  ' + objName + '.' + k + ' = ' + obj[k]);
      }
    }
    for (var k in obj) {
      if (obj[k] instanceof Function) {
        console.log('  ' + objName + '.' + k + /.*?(\(.*?\))/.exec(obj[k])[1]);
      }
    }
  }
  console.log('Main API:');
  desc('api', api);
  console.log("class Renderer api:");
  desc('renderer', new Renderer());
  console.log("class Binding:");
  desc('binding', new Binding({}, []));
  console.log('Useful shell commands:')
  console.log("  adb shell dumpsys activity | sed -n -e '/dumpsys activity processes/,$p'")
  console.log("  adb shell dumpsys meminfo")
};

api.bindService = function(serviceName, bindFlagsAsStrList, opt_context, opt_callback) {
  if (callbackApi.connectionCallback) {
    throw Error('already a connection callback');
  }
  var activeActivity = opt_context || api.jsApi.activeActivity;

  var intent = new Intent(activeActivity, appPackage[serviceName]);
  var bindFlags = 0;
  bindFlagsAsStrList.forEach(function(str) {
    bindFlags |= Context[str];
  });
  var connection = new appPackage.MyServiceConnection(activeActivity);
  if (!activeActivity.bindService(intent, connection, bindFlags)) {
    throw Error('Bind failed.');
  }
  var bindRecord = new BindRecord(connection, serviceName, bindFlagsAsStrList);
  bindRecords.push(bindRecord);

  callbackApi.connectionCallback = function() {
    bindRecord.pid = connection.mIRemoteService.setupConnection(connection.mCallback);
    console.log('Binding connected: ' + bindRecord);

    if (opt_callback) {
      opt_callback();
    }
  };

  return bindRecord;
};

api.unbindService = function(indexOrRecord) {
  var bindRecord = indexOrRecord;
  if (typeof indexOrRecord == 'number') {
    bindRecord = bindRecords[indexOrRecord];
  }
  var bindRecordIndex = bindRecords.indexOf(bindRecord);
  if (bindRecordIndex == -1) {
    return 'Invalid index.';
  }
  console.log('Removing binding ' + bindRecordIndex + ': ' + bindRecord);
  bindRecord.connection.mContext.unbindService(bindRecord.connection);
  bindRecords.splice(bindRecordIndex, 1);
};

api.listBindings = function() {
  for (var i = 0; i < bindRecords.length; ++i) {
    console.log('' + i + ': ' + bindRecords[i]);
  }
};

api.createRenderer = function(opt_serviceName, opt_callback) {
  if (!opt_serviceName) {
    opt_serviceName = 'Service' + (++lastRenderer);
  }
  var renderer = new Renderer(api.jsApi.activeActivity, opt_serviceName);
  renderer.moderateBinding.bind(function() {
    renderer.waivedBinding.bind(opt_callback);
  });
  return renderer;
};

api.createAll = function(opt_consumeJavaMegs) {
  ren1 = api.createRenderer(null, function() {
    ren2 = api.createRenderer(null, function() {
      ren3 = api.createRenderer(null, function() {
        ren4 = api.createRenderer(null, function() {
          if (opt_consumeJavaMegs) {
            ren1.consumeNativeMemory(opt_consumeJavaMegs);
            ren2.consumeNativeMemory(opt_consumeJavaMegs);
            ren3.consumeNativeMemory(opt_consumeJavaMegs);
            ren4.consumeNativeMemory(opt_consumeJavaMegs);
          }
        });
      });
    });
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
};

api.consumeJavaMemory = function(megs, opt_target) {
  opt_target = opt_target || api.jsApi.activeActivity;
  for (var i = 0; i < megs; ++i) {
    opt_target.consumeJavaMemory(1 * 1024 * 1024);
  }
};

api.consumeNativeMemory = function(megs, opt_target) {
  opt_target = opt_target || api.jsApi.activeActivity;
  for (var i = 0; i < megs; ++i) {
    opt_target.consumeNativeMemory(1 * 1024 * 1024)
  }
};

api.consumeNativeMemoryUntilLow = function() {
  var count = 0;
  lastTrimCallbackLevel = null;
  function helper() {
    if (count > 0 && count % 200 == 0) {
      console.log('Consumed ' + count + 'mb...');
    }
    if (lastTrimCallbackLevel) {
      console.log('Consumed ' + count + 'mb total.');
    } else {
      count += 10;
      api.consumeNativeMemory(10);
      setTimeout(helper, 100);
    }
  }
  helper();
};


api.reset = function() {
  while (bindRecords.length) {
    api.unbindService(0);
  }
  bindRecords = [];
  lastRenderer = 0;
};

// Functions that are called by java.
var callbackApi = {};

callbackApi.connectionCallback = null;

callbackApi.onServiceConnected = function(connection, componentName) {
  var activityName = connection.mContext.getClass().getSimpleName();
  console.log('Confirmed ' + activityName + ' binded to ' + componentName.toString());
  if (callbackApi.connectionCallback) {
    var cb = callbackApi.connectionCallback;
    callbackApi.connectionCallback = null;
    cb();
  }
};

callbackApi.onServiceDisconnected = function(connection, componentName) {
  var activityName = connection.mContext.getClass().getSimpleName();
  console.log('Confirmed ' + activityName + ' unbinded from ' + componentName.toString());
};

callbackApi.onActivityDestroyed = function(activity) {
  var activityName = activity.getClass().getSimpleName();
  console.log('Activity Destroyed: ' + activityName);
  for (var i = 0; i < bindRecords.length;) {
    if (bindRecords[i].connection.mContext == activity) {
      api.unbindService(i);
    } else {
      ++i;
    }
  }
};

callbackApi.onTrimMemory = function(level) {
  for (var k in android.content.ComponentCallbacks2) {
    if (android.content.ComponentCallbacks2[k] === level) {
      level = k;
      break;
    }
  }
  lastTrimCallbackLevel = level;
  console.log('onTrimMemory(' + level + ')');
};

api.help();

