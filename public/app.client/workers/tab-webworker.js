var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tab_webworker_1 = require('../../../public/app.common/workers/tab-webworker');
var ClientTabWorker = (function (_super) {
    __extends(ClientTabWorker, _super);
    function ClientTabWorker() {
        _super.apply(this, arguments);
    }
    ClientTabWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-open-tabs';
    };
    ClientTabWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-open-tab';
    };
    ClientTabWorker.prototype.init = function () {
        _super.prototype.init.call(this);
    };
    return ClientTabWorker;
})(tab_webworker_1.TabWorker);
exports.ClientTabWorker = ClientTabWorker;
//# sourceMappingURL=tab-webworker.js.map