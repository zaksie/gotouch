var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../app');
var user_pos_1 = require('../../lib/user/pos/user-pos');
var abstract_io_1 = require('./abstract-io');
var POSIO = (function (_super) {
    __extends(POSIO, _super);
    function POSIO() {
        _super.call(this);
        this.USER_ROUTE = user_pos_1.POS_USER_ROUTE;
        this.USER_MODULE = function () { return app_1.pos; };
    }
    POSIO.prototype.initSocket = function (socket) {
        var _this = this;
        this.handshake(socket, null);
        socket.on('disconnect', function () { app_1.pos.onDisconnect.bind(_this, socket); });
        socket.on('request-businesses', function (location) { _this.ensure(socket, 'emitBusinesses', _this.emitBusinesses.bind(_this), location); });
        socket.on('request-open-tabs', function () { _this.ensure(socket, 'emitOpenOrders', _this.emitOpenOrders.bind(_this)); });
        socket.on('link-me', function () { _this.ensure(socket, 'linkMe', _this.linkMe.bind(_this)); });
        socket.on('menu-page-save', function (page) { _this.ensure(socket, 'saveMenuPage', _this.saveMenuPage.bind(_this), page); });
    };
    POSIO.prototype.onNotAuthenticatedOnHandshake = function (socket) { };
    POSIO.prototype.onAuthenticatedOnHandshake = function (socket, session) {
        this.linkUser(socket, session);
    };
    POSIO.prototype.emitBusinesses = function (socket, location) {
        app_1.logging.info('in emitBusinesses');
        app_1.pos.getBusinessesForSocketId(socket.id, { location: location }, function (item) {
            socket.emit('receive-business', item);
        }, function (err) {
            socket.emit('receive-business-end');
            if (err)
                return app_1.logging.error(err);
        });
    };
    POSIO.prototype.emitOpenOrders = function (socket) {
        app_1.pos.getOpenOrdersForSocketId(socket.id, function (item) {
            socket.emit('receive-open-tab', item);
        }, function (err) {
            socket.emit('receive-open-tab-end');
            if (err)
                return app_1.logging.error(err);
        });
    };
    POSIO.prototype.linkMe = function (socket) {
        var _this = this;
        app_1.pos.handshake(socket, null, function (err, session) {
            if (!session.isLoggedIn)
                return;
            _this.linkUser(socket, session);
        });
    };
    POSIO.prototype.linkUser = function (socket, session) {
        var isLinkedAlready = app_1.pos.linkConnectionToPlaceIds(socket.id, session);
        if (!isLinkedAlready) {
            app_1.logging.info('User linked');
            socket.emit('user-linked');
        }
    };
    POSIO.prototype.emitData = function (socket, params) {
        app_1.logging.info('sending menu to pos...');
        socket.emit(params.message, params.content);
    };
    POSIO.prototype.saveMenuPage = function (socket, page) {
        app_1.app.menu.savePage(page, function (err) { if (err)
            app_1.logging.error(err); });
    };
    return POSIO;
})(abstract_io_1.SocketIOModule);
exports.POSIO = POSIO;
//# sourceMappingURL=pos-io.js.map