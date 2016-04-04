importScripts('/node_modules/socket.io-client/socket.io.js', '/public/js/lodash.min.js');
(function (Progress) {
    Progress[Progress["START"] = 1] = "START";
    Progress[Progress["ONGOING"] = 2] = "ONGOING";
    Progress[Progress["COMPELETE"] = 3] = "COMPELETE";
})(exports.Progress || (exports.Progress = {}));
var Progress = exports.Progress;
;
var WebWorker = (function () {
    function WebWorker(controller) {
        this.percent = 0;
        this.step = 1 / 47; // TODO: THIS IS  A DUMMY VARIABLE. A MECHANISM FOR SHOWING PROGRESS IS REQUIRED
        this.finished_fetching = false;
        this.parentSubscribers = {};
        this.controller = controller;
        this.socket = controller.getSocket();
        this.init();
        this.postConstructorDoneMessage();
    }
    WebWorker.prototype.subscribeToModule = function (subscribers) {
        this.parentSubscribers = _.assign(subscribers, this.parentSubscribers);
    };
    WebWorker.prototype.postConstructorDoneMessage = function () {
        postMessage([this.name() + '.ready']);
    };
    WebWorker.prototype.init = function () {
        this.socket.on(this.RECEIVE_MESSAGE(), this.onReceive.bind(this));
        this.socket.on(this.RECEIVE_MESSAGE() + '-end', this.onReceiveEnd.bind(this));
        this.socket.on(this.RECEIVE_MESSAGE() + '-error', this.onReceiveError.bind(this));
        var subscribers = {};
        subscribers['onRequest' + this.name()] = this.onRequest.bind(this);
        this.subscribeToModule(subscribers);
    };
    WebWorker.prototype.incrementProgress = function (state) {
        switch (state) {
            case Progress.COMPELETE:
                this.percent = 100;
                this.finished_fetching = true;
                break;
            case Progress.START:
                this.percent = 1;
                this.finished_fetching = false;
                break;
            case Progress.ONGOING:
                this.percent += this.step;
                this.finished_fetching = false;
        }
        postMessage([this.name() + '.progress', this.percent]);
    };
    WebWorker.prototype.onReceive = function (data) {
        this.incrementProgress(Progress.ONGOING);
        postMessage([this.name() + '.received', data]);
    };
    WebWorker.prototype.onReceiveEnd = function (data) {
        postMessage([this.name() + '.received.end', data]);
        this.done();
    };
    WebWorker.prototype.onReceiveError = function () {
        postMessage([this.name() + '.received.error']);
        this.done();
    };
    WebWorker.prototype.done = function () {
        this.incrementProgress(Progress.COMPELETE);
    };
    WebWorker.prototype.onRequest = function (data) {
        if (this.socket && this.REQUEST_MESSAGE())
            this.request(data);
    };
    WebWorker.prototype.request = function (data) {
        this.incrementProgress(Progress.START);
        return this.socket.emit(this.REQUEST_MESSAGE(), data);
    };
    return WebWorker;
})();
exports.WebWorker = WebWorker;
//# sourceMappingURL=webworker.js.map