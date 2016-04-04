var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var base_1 = require('../../../public/app.common/modules/base');
var Module = (function (_super) {
    __extends(Module, _super);
    function Module(controller) {
        _super.call(this);
        this.workerSubscribers = {};
        this.controller = controller;
        this.worker = controller.worker;
        var subscriptions = {};
        subscriptions[this.name() + '.ready'] = this.onReady.bind(this);
        subscriptions[this.name() + '.received'] = this.onFetchReceived.bind(this);
        subscriptions[this.name() + '.received.end'] = this.onFetchEnd.bind(this);
        subscriptions[this.name() + '.received.error'] = this.onFetchError.bind(this);
        subscriptions[this.name() + '.progress'] = this.onLoadingProgress.bind(this);
        this.subscribeToWorker(subscriptions);
        this.init();
    }
    Module.prototype.subscribeToWorker = function (subscriptions) {
        for (var s in subscriptions)
            this.workerSubscribers[s] = subscriptions[s];
    };
    Module.prototype.refresh = function () {
        this.request();
    };
    Module.prototype.saveAux = function (array, id) {
        _.forEach(array, function (item) {
            if (!localStorage)
                return;
            var existingStringified = localStorage[item[id]];
            var locals = {};
            if (existingStringified)
                locals = JSON.parse(existingStringified);
            _.assign(locals, item.locals);
            localStorage[item[id]] = JSON.stringify(locals);
        });
    };
    Module.prototype.request = function (data) {
        this.clearPreviousData();
        this.fetchInProgress = true;
        this.postMessage(['onRequest' + this.name(), data]);
    };
    Module.prototype.onLoadingProgress = function (data) {
        return PubSub.publish('Loading.progress.' + this.name(), data);
    };
    Module.prototype.onFetchReceived = function (data) {
    };
    Module.prototype.onFetchEnd = function (data) {
        this.fetchInProgress = false;
    };
    Module.prototype.onFetchError = function (data) {
        this.fetchInProgress = false;
    };
    return Module;
})(base_1.Base);
exports.Module = Module;
//# sourceMappingURL=module.js.map