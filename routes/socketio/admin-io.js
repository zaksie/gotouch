var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../app');
var user_admin_1 = require('../../lib/user/admin/user-admin');
var abstract_io_1 = require('./abstract-io');
var AdminIO = (function (_super) {
    __extends(AdminIO, _super);
    function AdminIO() {
        _super.call(this);
        //userModule() { return admin }; // unfortunately this cannot be done yet in TS
        this.USER_ROUTE = user_admin_1.ADMIN_USER_ROUTE;
        this.USER_MODULE = function () { return app_1.admin; };
    }
    AdminIO.prototype.initSocket = function (socket) {
        var _this = this;
        this.handshake(socket, null);
        socket.on('request-users', function () { _this.ensure(socket, 'emitPOSUsers', _this.emitPOSUsers); });
        socket.on('request-businesses', function () { _this.ensure(socket, 'emitBusinesses', _this.emitBusinesses); });
        socket.on('request-business-hash', function () { _this.ensure(socket, 'emitBusinessHash', _this.emitBusinessHash); });
        socket.on('delete-user', function (user) { _this.ensure(socket, 'deletePOSUser', _this.deletePOSUser, user); });
        socket.on('deactivate-sms-code', function (user, value) { _this.ensure(socket, 'deactivatePOSUser', _this.deactivatePOSUser, user, value); });
    };
    AdminIO.prototype.deletePOSUser = function (socket, user) {
        app_1.admin.deletePOSUser(user, function (err) {
            if (err)
                app_1.logging.error(err);
        });
    };
    AdminIO.prototype.deactivatePOSUser = function (socket, user, value) {
        app_1.admin.deactivatePOSUser(user, value, function (err) {
            if (err)
                app_1.logging.error(err);
        });
    };
    AdminIO.prototype.emitPOSUsers = function (socket) {
        app_1.admin.getPOSUsers(function (batch) {
            socket.emit('receive-user-batch', batch);
        }, function (err) {
            socket.emit('receive-user-batch-end');
            if (err)
                return app_1.logging.error(err);
        });
    };
    AdminIO.prototype.emitBusinesses = function (socket) {
        console.time('fetch all businesses');
        app_1.admin.getBusinesses(function (batch) {
            socket.emit('receive-business-batch', batch);
        }, function (err) {
            console.timeEnd('fetch all businesses');
            if (err)
                return app_1.logging.error(err);
            socket.emit('receive-business-batch-end');
        });
    };
    AdminIO.prototype.emitBusinessHash = function (socket) {
        console.time('get hash of all businesses');
        app_1.admin.getBusinessHash(function (percent) {
            socket.emit('receive-business-hash', percent);
        }, function (err, hash) {
            console.timeEnd('get hash of all businesses');
            if (err)
                return app_1.logging.error(err);
            socket.emit('receive-business-hash-end', hash);
        });
    };
    return AdminIO;
})(abstract_io_1.SocketIOModule);
exports.AdminIO = AdminIO;
//# sourceMappingURL=admin-io.js.map