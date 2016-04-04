import {logging, gapis, config, client, duid, app} from '../../app';
import {Util} from '../service/utils';
import PubSub = require('pubsub-js');

let async = require('async');
let _ = require('lodash');
const CAPTCHA = ['www.google.com', '/recaptcha/api/siteverify'];
const SITE_KEY = '6LccpRATAAAAALgLw7C6sFyMjA-3ckACE7ggOEf4';
const SECRET = '6LccpRATAAAAAEsLmR7vY1OD4kTJ3SPfSLRasiTP';
export const CAPTCHA_KEY = 'VerifiedCaptcha';
export const CAPTCHA_TRY_KEY = 'CaptchaTry';
const MAX_TRIES_BEFORE_ACTIVATING_CAPTCHA = 10;
export class Captcha {
    verify(req, res, next) {
        let ip = Util.getIP(req);
        Util.postHttps(CAPTCHA[0], CAPTCHA[1], { secret: SECRET, response: req.body.captcha, remoteip: ip }, (result) => {
            result = JSON.parse(result);
            if (result.success) {
                this.insertIntoDatastore(req.body.captcha, ip);
                return next();
            }

            this.checkDatastore(req.body.captcha, ip, (err, ok) => {
                if (err) {
                    logging.error(err);
                    ok = false;
                }

                if (ok)
                    return next();
                if (req.captcha_code)
                    return res.sendStatus(req.captcha_code);

                res.status(406).send('Invalid captcha');
            });
        });
    }

    verifyAfterNTries(req, res, next) {
        let ip = Util.getIP(req);

        var mid_callback = (err, result) => {
            if (err) {
                res.sendStatus(err.code);
                return logging.error(err);
            }
            let count = 0;
            if (result.found.length)
                count = result.found[0].entity.properties.count.integerValue;
            if (count < MAX_TRIES_BEFORE_ACTIVATING_CAPTCHA)
                gapis.datastore.upsert([this.constructCaptchaTryEntity(ip, ++count)], (err) => { if (err) logging.error(err); });
            else {
                req.captcha_code = 429
                return this.verify(req, res, next);
            }

            next();
        };
        var key = this.constructCaptchaTryKey(ip);
        gapis.datastore.lookup([key], mid_callback, null);
    }
    clearTryHistory(req) {
        var key = this.constructCaptchaTryKey(Util.getIP(req));
        gapis.datastore.delete([key], (err) => { if (err) logging.error(err); });
    }
    private insertIntoDatastore(captcha, ip) {
        let entities = [];
        entities.push(this.constructCaptchaEntity(captcha, ip));
        gapis.datastore.upsert(entities, (err) => { if (err) logging.error(err); });
    }

    //Used to check for codes that have been verified already and cannot be verified again.
    //I don't know tho why i have to reverify anyone...
    private checkDatastore(captcha, ip, callback) {
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            if (!result.found.length) return callback(null, false);

            callback(null, result.found[0].entity.properties.ip.stringValue == ip);
        };
        var key = this.constructCaptchaKey(captcha);
        gapis.datastore.lookup([key], mid_callback, null);
    }

    private constructCaptchaKey(captcha) {
        return {
            path: [{ kind: CAPTCHA_KEY, name: captcha }]
        };
    }

    private constructCaptchaEntity(captcha, ip) {
        let key = this.constructCaptchaKey(captcha);
        let time = (new Date()).toISOString();
        let expires = Util.generateExpires(1);
        let properties = {
            time: { dateTimeValue: time },
            _expires: { dateTimeValue: expires }, // the underscore is for clean-sweeper
            ip: { stringValue: ip }
        };

        Util.filter(properties);

        return { key: key, properties: properties };
    }
    private constructCaptchaTryKey(ip) {
        return {
            path: [{ kind: CAPTCHA_TRY_KEY, name: ip }]
        };
    }
    private constructCaptchaTryEntity(ip, count) {
        let key = this.constructCaptchaTryKey(ip);
        let time = (new Date()).toISOString();
        let expires = Util.generateExpires(24);
        let properties = {
            time: { dateTimeValue: time },
            _expires: { dateTimeValue: expires },
            count: { integerValue: count }
        };

        Util.filter(properties);

        return { key: key, properties: properties };
    }
}


