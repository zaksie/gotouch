import {logging, gapis, config, app, duid} from '../../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../../service/utils';
import PubSub = require('pubsub-js');
import {BLACK_LISTED_EMAIL_KEY} from '../../service/mailer';
import {User} from '../user';
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');

export const CLIENT_USER_KEY = 'ClientUser';
export const CLIENT_USER_ROUTE = '/diners'; //this is also the type

export class UserClient extends User {
    protected REGISTERED_USER_KEY() {
        return CLIENT_USER_KEY;
    }
    protected USER_ROUTE() {
        return CLIENT_USER_ROUTE;
    }
    isRegistrationAllowed(params, callback) {
        callback(null, true);
    }
    isSocialLoginAllowed(params, callback) {
        callback(null, true, null);
    }
    protected onNewRegisteredUser(proto, params, callback) {
        callback(null, proto);
    }
    on1stFactorSuccess(req, res, next) { next() };
    protected send2ndFactorVerification(params, callback: (err, code) => void) { throw new Error('Not implemented'); }
    protected verify2ndFactor(params, callback: (err, valid) => void) { throw new Error('Not implemented'); }
}


