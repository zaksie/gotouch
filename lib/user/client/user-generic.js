var app_1 = require('../../../app');
var utils_1 = require('../../service/utils');
var async = require('async');
var _ = require('lodash');
exports.UNREGISTERED_USER_KEY = 'UnregisteredUser';
var GenericUser = (function () {
    function GenericUser() {
    }
    GenericUser.prototype.open = function (cookie, callback) {
        if (!cookie.id)
            return callback('Invalid cookie id');
        if (!app_1.gapis.datastore)
            return callback('Websockets you be quick as the Devil!');
        app_1.logging.info('in GenericUser.open with cookie id: ' + cookie.id);
        app_1.gapis.datastore.startTransaction(this.openUserAux.bind(this), function (err, result) {
            if (err)
                app_1.logging.error(err);
            else
                app_1.logging.info('upserted user: ' + result);
            callback(err, result);
        }, cookie);
    };
    GenericUser.prototype.openUserAux = function (main_callback, tx, cookie) {
        var _this = this;
        async.waterfall([
            function (callback) {
                _this.findUser(cookie, callback, tx);
            },
            function (result, detailedResults, callback) {
                var userExists = result.found.length > 0;
                if (!userExists) {
                    var entities = [];
                    entities.push(_this.constructUser(cookie));
                    return app_1.gapis.datastore.upsert(entities, callback, tx);
                }
                callback(null);
            },
            function (callback) {
                var entities = [];
                return app_1.gapis.datastore.insertAutoId(entities, callback, tx);
            }
        ], main_callback);
    };
    GenericUser.prototype.constructKey = function (cookie) {
        return {
            path: [{ kind: exports.UNREGISTERED_USER_KEY, name: cookie.id }]
        };
    };
    GenericUser.prototype.findUser = function (cookie, callback, tx) {
        var keys = [this.constructKey(cookie)];
        app_1.gapis.datastore.lookup(keys, callback, tx);
    };
    GenericUser.prototype.constructUser = function (cookie) {
        var key = this.constructKey(cookie);
        var time = new Date().toISOString();
        var properties = {
            // TODO: removed for now
            //location_lat: { doubleValue: data.location.lat },
            //location_lon: { doubleValue: data.location.lon },
            location_time: { dateTimeValue: time }
        };
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    return GenericUser;
})();
exports.GenericUser = GenericUser;
//# sourceMappingURL=user-generic.js.map