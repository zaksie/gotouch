var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var user_manager_module_1 = require('../../../public/app.common/modules/user-manager-module');
var AdminUserManagerModule = (function (_super) {
    __extends(AdminUserManagerModule, _super);
    function AdminUserManagerModule() {
        _super.apply(this, arguments);
        this.current = {};
    }
    AdminUserManagerModule.prototype.getDefaultLocals = function () { };
    AdminUserManagerModule.prototype.init = function () {
        _super.prototype.init.call(this);
    };
    AdminUserManagerModule.prototype.save = function () { };
    return AdminUserManagerModule;
})(user_manager_module_1.UserManagerModule);
exports.AdminUserManagerModule = AdminUserManagerModule;
//# sourceMappingURL=user-manager-module.js.map