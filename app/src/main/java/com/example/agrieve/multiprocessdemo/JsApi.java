package com.example.agrieve.multiprocessdemo;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.stetho.InspectorModulesProvider;
import com.facebook.stetho.Stetho;
import com.facebook.stetho.inspector.console.CLog;
import com.facebook.stetho.inspector.protocol.ChromeDevtoolsDomain;
import com.facebook.stetho.inspector.protocol.module.Console;
import com.facebook.stetho.rhino.JsRuntimeReplFactoryBuilder;

import org.mozilla.javascript.BaseFunction;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.Scriptable;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;


/**
 * Created by agrieve on 5/25/16.
 */
public class JsApi {
    private static final String TAG = "JsApi";
    public static Handler uiHandler = new Handler(Looper.getMainLooper());
    public static JsApi instance;

    public Activity activeActivity;
    private Scriptable jsGlobalScope;

    void evalJs(final String code) {
        uiHandler.post(new Runnable() {
            @Override
            public void run() {
                org.mozilla.javascript.Context cx = org.mozilla.javascript.Context.enter();
                try {
                    cx.evaluateString(jsGlobalScope, code, "<anon>", 0, null);
                } finally {
                    org.mozilla.javascript.Context.exit();
                }
            }
        });
    }

    void callback(final String callbackName, final Object... args) {
        if (jsGlobalScope == null) {
            Log.w(TAG, "jsGlobalScope was null for callback " + callbackName + " args: " + args);
            return;
        }
        uiHandler.post(new Runnable() {
            @Override
            public void run() {
                org.mozilla.javascript.Context cx = org.mozilla.javascript.Context.enter();
                try {
                    Scriptable namespaceObj = (Scriptable)jsGlobalScope.get("callbackApi", jsGlobalScope);
                    Function func = (Function)namespaceObj.get(callbackName, namespaceObj);
                    func.call(cx, jsGlobalScope, namespaceObj, args);
                } finally {
                    org.mozilla.javascript.Context.exit();
                }
            }
        });
    }

    static void init(final Context context) {
        if (instance != null) {
            throw new IllegalStateException();
        }
        instance = new JsApi();
        Stetho.initialize(Stetho.newInitializerBuilder(context)
                .enableWebKitInspector(new InspectorModulesProvider() {
                    @Override
                    public Iterable<ChromeDevtoolsDomain> get() {
                        JsRuntimeReplFactoryBuilder jsRuntimeBuilder = new JsRuntimeReplFactoryBuilder(context);
                        jsRuntimeBuilder.addFunction("init", new BaseFunction() {
                            @Override
                            public Object call(org.mozilla.javascript.Context cx, Scriptable scope, Scriptable thisObj, Object[] args) {
                                instance.jsGlobalScope = scope;
                                try {
                                    InputStream inputStream = context.getAssets().open("code.js");
                                    BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"));
                                    cx.evaluateReader(scope, reader, "code.js", 0, null);
                                    reader.close();
                                    return "Initialized. API available in \"api\" variable";
                                } catch (IOException e) {
                                    e.printStackTrace();
                                    return "An error occurred.";
                                }
                            }
                        });
                        return new Stetho.DefaultInspectorModulesBuilder(context).runtimeRepl(jsRuntimeBuilder.build()).finish();
                    }
                }).build());
    }

    static void log(String message) {
        CLog.writeToConsole(Console.MessageLevel.LOG, Console.MessageSource.OTHER, message);
    }

    void setActiveActivity(Activity activeActivity) {
        log("Active Activity is now: " + activeActivity.getClass().getName());
        this.activeActivity = activeActivity;
    }
}
