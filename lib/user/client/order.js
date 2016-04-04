var app_1 = require('../../../app');
var utils_1 = require('../../service/utils');
var user_generic_1 = require('./user-generic');
var async = require('async');
var _ = require('lodash');
exports.OPEN_ORDER_KEY = 'OpenOrder';
var Order = (function () {
    function Order() {
    }
    Order.prototype.openOrCreateByBusiness = function (cookie, business, tab, callback, createIfNotFound) {
        var method = this.openOrCreateByBusinessAux.bind(this);
        app_1.gapis.datastore.startTransaction(method, callback, cookie, business, tab, createIfNotFound);
    };
    Order.prototype.openRecent = function (cookie, callback) {
        var method = this.openRecentOrderAux.bind(this);
        app_1.gapis.datastore.startTransaction(method, callback, cookie);
    };
    Order.prototype.create = function (cookie, business, tab, callback) {
        var mid_callback = function (err, results) {
            callback(err);
        };
        var method = this.createAux.bind(this);
        app_1.gapis.datastore.startTransaction(method, mid_callback, cookie, business, tab);
    };
    Order.prototype.update = function (cookie, business, tab, callback) {
        var _this = this;
        var mid_callback = function (err, result) {
            if (err || !result)
                return callback(err);
            _this.updateTabEntries(result, cookie, business, tab);
            app_1.gapis.datastore.upsert(result, callback);
        };
        var method = this.findOpenOrder.bind(this);
        app_1.gapis.datastore.startTransaction(method, mid_callback, cookie, business);
    };
    Order.prototype.updateTime = function (cookie, business, callback) {
        this.update(cookie, business, null, callback);
    };
    Order.prototype.remove = function (cookie, business, callback) {
        var keys = [this.constructKey(cookie, business)];
        app_1.gapis.datastore.delete(keys, callback);
    };
    Order.prototype.updateTabEntries = function (result, cookie, business, tab) {
        var newTab = this.constructOrder(cookie, business, tab);
        delete newTab.properties.mockSerialNumber;
        utils_1.Util.merge(result.properties, newTab, true);
    };
    Order.prototype.createAux = function (callback, tx, cookie, business, tab) {
        var entities = [];
        entities.push(this.constructOrder(cookie, business, tab));
        app_1.gapis.datastore.upsert(entities, callback, tx);
    };
    Order.prototype.openOrCreateByBusinessAux = function (final_callback, tx, cookie, business, tab, createIfNotFound) {
        var _this = this;
        var data = new Object;
        async.waterfall([
            function (callback) {
                _this.findOpenOrder(callback, tx, cookie, business);
            },
            function (result, callback) {
                if (!result && createIfNotFound)
                    return _this.createAux(function (err) {
                        callback(err || 'no order found. created new.');
                    }, tx, cookie, business, tab);
                data.placeid = result.key.path[1].name;
                data.tab = utils_1.Util.fromProtoEntity(result.properties);
                data.business = business;
                app_1.app.orderArticle.fetchByCookieId(cookie, data.placeid, callback, tx);
            },
            function (result, queryinfo, callback) {
                _this.fetchAllOrderArticles(result, data, callback);
            },
            function (results, callback) {
                _this.populateArticlesOrRemoveIfEmpty(cookie, results, data, callback);
            }
        ], final_callback);
    };
    Order.prototype.openRecentOrderAux = function (final_callback, tx, cookie) {
        var _this = this;
        var callback = function (err, orders) {
            if (err)
                return final_callback(err);
            if (!orders || !orders.length)
                return final_callback();
            _this.openRecentOrderAux2(final_callback, tx, cookie, orders);
        };
        this.findRecentOpenOrder(cookie, callback, tx);
    };
    Order.prototype.openRecentOrderAux2 = function (final_callback, tx, cookie, orders) {
        var _this = this;
        var data = new Object;
        async.waterfall([
            function (callback) {
                var result = _.last(orders);
                result = result.entity;
                data.placeid = result.key.path[1].name;
                data.tab = utils_1.Util.fromProtoEntity(result.properties);
                app_1.app.business.find(data.placeid, {}, callback, tx);
            },
            function (business, callback) {
                data.business = business;
                app_1.app.orderArticle.fetchByCookieId(cookie, data.placeid, callback, tx);
            },
            function (result, queryinfo, callback) {
                _this.fetchAllOrderArticles(result, data, callback);
            },
            function (results, callback) {
                _this.populateArticlesOrRemoveIfEmpty(cookie, results, data, function (err, result) {
                    if (!err && !result)
                        _this.openRecentOrderAux2(callback, tx, cookie, orders);
                    else
                        callback(err, result);
                });
            }
        ], final_callback);
    };
    Order.prototype.populateArticlesOrRemoveIfEmpty = function (cookie, results, data, callback) {
        if (Object.keys(results).length > 0)
            return this.populateOrderArticleDetails(results, data, callback);
        else
            this.remove(cookie, data.business, function (err) { callback(err); });
    };
    Order.prototype.fetchAllOrderArticles = function (result, data, callback) {
        if (result.batch.entityResults.length) {
            var pids = [];
            data.tab.articles = _.map(result.batch.entityResults, function (result) {
                pids.push(result.entity.properties.pid.stringValue);
                var article = utils_1.Util.fromProtoEntity(result.entity.properties);
                article.uuid = result.entity.key.path[2].name;
                return article;
            });
            return app_1.app.article.fetchMultipleArticles(data.placeid, pids, callback);
        }
        callback(null, []);
    };
    Order.prototype.populateOrderArticleDetails = function (results, data, callback) {
        data.tab.articles = _.map(data.tab.articles, function (article) {
            var r = results[article.pid];
            utils_1.Util.merge(article, r, false);
            return article;
        });
        callback(null, data);
    };
    Order.prototype.findRecentOpenOrder = function (cookie, callback, tx) {
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            if (!result.batch.entityResults.length)
                return callback(null);
            var sorted = _.sortBy(result.batch.entityResults, function (r) {
                return r.entity.properties.time.dateTimeValue;
            });
            callback(null, sorted);
        };
        var gqlQuery = "SELECT * FROM " + exports.OPEN_ORDER_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + user_generic_1.UNREGISTERED_USER_KEY + ", '" + cookie.id + "')";
        app_1.gapis.datastore.runGQLQuery(gqlQuery, mid_callback, tx);
    };
    Order.prototype.findOpenOrder = function (callback, tx, cookie, business) {
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            if (result.found.length)
                result = result.found[0].entity;
            else
                result = undefined;
            callback(null, result);
        };
        var keys = [{
                path: [{ kind: user_generic_1.UNREGISTERED_USER_KEY, name: cookie.id },
                    { kind: exports.OPEN_ORDER_KEY, name: business.placeid }]
            }];
        app_1.gapis.datastore.lookup(keys, mid_callback, tx);
    };
    Order.prototype.constructKey = function (cookie, business) {
        return {
            path: [{ kind: user_generic_1.UNREGISTERED_USER_KEY, name: cookie.id },
                { kind: exports.OPEN_ORDER_KEY, name: business.placeid }]
        };
    };
    Order.prototype.constructOrder = function (cookie, business, tab) {
        var key = this.constructKey(cookie, business);
        var time = new Date().toISOString();
        tab = tab || {};
        var properties = {
            time: { dateTimeValue: time },
            tableNo: { stringValue: tab.tableNo },
            clientid: { stringValue: cookie.id },
            mockSerialNumber: { stringValue: tab.mockSerialNumber },
            server: { stringValue: tab.server },
            dinersCount: { integerValue: tab.dinersCount }
        };
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    return Order;
})();
exports.Order = Order;
//# sourceMappingURL=order.js.map