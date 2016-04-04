var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var worker_controller_1 = require('../../../public/app.common/workers/worker-controller');
var business_webworker_1 = require('../../../public/app.client/workers/business-webworker');
var tab_webworker_1 = require('../../../public/app.client/workers/tab-webworker');
var menu_webworker_1 = require('../../../public/app.client/workers/menu-webworker');
exports.ROUTE = '/diners';
var ClientWorkerController = (function (_super) {
    __extends(ClientWorkerController, _super);
    function ClientWorkerController() {
        _super.call(this);
        this.modules = _.assign({}, this.modules, {
            business: new business_webworker_1.ClientBusinessWorker(this),
            tab: new tab_webworker_1.ClientTabWorker(this),
            menu: new menu_webworker_1.ClientMenuWorker(this)
        });
    }
    ClientWorkerController.prototype.ROUTE = function () { return exports.ROUTE; };
    ClientWorkerController.prototype.name = function () { return 'ClientWorkerController'; };
    return ClientWorkerController;
})(worker_controller_1.WorkerController);
exports.ClientWorkerController = ClientWorkerController;
//# sourceMappingURL=client-webworker-controller.js.map