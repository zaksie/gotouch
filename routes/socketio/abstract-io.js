var app_1 = require('../../app');
var async = require('async');
var SocketIOModule = (function () {
    function SocketIOModule() {
    }
    SocketIOModule.prototype.handshake = function (socket, data) {
        var _this = this;
        this.USER_MODULE().handshake(socket, data, function (err, userobj) {
            if (userobj.isLoggedIn) {
                socket.emit('user-authenticated', userobj.user);
                _this.onAuthenticatedOnHandshake(socket, userobj);
            }
            else
                _this.onNotAuthenticatedOnHandshake(socket);
        });
    };
    SocketIOModule.prototype.onNotAuthenticatedOnHandshake = function (socket) { };
    SocketIOModule.prototype.onAuthenticatedOnHandshake = function (socket, session) { };
    SocketIOModule.prototype.ensure = function (socket, name, next) {
        var _this = this;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args[_i - 3] = arguments[_i];
        }
        app_1.logging.info('ensuring for function: ' + name);
        var onChecked = function (err, isLoggedIn) {
            if (!(err || !isLoggedIn))
                return next.apply(void 0, [socket].concat(args));
            console.log('ensure FAILED for ' + next.name);
            if (err)
                _this.sendServerError(socket);
            else if (!isLoggedIn)
                _this.send401(socket);
        };
        this.ensureAux(socket, function (err, isLoggedIn) {
            if (err || !isLoggedIn)
                return _this.ensureWithPassportInit(socket, onChecked);
            onChecked(err, isLoggedIn);
        });
    };
    SocketIOModule.prototype.linkMe = function (socket) { };
    SocketIOModule.prototype.init = function () {
        var _this = this;
        app_1.app.io.of(this.USER_ROUTE).on('connection', function (socket) {
            socket.on('handshake', function (data) {
                _this.handshake(socket, data);
            });
            _this.initSocket(socket);
        });
    };
    SocketIOModule.prototype.logError = function (err) {
        if (err)
            app_1.logging.error(err);
        return !!err;
    };
    SocketIOModule.prototype.ensureAux = function (socket, callback) {
        var that = this;
        this.USER_MODULE().ensure(socket, function (err, userobj) {
            callback(err, userobj.isLoggedIn);
        });
    };
    SocketIOModule.prototype.ensureWithPassportInit = function (socket, final_callback) {
        var _this = this;
        async.series([
            function (callback) {
                socket.request.session.reload(callback);
            },
            function (callback) {
                app_1.app.passport_modules.init(socket.request, socket.request.res, callback);
            },
            function (callback) {
                app_1.app.passport_modules.session(socket.request, socket.request.res, callback);
            }], function (err) {
            if (err)
                return final_callback(err);
            _this.ensureAux(socket, final_callback);
        });
    };
    SocketIOModule.prototype.sendServerError = function (socket, msg) {
        socket.emit('server-error');
    };
    SocketIOModule.prototype.send401 = function (socket, msg) {
        socket.emit('401');
    };
    return SocketIOModule;
})();
exports.SocketIOModule = SocketIOModule;
//# sourceMappingURL=abstract-io.js.map