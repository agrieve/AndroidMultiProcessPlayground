var appPackage = com.example.agrieve.multiprocessdemo;
var Context = android.content.Context;
var Intent = android.content.Intent;

function BindRecord(connection, serviceName, bindFlagsAsStrList) {
  this.connection = connection;
  this.contextName = connection.mContext.getClass().getSimpleName();
  this.serviceName = serviceName;
  this.bindFlagsAsStrList = bindFlagsAsStrList;
}

BindRecord.prototype.toString = function() {
  return this.contextName + ' -> ' + this.serviceName + '(' + this.bindFlagsAsStrList.join('|') + ')'
};

function ServiceApi() {
}

var api = {};

api.jsApi = appPackage.JsApi.instance;
api.bindRecords = [];
//api.handler = new android.os.Handler(android.os.Looper.getMainLooper());

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
  console.log("Available commands:");
  for (var k in api) {
    if (api[k] instanceof Function) {
      console.log('  api.' + k);
    }
  }
  console.log("Available properties:");
  for (var k in api) {
    if (!(api[k] instanceof Function)) {
      console.log('  api.' + k + ' = ' + api[k]);
    }
  }
};

api.bindService = function(serviceName, bindFlagsAsStrList) {
  var activeActivity = api.jsApi.activeActivity;

  var intent = new Intent(activeActivity, appPackage[serviceName]);
  var bindFlags = 0;
  bindFlagsAsStrList.forEach(function(str) {
    bindFlags |= Context[str];
  });
  var connection = new appPackage.MyServiceConnection(activeActivity);
  if (!activeActivity.bindService(intent, connection, bindFlags)) {
    console.log('Bind failed.');
    return false;
  }
  api.bindRecords.push(new BindRecord(connection, serviceName, bindFlagsAsStrList));
  return true;
};

api.unbindService = function(bindRecordIndex) {
  var bindRecord = api.bindRecords[bindRecordIndex];
  console.log('Removing binding ' + bindRecordIndex + ': ' + bindRecord);
  bindRecord.connection.mContext.unbindService(bindRecord.connection);
  api.bindRecords.splice(bindRecordIndex, 1);
};

api.listBindings = function() {
  for (var i = 0; i < api.bindRecords.length; ++i) {
    console.log('' + i + ': ' + api.bindRecords[i]);
  }
};

api.createRenderer = function(serviceName) {
  
}



// Functions that are called by java.
var callbackApi = {};

callbackApi.onServiceConnected = function(connection, componentName) {
  var activityName = connection.mContext.getClass().getSimpleName();
  console.log(activityName + ' now connected to ' + componentName.toString());
};

callbackApi.onServiceDisconnected = function(connection, componentName) {
  var activityName = connection.mContext.getClass().getSimpleName();
  console.log(activityName + ' now disconnected from ' + componentName.toString());
};

callbackApi.onActivityDestroyed = function(activity) {
  var activityName = activity.getClass().getSimpleName();
  console.log('Activity Destroyed: ' + activityName);
  for (var i = 0; i < api.bindRecords.length;) {
    if (api.bindRecords[i].connection.mContext == activity) {
      api.unbindService(i);
    } else {
      ++i;
    }
  }
};

api.help();