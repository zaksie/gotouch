import {logging, gapis, config, duid, app} from '../../app';
import {Util} from '../service/utils';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var twilio = require('twilio');

export const SMS_CODE_KEY = 'SMSCode';
export const DEFAULT_EXPIRY_IN_HOURS = 1;
export const SMS_CODE_STATUSES = {
    awaiting: 'awaiting',
    expired: 'expired'
} 
export class Twilio {
    client;
    constructor() {
        this.client = new twilio.RestClient(config.twilio.account_sid, config.twilio.auth_token);

        logging.info('Twilio configured');
        PubSub.publish('Twilio.ready', true);
    }

    private sendSMS(to, body, callback) {
        this.client.sms.messages.create({
            to: to,
            from: config.twilio.phone1,
            body: body
        }, callback);
    }
    createAndSend(params, final_callback) {
        async.series([
            (callback) => {
                this.upsertCodeEntry(params.code, params.kind, params, callback);
            },
            (callback) => {
                this.sendCode(params, callback);
            }], final_callback);
    }
    sendCode(params, callback) {
        if (!params.code || !params.kind || !params.subject) return callback('Invalid parameters in twilio.SendCode');
        this.fetchCodeEntity(params.code, params.kind, (err, result) => {
            if (result && result.batch.entityResults.length) {
                let entity = result.batch.entityResults[0].entity;
                let phone_number = entity.properties.phone_number.stringValue;
                let formatted_code = entity.properties.formatted_code.stringValue;
                // prolong freshness
                this.updateExpiry({}, entity.properties);
                gapis.datastore.upsert([entity], (err) => {
                    if (err) return callback(err);
                    params.subject = params.subject.replace('%', formatted_code);
                    this.sendSMS(phone_number, params.subject, callback);
                });
            }
            else
                callback(err || 'Entity not found [twilio.sendCode]');
        });
    }
    private fetchCodeEntity(code, kind, callback) {
        code = this.sanitizeSMSCode(code);
        if (!code) return callback();
        let gql = 'SELECT * FROM ' + SMS_CODE_KEY + ' WHERE code = "' + code + '" AND kind = "' + kind + '"';
        gapis.datastore.runGQLQuery(gql, callback);
    }
    fetchAllCodeEntries(kind, callback) {
        let gql = 'SELECT * FROM ' + SMS_CODE_KEY + ' WHERE kind = "' + kind + '"';
        gapis.datastore.runGQLQuery(gql, (err, results) => {
            if (results && results.batch.entityResults.length) {
                return callback(null, _.map(results.batch.entityResults, (r) => {
                    var properties = Util.fromProtoEntity(r.entity.properties);
                    properties.id = r.entity.key.path[0].id;
                    return properties;
                }));
            }
            callback(err);
        });
    }
    fetchCodeEntry(code, kind, callback) {
        code = this.sanitizeSMSCode(code);
        if (!code) return callback(412);
        if (!kind) return callback("Missing parameter 'kind' for fetchCodeEntry");
        this.fetchCodeEntity(code, kind, (err, result) => {
            let valid;
            if (result && result.batch.entityResults.length) {
                var properties = Util.fromProtoEntity(result.batch.entityResults[0].entity.properties);
                valid = (code == properties.code && !Util.isExpired(properties.expires));
            }
            callback(err, valid, properties);
        });
    }
    deleteCodeEntry(code, kind, callback) {
        this.fetchCodeEntity(code, kind, (err, result) => {
            if (result && result.batch.entityResults.length) {
                gapis.datastore.delete([result.batch.entityResults[0].entity.key], callback);
            }
            else
                callback();
        })
    }

    upsertCodeEntry(code, kind, params, callback) {
        let mid_callback = (err, id) => {
            if (err) return callback(err);
            callback(null, { code: code, id: id });
        }
        let entity = this.constructCodeEntity(code, kind, params);

        if (params.id)
            return gapis.datastore.upsert([entity], (err) => {
                mid_callback(err, params.id);
            });
        gapis.datastore.insertAutoId([entity], (err, result) => {
            if (result)
                result = result.mutationResult.insertAutoIdKeys[0].path[0].id;
            callback(err, result);
        });
    }

    private constructCodeEntity(code, kind, params) {
        code = this.sanitizeSMSCode(code);
        let key = {
            path: [{ kind: SMS_CODE_KEY }]
        };
        if (params.id)
            (key.path[0] as any).id = params.id;
        let time = (new Date()).toISOString();
        this.updateExpiry(params);
        let properties = {
            time: { dateTimeValue: time },
            code: { stringValue: code },
            kind: { stringValue: kind }
        };
        Util.toProtoEntity(properties, params);

        Util.filter(properties);
        return { key: key, properties: properties };
    }
    private sanitizeSMSCode(code) {
        let sanitized = code.replace(/(\s|-)+/g, '').toLowerCase();
        return sanitized;
    }
    private updateExpiry(params, proto_params?) {
        if (!params.expiry_options) params.expiry_options = {};
        let hours = params.expiry_options.hours || DEFAULT_EXPIRY_IN_HOURS;
        let destroy = params.expiry_options.destroy;

        if (destroy) //CleanSweeper destroys entities with _expires set to past date
        {
            params._expires = Util.generateExpires(hours);
            if (proto_params)
                proto_params._expires = { dateTimeValue: params._expires };
        }

        if (params.expires) return;
        params.expires = Util.generateExpires(hours);
        params.status = SMS_CODE_STATUSES.awaiting;

        if (!proto_params) return;
        proto_params.expires = { dateTimeValue: params.expires };
        proto_params.status = { stringValue: params.status };
    }
}
