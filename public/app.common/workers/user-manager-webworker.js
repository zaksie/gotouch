var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var webworker_1 = require('../../../public/app.common/workers/webworker');
var UserManagerWorker = (function (_super) {
    __extends(UserManagerWorker, _super);
    function UserManagerWorker() {
        _super.apply(this, arguments);
        this.users = {};
    }
    UserManagerWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-users';
    };
    UserManagerWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-user-batch';
    };
    UserManagerWorker.prototype.init = function () {
        _super.prototype.init.call(this);
        this.subscribeToModule({
            'UserManager.delete': this.onDelete.bind(this),
            'UserManager.active': this.onSetActiveState.bind(this),
        });
    };
    UserManagerWorker.prototype.clearPreviousData = function () {
        this.users = {};
    };
    UserManagerWorker.prototype.onReceive = function (batch) {
        var _this = this;
        _super.prototype.onReceive.call(this, batch);
        _.forEach(batch, function (user) {
            _this.users[user.id] = _.assign(_this.users[user.id] || {}, user);
        });
    };
    UserManagerWorker.prototype.onDelete = function (user) {
        this.socket.emit('delete-pos-user', user);
    };
    UserManagerWorker.prototype.onSetActiveState = function (user, active) {
        this.socket.emit('deactivate-sms-code', user, active);
    };
    UserManagerWorker.prototype.name = function () {
        return 'UserManager';
    };
    return UserManagerWorker;
})(webworker_1.WebWorker);
exports.UserManagerWorker = UserManagerWorker;
//# sourceMappingURL=user-manager-webworker.js.map