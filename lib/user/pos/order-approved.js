var app_1 = require('../../../app');
var utils_1 = require('../../service/utils');
var business_1 = require('../../business/business');
var async = require('async');
var _ = require('lodash');
var APPROVED_ORDER_KEY = 'ApprovedOrder';
var APPROVED_ORDER_ACK_KEY = 'ApprovedOrderAck';
var ApprovedOrder = (function () {
    function ApprovedOrder() {
    }
    ApprovedOrder.prototype.fetchFor = function (placeids, yield_callback, final_callback) {
        var _this = this;
        var q = async.queue(function (placeid, callback) {
            _this.fetchForAux(placeid, yield_callback, callback);
        });
        q.drain = function () {
            final_callback();
        };
        placeids.forEach(function (placeid) {
            q.push(placeid, function (err, tab) {
                if (err)
                    return app_1.logging.error(err);
            });
        });
    };
    ApprovedOrder.prototype.fetchForAux = function (placeid, yield_callback, callback) {
        var gql = 'SELECT * FROM ' + APPROVED_ORDER_KEY + ' WHERE __key__ HAS ANCESTOR Key(' + business_1.BUSINESS_KEY + ',"' + placeid + '")';
        app_1.gapis.datastore.runGQLQuery(gql, function (err, results) {
            if (err)
                return callback(err);
            if (!results.batch.entityResults.length)
                return callback('No entries found');
            _.forEach(results.batch.entityResults, function (r) {
                var item = utils_1.Util.fromProtoEntity(r.entity.properties);
                var tab = JSON.parse(item.tab);
                tab.id = r.entity.key.path[1].id;
                tab.hash = item.hash;
                yield_callback(tab);
            });
            callback();
        });
    };
    ApprovedOrder.prototype.storeApprovedOrderInDS = function (tab, callback) {
        var entity = this.constructApprovedOrderEntity(tab);
        app_1.gapis.datastore.insertAutoId([entity], function (err, result) {
            if (result) {
                tab.id = result.mutationResult.insertAutoIdKeys[0].path[1].id;
                tab.hash = entity.properties.hash.stringValue;
            }
            callback(err, tab);
        });
    };
    ApprovedOrder.prototype.storeApprovedOrderAck = function (tab, data, callback) {
        var key = this.constructApprovedOrderAckKey(tab.placeid, tab.id, data.socketid);
        var properties = {};
        utils_1.Util.toProtoEntity(properties, { time: (new Date()).toISOString() });
        app_1.gapis.datastore.upsert([{ key: key, properties: properties }], callback);
    };
    ApprovedOrder.prototype.constructApprovedOrderAckKey = function (placeid, tabid, socketid) {
        return {
            path: [{ kind: business_1.BUSINESS_KEY, name: placeid },
                { kind: APPROVED_ORDER_KEY, id: tabid },
                { kind: APPROVED_ORDER_ACK_KEY, name: socketid }]
        };
    };
    ApprovedOrder.prototype.constructApprovedOrderEntity = function (tab) {
        var key = {
            path: [{ kind: business_1.BUSINESS_KEY, name: tab.placeid },
                { kind: APPROVED_ORDER_KEY }]
        };
        var time = new Date().toISOString();
        var properties;
        var tabstring = JSON.stringify(tab);
        properties = {
            tab: { stringValue: tabstring, indexed: false },
            hash: { stringValue: utils_1.Util.hash(tabstring) },
            time: { dateTimeValue: time },
        };
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    return ApprovedOrder;
})();
exports.ApprovedOrder = ApprovedOrder;
//# sourceMappingURL=order-approved.js.map