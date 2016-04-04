var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tab_webworker_1 = require('../../../public/app.common/workers/tab-webworker');
var POSTabWorker = (function (_super) {
    __extends(POSTabWorker, _super);
    function POSTabWorker() {
        _super.apply(this, arguments);
    }
    POSTabWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-open-tabs';
    };
    POSTabWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-open-tab';
    };
    POSTabWorker.prototype.init = function () {
        var _this = this;
        _super.prototype.init.call(this);
        this.socket.on('order-approved', function (tab, callback) {
            callback(200, _this.socket.id);
            postMessage(['Tab.approved', tab]);
        });
    };
    return POSTabWorker;
})(tab_webworker_1.TabWorker);
exports.POSTabWorker = POSTabWorker;
//# sourceMappingURL=tab-webworker.js.map