var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_controller_1 = require('../../../public/app.common/modules/module-controller');
var user_module_1 = require('../../../public/app.common/modules/user-module');
var business_module_1 = require('../../../public/app.admin/modules/business-module');
var user_manager_module_1 = require('../../../public/app.admin/modules/user-manager-module');
var AdminController = (function (_super) {
    __extends(AdminController, _super);
    function AdminController() {
        _super.call(this);
        this.modules = _.assign({}, this.modules, {
            user: new user_module_1.CommonUserModule(this),
            business: new business_module_1.AdminBusinessModule(this),
            user_manager: new user_manager_module_1.AdminUserManagerModule(this)
        });
    }
    AdminController.prototype.ROUTE = function () { return '/admins'; };
    AdminController.prototype.workerUrl = function () { return '/public/app.admin/workers/webworker-loader.js'; };
    AdminController.prototype.name = function () { return 'AdminController'; };
    return AdminController;
})(module_controller_1.ModuleController);
exports.AdminController = AdminController;
exports.CommonModule = new AdminController();
//# sourceMappingURL=admin-controller.js.map