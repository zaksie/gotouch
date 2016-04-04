import {logging, gapis, config, app, duid} from '../../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../../service/utils';
import PubSub = require('pubsub-js');
import {BLACK_LISTED_EMAIL_KEY} from '../../service/mailer';
import {POS_USER_ROUTE} from '../pos/user-pos';
import {User} from '../user';
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');

export const ADMIN_USER_KEY = 'AdminUser';
export const ADMIN_USER_ROUTE = '/admins'; //this is also the type
export class UserAdmin extends User {
    protected REGISTERED_USER_KEY() {
        return ADMIN_USER_KEY;
    }
    protected USER_ROUTE() {
        return ADMIN_USER_ROUTE;
    }
    isRegistrationAllowed(params, callback) {
        callback(null, false);
    }
    isSocialLoginAllowed(params, callback) {
        callback(null, false);
    }
    send2ndFactorVerification(params, callback) {
        params.formatted_code = params.code = Util.generateRandomNumber('xxx - xxx');
        params.subject = 'yummlet admin code: %';
        params.kind = this.USER_ROUTE();
        params.expiry_options = { hours: 1, destroy: true };
        app.twilio.createAndSend(params, callback);
    }
    verify2ndFactor(params, callback: (err, valid) => void) {
        app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), (err, valid, stored_object) => {
            if (!err && valid)
                return callback(null, stored_object.id == params.id);
            callback(err, false);
        });
    }

    protected onNewRegisteredUser(proto, params, callback) {
        throw new Error('Registration is not allowed for users of type Admin');
    }

}


