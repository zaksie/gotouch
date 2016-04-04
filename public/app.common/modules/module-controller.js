var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var controller_1 = require('../../../public/app.common/modules/controller');
exports.AUTO_SAVE_INTERVAL = 1000 * 60 * 5;
var ModuleController = (function (_super) {
    __extends(ModuleController, _super);
    function ModuleController() {
        _super.apply(this, arguments);
        this.workerSubscribers = {
            'onWorkerReady': this.onReady.bind(this),
            'onWorkerAwaitingLinking': this.onWorkerAwaitingLinking.bind(this)
        };
        this.workerReady = false;
    }
    ModuleController.prototype.init = function () {
        var _this = this;
        setInterval(this.automaticSave, exports.AUTO_SAVE_INTERVAL);
        if (!window.Worker)
            throw new Error('Web worker are required to use yummlet');
        this.worker = new Worker(this.workerUrl());
        this.worker.onmessage = function (e) {
            var allConcernedParties = _.assign({ this: _this }, _this.modules);
            _.forEach(allConcernedParties, function (party) {
                _.forEach(party.workerSubscribers, function (subscriber, name) {
                    if (e.data[0] == name)
                        subscriber(e.data[1], e.data[2], e.data[3]);
                });
            });
        };
    };
    ModuleController.prototype.onWorkerAwaitingLinking = function (e) {
        console.log('Business web worker is awaiting linking');
        this.postMessage('onUserLinked');
    };
    ModuleController.prototype.automaticSave = function () {
        _.forEach(this.modules, function (module) {
            module.save();
        });
    };
    return ModuleController;
})(controller_1.Controller);
exports.ModuleController = ModuleController;
//# sourceMappingURL=module-controller.js.map