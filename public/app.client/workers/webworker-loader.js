importScripts('/bower_components/system.js/dist/system.js');
var workerController;
System.defaultJSExtensions = true;
System.import('/public/app.client/workers/client-webworker-controller').then(function (loaded) {
    workerController = new loaded.ClientWorkerController();
});