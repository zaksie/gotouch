var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../app');
var user_client_1 = require('../../lib/user/client/user-client');
var abstract_io_1 = require('./abstract-io');
var ClientIO = (function (_super) {
    __extends(ClientIO, _super);
    function ClientIO() {
        _super.call(this);
        //userModule() { return client }; // unfortunately this cannot be done yet in TS
        this.USER_ROUTE = user_client_1.CLIENT_USER_ROUTE;
        this.USER_MODULE = function () { return app_1.client; };
    }
    ClientIO.prototype.initSocket = function (socket) {
        this.handshake(socket, null);
        socket.on('request-businesses', this.onRequestBusinesses.bind(this, socket));
        socket.on('tab-add-article', function (data) {
            app_1.client.addArticleToOrder(socket, data.business, data.article);
        });
        socket.on('tab-remove-article', function (data) {
            app_1.client.removeArticleFromOrder(socket, data.business, data.article);
        });
        socket.on('order-open-create', function (data) {
            app_1.client.openOrCreateOrderByBusiness(socket, data, orderOpened);
        });
        socket.on('order-request', function () {
            app_1.client.openRecentOrder(socket, orderOpened);
        });
        socket.on('order-update', function (data) {
            app_1.client.updateOrder(socket, data);
        });
        function orderOpened(data) {
            socket.emit('order-receive', data);
        }
    };
    ClientIO.prototype.onRequestBusinesses = function (socket, params) {
        var _this = this;
        if (params.placeid) {
            app_1.logging.info('Client requesting single complete business...');
            return this.emitBusiness(socket, params);
        }
        app_1.logging.info('Client requesting nearby businesses...');
        app_1.client.getPlaces(socket, params, function (item) {
            socket.emit('receive-business', item);
        }, function (err) {
            if (_this.logError(err))
                socket.emit('receive-business-error');
            else
                socket.emit('receive-business-end');
        });
    };
    ClientIO.prototype.emitBusiness = function (socket, params) {
        var _this = this;
        app_1.client.getBusiness(socket, params, function (err, result) {
            if (!_this.logError(err))
                socket.emit('receive-business', result);
        });
    };
    return ClientIO;
})(abstract_io_1.SocketIOModule);
exports.ClientIO = ClientIO;
//# sourceMappingURL=client-io.js.map