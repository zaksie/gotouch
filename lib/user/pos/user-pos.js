var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../../app');
var utils_1 = require('../../service/utils');
var user_1 = require('../user');
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');
exports.STATUS_REGISTERED = 'registered';
exports.POS_USER_KEY = 'POSUser';
exports.POS_USER_ROUTE = '/chefs'; //this is also the type
var UserPOS = (function (_super) {
    __extends(UserPOS, _super);
    function UserPOS() {
        _super.apply(this, arguments);
    }
    UserPOS.prototype.REGISTERED_USER_KEY = function () {
        return exports.POS_USER_KEY;
    };
    UserPOS.prototype.USER_ROUTE = function () {
        return exports.POS_USER_ROUTE;
    };
    UserPOS.prototype.isRegistrationAllowed = function (params, callback) {
        app_1.app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), callback);
    };
    UserPOS.prototype.isSocialLoginAllowed = function (params, callback) {
        app_1.app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), callback);
    };
    UserPOS.prototype.onNewRegisteredUser = function (proto, params, callback) {
        app_1.app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), function (err, valid, object) {
            if (err || !valid)
                return callback(err ? err : 'Invalid registration code');
            var existingRecord = {};
            utils_1.Util.toProtoEntity(existingRecord, object);
            existingRecord.status = exports.STATUS_REGISTERED;
            proto.properties = _.assign(existingRecord, proto.properties);
            callback();
        });
    };
    UserPOS.prototype.finalizeRegistration = function (params, callback) {
        if (params.code)
            return app_1.app.twilio.deleteCodeEntry(params.code, this.USER_ROUTE(), callback);
        callback();
    };
    UserPOS.prototype.on1stFactorSuccess = function (req, res, next) { next(); };
    ;
    UserPOS.prototype.send2ndFactorVerification = function (params, callback) { throw new Error('Not implemented'); };
    UserPOS.prototype.verify2ndFactor = function (params, callback) { throw new Error('Not implemented'); };
    return UserPOS;
})(user_1.User);
exports.UserPOS = UserPOS;
//# sourceMappingURL=user-pos.js.map