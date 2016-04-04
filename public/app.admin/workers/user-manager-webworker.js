var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var user_manager_webworker_1 = require('../../../public/app.common/workers/user-manager-webworker');
var AdminUserManagerWorker = (function (_super) {
    __extends(AdminUserManagerWorker, _super);
    function AdminUserManagerWorker() {
        _super.apply(this, arguments);
    }
    AdminUserManagerWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-users';
    };
    AdminUserManagerWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-user-batch';
    };
    AdminUserManagerWorker.prototype.isReady = function () {
        return true;
    };
    return AdminUserManagerWorker;
})(user_manager_webworker_1.UserManagerWorker);
exports.AdminUserManagerWorker = AdminUserManagerWorker;
//# sourceMappingURL=user-manager-webworker.js.map