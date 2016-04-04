var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../../app');
var endpoint_1 = require('../endpoint');
var user_client_1 = require('./user-client');
var _ = require('lodash');
var async = require('async');
var Client = (function (_super) {
    __extends(Client, _super);
    function Client() {
        _super.apply(this, arguments);
    }
    // @Implements
    Client.prototype.ROUTE = function () {
        return user_client_1.CLIENT_USER_ROUTE;
    };
    Client.prototype.handshake = function (socket, data, callback) {
        var _this = this;
        _super.prototype.handshake.call(this, socket, data, function (err, params) {
            if (params.user)
                app_1.app.user.ofType(user_client_1.CLIENT_USER_ROUTE).open(params.cookie, data, function (err, result) {
                    _this.logError(err);
                });
            callback(err, params);
        });
    };
    //////// GEOLOCATION //////////////////
    Client.prototype.getPlaces = function (socket, search, yield_callback, err_callback) {
        app_1.app.geolocation.searchNearBy(search, yield_callback, err_callback);
    };
    //////// BUSINESS //////////////
    Client.prototype.getBusiness = function (socket, params, callback) {
        app_1.app.business.find(params.placeid, params, callback);
    };
    //////// MENU //////////////////
    Client.prototype.getMenus = function (socket, business, yield_callback, end_callback) {
        app_1.app.menu.fetchFor(business.placeid, yield_callback, end_callback);
    };
    //////// ARTICLE //////////////////
    Client.prototype.getArticle = function (socket, business, bare_article, callback) {
        app_1.app.article.fetchArticle(business.placeid, bare_article.pid, callback);
    };
    //////// ORDER //////////////////
    Client.prototype.openOrCreateOrderByBusiness = function (socket, data, callback) {
        var _this = this;
        var cookie = this.getCookie(socket);
        if (!cookie)
            return;
        var business = data.business;
        var tab = data.tab;
        var createIfNotFound = true;
        app_1.app.order.openOrCreateByBusiness(cookie, business, tab, function (err, result) {
            if (!_this.logError(err) && result)
                callback(result);
        }, createIfNotFound);
    };
    Client.prototype.openRecentOrder = function (socket, callback) {
        var _this = this;
        var cookie = this.getCookie(socket);
        if (!cookie)
            return;
        app_1.app.order.openRecent(cookie, function (err, result) {
            if (!_this.logError(err) && result)
                callback(result);
        });
    };
    Client.prototype.updateOrder = function (socket, data) {
        var _this = this;
        var cookie = this.getCookie(socket);
        if (!cookie)
            return;
        var business = data.business;
        var tab = data.tab;
        app_1.app.order.update(cookie, business, tab, function (err) {
            _this.logError(err);
        });
    };
    //////// ORDER ARTICLE //////////////////
    Client.prototype.addArticleToOrder = function (socket, business, article) {
        var _this = this;
        var cookie = this.getCookie(socket);
        if (!cookie)
            return;
        app_1.app.orderArticle.add(cookie, business, article, function (err, result) {
            _this.logError(err);
        });
    };
    Client.prototype.removeArticleFromOrder = function (socket, business, article) {
        var _this = this;
        var cookie = this.getCookie(socket);
        if (!cookie)
            return;
        app_1.app.orderArticle.remove(cookie, business, article, function (err) {
            _this.logError(err);
        });
    };
    ///////////// MEDIA ///////////////
    Client.prototype.canDeleteMedia = function (req, photo) {
        return this.canUpdateMedia(req, [photo]);
    };
    Client.prototype.canUpdateMedia = function (req, photos) {
        var _this = this;
        // works according to REJECT_APPROVE_ALL policy
        return _.findIndex(photos, function (photo) { req.user[_this.ROUTE()].username != photo.username; }) < 0;
    };
    return Client;
})(endpoint_1.Endpoint);
exports.Client = Client;
//# sourceMappingURL=client.js.map