var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var business_webworker_1 = require('../../../public/app.common/workers/business-webworker');
var POSBusinessWorker = (function (_super) {
    __extends(POSBusinessWorker, _super);
    function POSBusinessWorker() {
        _super.apply(this, arguments);
    }
    POSBusinessWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-businesses';
    };
    POSBusinessWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-business';
    };
    return POSBusinessWorker;
})(business_webworker_1.BusinessWorker);
exports.POSBusinessWorker = POSBusinessWorker;
//# sourceMappingURL=business-webworker.js.map