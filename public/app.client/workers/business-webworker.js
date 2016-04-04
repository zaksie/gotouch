var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var business_webworker_1 = require('../../../public/app.common/workers/business-webworker');
var ClientBusinessWorker = (function (_super) {
    __extends(ClientBusinessWorker, _super);
    function ClientBusinessWorker() {
        _super.apply(this, arguments);
    }
    ClientBusinessWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-businesses';
    };
    ClientBusinessWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-business';
    };
    return ClientBusinessWorker;
})(business_webworker_1.BusinessWorker);
exports.ClientBusinessWorker = ClientBusinessWorker;
//# sourceMappingURL=business-webworker.js.map