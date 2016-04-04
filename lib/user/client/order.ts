import {logging, gapis, config, client, duid, app} from '../../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../../service/utils';
import {UNREGISTERED_USER_KEY} from './user-generic';
import {BUSINESS_KEY} from '../../business/business';

var async = require('async');
var _ = require('lodash');

export const OPEN_ORDER_KEY = 'OpenOrder';
export class Order {

    openOrCreateByBusiness(cookie, business, tab, callback, createIfNotFound: boolean) {
        var method = this.openOrCreateByBusinessAux.bind(this);
        gapis.datastore.startTransaction(method, callback, cookie, business, tab, createIfNotFound);
    }
    openRecent(cookie, callback) {
        var method = this.openRecentOrderAux.bind(this);
        gapis.datastore.startTransaction(method, callback, cookie);
    }
    create(cookie, business, tab, callback) {
        var mid_callback = (err, results) => {
            callback(err);
        };
        var method = this.createAux.bind(this);
        gapis.datastore.startTransaction(method, mid_callback, cookie, business, tab);
    }

    update(cookie, business, tab, callback) {
        var mid_callback = (err, result) => {
            if (err || !result) return callback(err);
            this.updateTabEntries(result, cookie, business, tab);
            gapis.datastore.upsert(result, callback)
        };
        var method = this.findOpenOrder.bind(this);
        gapis.datastore.startTransaction(method, mid_callback, cookie, business);
    }

    updateTime(cookie, business, callback) {
        this.update(cookie, business, null, callback);
    }
    remove(cookie, business, callback) {
        let keys = [this.constructKey(cookie, business)];
        gapis.datastore.delete(keys, callback);
    }
    private updateTabEntries(result, cookie, business, tab) {
        var newTab = this.constructOrder(cookie, business, tab);
        delete newTab.properties.mockSerialNumber;
        Util.merge(result.properties, newTab, true);
    }

    private createAux(callback, tx, cookie, business, tab) {
        var entities = [];
        entities.push(this.constructOrder(cookie, business, tab));
        gapis.datastore.upsert(entities, callback, tx);
    }
    private openOrCreateByBusinessAux(final_callback, tx, cookie, business, tab, createIfNotFound: boolean) {
        var data = new Object as any;
        async.waterfall([
            (callback) => {
                this.findOpenOrder(callback, tx, cookie, business);
            },
            (result, callback) => {
                if (!result && createIfNotFound)
                    return this.createAux((err) => {
                        callback(err || 'no order found. created new.');
                    }, tx, cookie, business, tab);
                data.placeid = result.key.path[1].name;
                data.tab = Util.fromProtoEntity(result.properties);
                data.business = business;
                app.orderArticle.fetchByCookieId(cookie, data.placeid, callback, tx);
            },
            (result, queryinfo, callback) => {
                this.fetchAllOrderArticles(result, data, callback);
            },
            (results, callback) => {
                this.populateArticlesOrRemoveIfEmpty(cookie, results, data, callback);
            }
        ], final_callback);
    }

    private openRecentOrderAux(final_callback, tx, cookie) {
        var callback = (err, orders) => {
            if (err) return final_callback(err);
            if (!orders || !orders.length) return final_callback();

            this.openRecentOrderAux2(final_callback, tx, cookie, orders);
        };

        this.findRecentOpenOrder(cookie, callback, tx);

    }

    private openRecentOrderAux2(final_callback, tx, cookie, orders) {
        var data = new Object as any;
        async.waterfall([
            (callback) => {
                let result = _.last(orders);
                result = result.entity;
                data.placeid = result.key.path[1].name;
                data.tab = Util.fromProtoEntity(result.properties);
                app.business.find(data.placeid, {}, callback, tx);
            },
            (business, callback) => {
                data.business = business;
                app.orderArticle.fetchByCookieId(cookie, data.placeid, callback, tx);
            },
            (result, queryinfo, callback) => {
                this.fetchAllOrderArticles(result, data, callback);
            },
            (results, callback) => {
                this.populateArticlesOrRemoveIfEmpty(cookie, results, data, (err, result) => {
                    if (!err && !result)
                        this.openRecentOrderAux2(callback, tx, cookie, orders);
                    else
                        callback(err, result);
                });
            }
        ], final_callback);
    }

    private populateArticlesOrRemoveIfEmpty(cookie, results, data, callback) {
        if (Object.keys(results).length > 0)
            return this.populateOrderArticleDetails(results, data, callback);
        else
            this.remove(cookie, data.business, (err) => { callback(err); });
    }

    private fetchAllOrderArticles(result, data, callback) {
        if (result.batch.entityResults.length) {
            let pids = [];
            data.tab.articles = _.map(result.batch.entityResults, (result) => {
                pids.push(result.entity.properties.pid.stringValue);
                let article = Util.fromProtoEntity(result.entity.properties);
                article.uuid = result.entity.key.path[2].name;
                return article;
            });
            return app.article.fetchMultipleArticles(data.placeid, pids, callback);
        }

        callback(null, []);
    }
    private populateOrderArticleDetails(results, data, callback) {
        data.tab.articles = _.map(data.tab.articles, (article) => {
            var r = results[article.pid];
            Util.merge(article, r, false);
            return article;
        });
        callback(null, data);
    }
    private findRecentOpenOrder(cookie, callback, tx) {
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            if (!result.batch.entityResults.length) return callback(null);

            var sorted = _.sortBy(result.batch.entityResults, (r) => {
                return r.entity.properties.time.dateTimeValue;
            });
            callback(null, sorted);
        };
        var gqlQuery = "SELECT * FROM " + OPEN_ORDER_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + UNREGISTERED_USER_KEY + ", '" + cookie.id + "')";
        gapis.datastore.runGQLQuery(gqlQuery, mid_callback, tx);
    }

    private findOpenOrder(callback, tx, cookie, business) {
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            if (result.found.length)
                result = result.found[0].entity;
            else
                result = undefined;
            callback(null, result);
        };
        var keys = [{
            path: [{ kind: UNREGISTERED_USER_KEY, name: cookie.id },
                { kind: OPEN_ORDER_KEY, name: business.placeid }]
        }];
        gapis.datastore.lookup(keys, mid_callback, tx);
    }

    private constructKey(cookie, business) {
        return {
            path: [{ kind: UNREGISTERED_USER_KEY, name: cookie.id },
                { kind: OPEN_ORDER_KEY, name: business.placeid }]
        };
    }

    private constructOrder(cookie, business, tab) {
        var key = this.constructKey(cookie, business);
        var time = new Date().toISOString();
        tab = tab || {};

        var properties = {
            time: { dateTimeValue: time},
            tableNo: { stringValue: tab.tableNo },
            clientid: { stringValue: cookie.id },
            mockSerialNumber: { stringValue: tab.mockSerialNumber },
            server: { stringValue: tab.server },
            dinersCount: { integerValue: tab.dinersCount }
        };

        Util.filter(properties);

        return { key: key, properties: properties };
    }

}
