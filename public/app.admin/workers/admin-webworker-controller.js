var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var worker_controller_1 = require('../../../public/app.common/workers/worker-controller');
var business_webworker_1 = require('../../../public/app.admin/workers/business-webworker');
var user_manager_webworker_1 = require('../../../public/app.admin/workers/user-manager-webworker');
var AdminWorkerController = (function (_super) {
    __extends(AdminWorkerController, _super);
    function AdminWorkerController() {
        _super.call(this);
        this.modules = _.assign({}, this.modules, {
            business: new business_webworker_1.AdminBusinessWorker(this),
            user_manager: new user_manager_webworker_1.AdminUserManagerWorker(this),
        });
    }
    AdminWorkerController.prototype.ROUTE = function () { return '/admins'; };
    AdminWorkerController.prototype.name = function () { return 'AdminWorkerController'; };
    return AdminWorkerController;
})(worker_controller_1.WorkerController);
exports.AdminWorkerController = AdminWorkerController;
//# sourceMappingURL=admin-webworker-controller.js.map