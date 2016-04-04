var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var webworker_1 = require('../../../public/app.common/workers/webworker');
var UserWorker = (function (_super) {
    __extends(UserWorker, _super);
    function UserWorker() {
        _super.apply(this, arguments);
    }
    UserWorker.prototype.RECEIVE_MESSAGE = function () { return ''; };
    UserWorker.prototype.REQUEST_MESSAGE = function () { return ''; };
    UserWorker.prototype.name = function () {
        return 'User';
    };
    UserWorker.prototype.init = function () {
        this.socket.on('logout', function (callback) {
            callback(200);
            postMessage(['User.logout']);
        });
        this.socket.on('user-authenticated', function (profile) {
            postMessage(['User.authenticated', profile]);
        });
        this.socket.on('user-linked', function () {
            postMessage(['User.linked']);
        });
        this.subscribeToModule({
            'User.handshake': this.handshake.bind(this),
            'User.linkme': this.linkMe.bind(this)
        });
    };
    UserWorker.prototype.clearPreviousData = function () { };
    UserWorker.prototype.handshake = function (data) {
        this.socket.emit('handshake');
    };
    UserWorker.prototype.linkMe = function (data) {
        this.socket.emit('link-me');
    };
    UserWorker.prototype.isReady = function () {
        return true;
    };
    return UserWorker;
})(webworker_1.WebWorker);
exports.UserWorker = UserWorker;
//# sourceMappingURL=user-webworker.js.map