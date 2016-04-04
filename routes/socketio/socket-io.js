var app_1 = require('../../app');
var client_io_1 = require('./client-io');
var pos_io_1 = require('./pos-io');
var admin_io_1 = require('./admin-io');
var async = require('async');
var _ = require('lodash');
var MainIO = (function () {
    function MainIO() {
        this.init();
    }
    MainIO.prototype.init = function () {
        app_1.app.io.use(function (socket, next) {
            app_1.cookie(socket.request, socket.request.res, next);
        });
        app_1.app.io.use(function (socket, next) {
            var cookie = socket.request[app_1.config.cookie.default.name];
            if (cookie && cookie.id)
                return next();
        });
        app_1.app.io.use(function (socket, next) {
            app_1.app.passport_modules.init(socket.request, socket.request.res, next);
        });
        app_1.app.io.use(function (socket, next) {
            app_1.app.passport_modules.session(socket.request, socket.request.res, next);
        });
        app_1.app.io.use(function (socket, next) {
            app_1.app.passport_modules.logout(socket.request, socket.request.res, next);
        });
        app_1.app.io.on('connection', function (socket) {
            console.log('Someone connected to root sio');
        });
    };
    MainIO.prototype.initModules = function () {
        this.modules = {
            admin: new admin_io_1.AdminIO(),
            client: new client_io_1.ClientIO(),
            pos: new pos_io_1.POSIO()
        };
        _.forEach(this.modules, function (m) {
            m.init();
        });
    };
    return MainIO;
})();
exports.MainIO = MainIO;
//# sourceMappingURL=socket-io.js.map