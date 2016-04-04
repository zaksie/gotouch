importScripts('/bower_components/system.js/dist/system.js');
var worker;
System.import('/chefs/app/business-webworker').then(function (loaded) {
    worker = new loaded.POSBusinessWorker();
});