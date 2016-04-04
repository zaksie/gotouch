var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var controller_1 = require('../../../public/app.common/modules/controller');
var user_webworker_1 = require('../../../public/app.common/workers/user-webworker');
var WorkerController = (function (_super) {
    __extends(WorkerController, _super);
    function WorkerController() {
        _super.apply(this, arguments);
        this.parentSubscribers = {
            'onUserLinked': this.onUserAuthenticatedInApp.bind(this)
        };
    }
    WorkerController.prototype.init = function () {
        var _this = this;
        this.socket = io(location.host + this.ROUTE(), { timeout: 1000 * 60 * 60 * 24 });
        console.log('socket connected to ' + this.ROUTE());
        this.modules = _.assign({}, this.modules, {
            user: new user_webworker_1.UserWorker(this),
        });
        onmessage = function (e) {
            var allConcernedParties = _.assign({ this: _this }, _this.modules);
            _.forEach(allConcernedParties, function (party) {
                _.forEach(party.parentSubscribers, function (subscriber, name) {
                    if (e.data[0] == name)
                        subscriber(e.data[1], e.data[2], e.data[3]);
                });
            });
        };
        this.socket.on('user-linked', this.onUserLinkedInWorker.bind(this));
    };
    WorkerController.prototype.getSocket = function () { return this.socket; };
    WorkerController.prototype.onUserAuthenticatedInApp = function () {
        this.socket.emit('link-me');
    };
    WorkerController.prototype.onUserLinkedInWorker = function () {
        postMessage(['Worker.linked']);
    };
    return WorkerController;
})(controller_1.Controller);
exports.WorkerController = WorkerController;
//# sourceMappingURL=worker-controller.js.map