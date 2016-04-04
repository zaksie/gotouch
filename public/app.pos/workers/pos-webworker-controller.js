var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var worker_controller_1 = require('../../../public/app.common/workers/worker-controller');
var business_webworker_1 = require('../../../public/app.pos/workers/business-webworker');
var tab_webworker_1 = require('../../../public/app.pos/workers/tab-webworker');
var menu_webworker_1 = require('../../../public/app.pos/workers/menu-webworker');
var POSWorkerController = (function (_super) {
    __extends(POSWorkerController, _super);
    function POSWorkerController() {
        _super.call(this);
        this.modules = _.assign({}, this.modules, {
            business: new business_webworker_1.POSBusinessWorker(this),
            tab: new tab_webworker_1.POSTabWorker(this),
            menu: new menu_webworker_1.POSMenuWorker(this)
        });
    }
    POSWorkerController.prototype.ROUTE = function () { return '/chefs'; };
    POSWorkerController.prototype.name = function () { return 'POSWorkerController'; };
    return POSWorkerController;
})(worker_controller_1.WorkerController);
exports.POSWorkerController = POSWorkerController;
//# sourceMappingURL=pos-webworker-controller.js.map