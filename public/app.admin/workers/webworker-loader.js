importScripts('/bower_components/system.js/dist/system.js');
var workerController;
System.defaultJSExtensions = true;
System.import('/public/app.admin/workers/admin-webworker-controller').then(function (loaded) {
    workerController = new loaded.AdminWorkerController();
});