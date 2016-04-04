var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_1 = require('../../../public/app.common/modules/module');
var UserManagerModule = (function (_super) {
    __extends(UserManagerModule, _super);
    function UserManagerModule() {
        _super.apply(this, arguments);
        //TODO: put in support for caching tabs in localStorage
        this.users = {};
    }
    UserManagerModule.prototype.getDefaultLocals = function () { };
    UserManagerModule.prototype.name = function () { return 'UserManager'; };
    UserManagerModule.prototype.init = function () {
        //this.subscribeToWorker({
        //    'Tab.approved': this.addTab.bind(this)
        //});
    };
    UserManagerModule.prototype.clearPreviousData = function () {
        this.users = {};
    };
    UserManagerModule.prototype.onFetchReceived = function (batch) {
        var _this = this;
        _super.prototype.onFetchReceived.call(this, batch);
        _.forEach(batch, function (user) {
            _this.users[user.id] = _.assign(_this.users[user.id] || {}, user);
            _this.users[user.id].locals = _this.users[user.id].locals || _this.getDefaultLocals();
            PubSub.publish('UserManager.received', user);
        });
    };
    UserManagerModule.prototype.onFetchEnd = function () {
        PubSub.publish('UserManager.end', null);
    };
    UserManagerModule.prototype.delete = function (user) {
        this.postMessage(['UserManager.delete', user]);
    };
    UserManagerModule.prototype.setActivationState = function (user, active) {
        this.postMessage(['UserManager.active', user, active]);
    };
    UserManagerModule.prototype.hash = function () {
        //TODO: WTF??
        return _.reduce(this.users, function (total, x) {
            return total + parseInt(x);
        });
    };
    UserManagerModule.prototype.get = function () {
        return _.values(this.users);
    };
    return UserManagerModule;
})(module_1.Module);
exports.UserManagerModule = UserManagerModule;
//# sourceMappingURL=user-manager-module.js.map