importScripts('/bower_components/system.js/dist/system.js');
var workerController;
System.defaultJSExtensions = true;
System.import('/public/app.pos/workers/pos-webworker-controller').then(function (loaded) {
    workerController = new loaded.POSWorkerController();
});