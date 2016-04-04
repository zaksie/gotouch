var app_1 = require('../../../app');
var utils_1 = require('../../service/utils');
var user_generic_1 = require('./user-generic');
var order_1 = require('./order');
var async = require('async');
var _ = require('lodash');
exports.ORDER_ARTICLE_KEY = 'OrderArticle';
var OrderArticle = (function () {
    function OrderArticle() {
    }
    OrderArticle.prototype.add = function (cookie, business, article, callback) {
        var entities = [];
        entities.push(this.constructOrderArticle(cookie, business, article));
        app_1.gapis.datastore.upsert(entities, callback);
        app_1.app.order.updateTime(cookie, business, callback);
    };
    OrderArticle.prototype.remove = function (cookie, business, article, callback) {
        var keys = [];
        keys.push(this.constructKey(cookie, business, article));
        app_1.gapis.datastore.delete(keys, callback);
        app_1.app.order.updateTime(cookie, business, callback);
    };
    OrderArticle.prototype.fetchByCookieId = function (cookie, placeid, callback, tx) {
        var gqlQuery = "SELECT * FROM " + exports.ORDER_ARTICLE_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + user_generic_1.UNREGISTERED_USER_KEY + ", '" + cookie.id + "'," + order_1.OPEN_ORDER_KEY + ", '" + placeid + "')";
        app_1.gapis.datastore.runGQLQuery(gqlQuery, callback, tx);
    };
    OrderArticle.prototype.collectIdenticalArticles = function (articles) {
        var _this = this;
        var groups = _.groupBy(articles, function (article) {
            return _this.getCustomizationId(article);
        });
        return _.map(groups, function (group) {
            group[0].quantity = group.length;
            return group[0];
        });
    };
    OrderArticle.prototype.getCustomizationId = function (article) {
        return article.pid + _.sum(article.specials, function (special) {
            var arr = app_1.duid.hashidDecode(special);
            return _.sum(arr);
        });
    };
    OrderArticle.prototype.constructKey = function (cookie, business, article) {
        return {
            path: [{ kind: user_generic_1.UNREGISTERED_USER_KEY, name: cookie.id },
                { kind: order_1.OPEN_ORDER_KEY, name: business.placeid },
                { kind: exports.ORDER_ARTICLE_KEY, name: article.uuid }]
        };
    };
    OrderArticle.prototype.constructOrderArticle = function (cookie, business, article) {
        var specials = this.constructSpecialRequests(article);
        var key = this.constructKey(cookie, business, article);
        var properties = {
            specials: specials,
            time: { dateTimeValue: new Date().toISOString() },
            coupon: { stringValue: article.coupon },
            tableNo: { stringValue: article.tableNo },
            deliveryType: { stringValue: article.deliveryType },
            pid: { stringValue: article.pid }
        };
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    OrderArticle.prototype.constructSpecialRequests = function (article) {
        if (!article.specials)
            return undefined;
        var specials = [];
        _.forEach(article.specials, function (special) {
            specials.push({ stringValue: special.key + utils_1.KEY_VALUE_SEPARATOR + special.value });
        });
        return { listValue: specials };
    };
    return OrderArticle;
})();
exports.OrderArticle = OrderArticle;
//# sourceMappingURL=order-article.js.map