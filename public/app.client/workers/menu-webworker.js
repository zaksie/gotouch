var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var menu_webworker_1 = require('../../../public/app.common/workers/menu-webworker');
var ClientMenuWorker = (function (_super) {
    __extends(ClientMenuWorker, _super);
    function ClientMenuWorker() {
        _super.apply(this, arguments);
    }
    ClientMenuWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-menu';
    };
    ClientMenuWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-menu';
    };
    ClientMenuWorker.prototype.isReady = function () {
        return true;
    };
    return ClientMenuWorker;
})(menu_webworker_1.MenuWorker);
exports.ClientMenuWorker = ClientMenuWorker;
//# sourceMappingURL=menu-webworker.js.map