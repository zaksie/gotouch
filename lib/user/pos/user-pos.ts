import {logging, gapis, config, app, duid} from '../../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../../service/utils';
import PubSub = require('pubsub-js');
import {BLACK_LISTED_EMAIL_KEY} from '../../service/mailer';
import {User} from '../user';
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');
export const STATUS_REGISTERED = 'registered';
export const POS_USER_KEY = 'POSUser';
export const POS_USER_ROUTE = '/chefs'; //this is also the type
export class UserPOS extends User {
    protected REGISTERED_USER_KEY() {
        return POS_USER_KEY;
    }
    protected USER_ROUTE() {
        return POS_USER_ROUTE;
    }
    isRegistrationAllowed(params, callback) {
        app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), callback);
    }
    isSocialLoginAllowed(params, callback) {
        app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), callback);
    }
    protected onNewRegisteredUser(proto, params, callback) {
        app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), (err, valid, object) => {
            if (err || !valid) return callback(err ? err : 'Invalid registration code');
            let existingRecord = {} as any;
            Util.toProtoEntity(existingRecord, object);
            existingRecord.status = STATUS_REGISTERED;
            proto.properties = _.assign(existingRecord, proto.properties); 
            callback();
        });
    }
    protected finalizeRegistration(params, callback) {
        if (params.code)
            return app.twilio.deleteCodeEntry(params.code, this.USER_ROUTE(), callback);
        callback();
    }
    on1stFactorSuccess(req, res, next) { next() };
    protected send2ndFactorVerification(params, callback: (err, code) => void) { throw new Error('Not implemented'); }
    protected verify2ndFactor(params, callback: (err, valid) => void) { throw new Error('Not implemented'); }
}


