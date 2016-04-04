var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var async = require('async');
var _ = require('lodash');
var CAPTCHA = ['www.google.com', '/recaptcha/api/siteverify'];
var SITE_KEY = '6LccpRATAAAAALgLw7C6sFyMjA-3ckACE7ggOEf4';
var SECRET = '6LccpRATAAAAAEsLmR7vY1OD4kTJ3SPfSLRasiTP';
exports.CAPTCHA_KEY = 'VerifiedCaptcha';
exports.CAPTCHA_TRY_KEY = 'CaptchaTry';
var MAX_TRIES_BEFORE_ACTIVATING_CAPTCHA = 10;
var Captcha = (function () {
    function Captcha() {
    }
    Captcha.prototype.verify = function (req, res, next) {
        var _this = this;
        var ip = utils_1.Util.getIP(req);
        utils_1.Util.postHttps(CAPTCHA[0], CAPTCHA[1], { secret: SECRET, response: req.body.captcha, remoteip: ip }, function (result) {
            result = JSON.parse(result);
            if (result.success) {
                _this.insertIntoDatastore(req.body.captcha, ip);
                return next();
            }
            _this.checkDatastore(req.body.captcha, ip, function (err, ok) {
                if (err) {
                    app_1.logging.error(err);
                    ok = false;
                }
                if (ok)
                    return next();
                if (req.captcha_code)
                    return res.sendStatus(req.captcha_code);
                res.status(406).send('Invalid captcha');
            });
        });
    };
    Captcha.prototype.verifyAfterNTries = function (req, res, next) {
        var _this = this;
        var ip = utils_1.Util.getIP(req);
        var mid_callback = function (err, result) {
            if (err) {
                res.sendStatus(err.code);
                return app_1.logging.error(err);
            }
            var count = 0;
            if (result.found.length)
                count = result.found[0].entity.properties.count.integerValue;
            if (count < MAX_TRIES_BEFORE_ACTIVATING_CAPTCHA)
                app_1.gapis.datastore.upsert([_this.constructCaptchaTryEntity(ip, ++count)], function (err) { if (err)
                    app_1.logging.error(err); });
            else {
                req.captcha_code = 429;
                return _this.verify(req, res, next);
            }
            next();
        };
        var key = this.constructCaptchaTryKey(ip);
        app_1.gapis.datastore.lookup([key], mid_callback, null);
    };
    Captcha.prototype.clearTryHistory = function (req) {
        var key = this.constructCaptchaTryKey(utils_1.Util.getIP(req));
        app_1.gapis.datastore.delete([key], function (err) { if (err)
            app_1.logging.error(err); });
    };
    Captcha.prototype.insertIntoDatastore = function (captcha, ip) {
        var entities = [];
        entities.push(this.constructCaptchaEntity(captcha, ip));
        app_1.gapis.datastore.upsert(entities, function (err) { if (err)
            app_1.logging.error(err); });
    };
    //Used to check for codes that have been verified already and cannot be verified again.
    //I don't know tho why i have to reverify anyone...
    Captcha.prototype.checkDatastore = function (captcha, ip, callback) {
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            if (!result.found.length)
                return callback(null, false);
            callback(null, result.found[0].entity.properties.ip.stringValue == ip);
        };
        var key = this.constructCaptchaKey(captcha);
        app_1.gapis.datastore.lookup([key], mid_callback, null);
    };
    Captcha.prototype.constructCaptchaKey = function (captcha) {
        return {
            path: [{ kind: exports.CAPTCHA_KEY, name: captcha }]
        };
    };
    Captcha.prototype.constructCaptchaEntity = function (captcha, ip) {
        var key = this.constructCaptchaKey(captcha);
        var time = (new Date()).toISOString();
        var expires = utils_1.Util.generateExpires(1);
        var properties = {
            time: { dateTimeValue: time },
            _expires: { dateTimeValue: expires },
            ip: { stringValue: ip }
        };
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    Captcha.prototype.constructCaptchaTryKey = function (ip) {
        return {
            path: [{ kind: exports.CAPTCHA_TRY_KEY, name: ip }]
        };
    };
    Captcha.prototype.constructCaptchaTryEntity = function (ip, count) {
        var key = this.constructCaptchaTryKey(ip);
        var time = (new Date()).toISOString();
        var expires = utils_1.Util.generateExpires(24);
        var properties = {
            time: { dateTimeValue: time },
            _expires: { dateTimeValue: expires },
            count: { integerValue: count }
        };
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    return Captcha;
})();
exports.Captcha = Captcha;
//# sourceMappingURL=captcha.js.map