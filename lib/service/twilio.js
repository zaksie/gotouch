var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var twilio = require('twilio');
exports.SMS_CODE_KEY = 'SMSCode';
exports.DEFAULT_EXPIRY_IN_HOURS = 1;
exports.SMS_CODE_STATUSES = {
    awaiting: 'awaiting',
    expired: 'expired'
};
var Twilio = (function () {
    function Twilio() {
        this.client = new twilio.RestClient(app_1.config.twilio.account_sid, app_1.config.twilio.auth_token);
        app_1.logging.info('Twilio configured');
        PubSub.publish('Twilio.ready', true);
    }
    Twilio.prototype.sendSMS = function (to, body, callback) {
        this.client.sms.messages.create({
            to: to,
            from: app_1.config.twilio.phone1,
            body: body
        }, callback);
    };
    Twilio.prototype.createAndSend = function (params, final_callback) {
        var _this = this;
        async.series([
            function (callback) {
                _this.upsertCodeEntry(params.code, params.kind, params, callback);
            },
            function (callback) {
                _this.sendCode(params, callback);
            }], final_callback);
    };
    Twilio.prototype.sendCode = function (params, callback) {
        var _this = this;
        if (!params.code || !params.kind || !params.subject)
            return callback('Invalid parameters in twilio.SendCode');
        this.fetchCodeEntity(params.code, params.kind, function (err, result) {
            if (result && result.batch.entityResults.length) {
                var entity = result.batch.entityResults[0].entity;
                var phone_number = entity.properties.phone_number.stringValue;
                var formatted_code = entity.properties.formatted_code.stringValue;
                // prolong freshness
                _this.updateExpiry({}, entity.properties);
                app_1.gapis.datastore.upsert([entity], function (err) {
                    if (err)
                        return callback(err);
                    params.subject = params.subject.replace('%', formatted_code);
                    _this.sendSMS(phone_number, params.subject, callback);
                });
            }
            else
                callback(err || 'Entity not found [twilio.sendCode]');
        });
    };
    Twilio.prototype.fetchCodeEntity = function (code, kind, callback) {
        code = this.sanitizeSMSCode(code);
        if (!code)
            return callback();
        var gql = 'SELECT * FROM ' + exports.SMS_CODE_KEY + ' WHERE code = "' + code + '" AND kind = "' + kind + '"';
        app_1.gapis.datastore.runGQLQuery(gql, callback);
    };
    Twilio.prototype.fetchAllCodeEntries = function (kind, callback) {
        var gql = 'SELECT * FROM ' + exports.SMS_CODE_KEY + ' WHERE kind = "' + kind + '"';
        app_1.gapis.datastore.runGQLQuery(gql, function (err, results) {
            if (results && results.batch.entityResults.length) {
                return callback(null, _.map(results.batch.entityResults, function (r) {
                    var properties = utils_1.Util.fromProtoEntity(r.entity.properties);
                    properties.id = r.entity.key.path[0].id;
                    return properties;
                }));
            }
            callback(err);
        });
    };
    Twilio.prototype.fetchCodeEntry = function (code, kind, callback) {
        code = this.sanitizeSMSCode(code);
        if (!code)
            return callback(412);
        if (!kind)
            return callback("Missing parameter 'kind' for fetchCodeEntry");
        this.fetchCodeEntity(code, kind, function (err, result) {
            var valid;
            if (result && result.batch.entityResults.length) {
                var properties = utils_1.Util.fromProtoEntity(result.batch.entityResults[0].entity.properties);
                valid = (code == properties.code && !utils_1.Util.isExpired(properties.expires));
            }
            callback(err, valid, properties);
        });
    };
    Twilio.prototype.deleteCodeEntry = function (code, kind, callback) {
        this.fetchCodeEntity(code, kind, function (err, result) {
            if (result && result.batch.entityResults.length) {
                app_1.gapis.datastore.delete([result.batch.entityResults[0].entity.key], callback);
            }
            else
                callback();
        });
    };
    Twilio.prototype.upsertCodeEntry = function (code, kind, params, callback) {
        var mid_callback = function (err, id) {
            if (err)
                return callback(err);
            callback(null, { code: code, id: id });
        };
        var entity = this.constructCodeEntity(code, kind, params);
        if (params.id)
            return app_1.gapis.datastore.upsert([entity], function (err) {
                mid_callback(err, params.id);
            });
        app_1.gapis.datastore.insertAutoId([entity], function (err, result) {
            if (result)
                result = result.mutationResult.insertAutoIdKeys[0].path[0].id;
            callback(err, result);
        });
    };
    Twilio.prototype.constructCodeEntity = function (code, kind, params) {
        code = this.sanitizeSMSCode(code);
        var key = {
            path: [{ kind: exports.SMS_CODE_KEY }]
        };
        if (params.id)
            key.path[0].id = params.id;
        var time = (new Date()).toISOString();
        this.updateExpiry(params);
        var properties = {
            time: { dateTimeValue: time },
            code: { stringValue: code },
            kind: { stringValue: kind }
        };
        utils_1.Util.toProtoEntity(properties, params);
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    Twilio.prototype.sanitizeSMSCode = function (code) {
        var sanitized = code.replace(/(\s|-)+/g, '').toLowerCase();
        return sanitized;
    };
    Twilio.prototype.updateExpiry = function (params, proto_params) {
        if (!params.expiry_options)
            params.expiry_options = {};
        var hours = params.expiry_options.hours || exports.DEFAULT_EXPIRY_IN_HOURS;
        var destroy = params.expiry_options.destroy;
        if (destroy) {
            params._expires = utils_1.Util.generateExpires(hours);
            if (proto_params)
                proto_params._expires = { dateTimeValue: params._expires };
        }
        if (params.expires)
            return;
        params.expires = utils_1.Util.generateExpires(hours);
        params.status = exports.SMS_CODE_STATUSES.awaiting;
        if (!proto_params)
            return;
        proto_params.expires = { dateTimeValue: params.expires };
        proto_params.status = { stringValue: params.status };
    };
    return Twilio;
})();
exports.Twilio = Twilio;
//# sourceMappingURL=twilio.js.map