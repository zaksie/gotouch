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
exports.ADMIN_USER_KEY = 'AdminUser';
exports.ADMIN_USER_ROUTE = '/admins'; //this is also the type
var UserAdmin = (function (_super) {
    __extends(UserAdmin, _super);
    function UserAdmin() {
        _super.apply(this, arguments);
    }
    UserAdmin.prototype.REGISTERED_USER_KEY = function () {
        return exports.ADMIN_USER_KEY;
    };
    UserAdmin.prototype.USER_ROUTE = function () {
        return exports.ADMIN_USER_ROUTE;
    };
    UserAdmin.prototype.isRegistrationAllowed = function (params, callback) {
        callback(null, false);
    };
    UserAdmin.prototype.isSocialLoginAllowed = function (params, callback) {
        callback(null, false);
    };
    UserAdmin.prototype.send2ndFactorVerification = function (params, callback) {
        params.formatted_code = params.code = utils_1.Util.generateRandomNumber('xxx - xxx');
        params.subject = 'yummlet admin code: %';
        params.kind = this.USER_ROUTE();
        params.expiry_options = { hours: 1, destroy: true };
        app_1.app.twilio.createAndSend(params, callback);
    };
    UserAdmin.prototype.verify2ndFactor = function (params, callback) {
        app_1.app.twilio.fetchCodeEntry(params.code, this.USER_ROUTE(), function (err, valid, stored_object) {
            if (!err && valid)
                return callback(null, stored_object.id == params.id);
            callback(err, false);
        });
    };
    UserAdmin.prototype.onNewRegisteredUser = function (proto, params, callback) {
        throw new Error('Registration is not allowed for users of type Admin');
    };
    return UserAdmin;
})(user_1.User);
exports.UserAdmin = UserAdmin;
//# sourceMappingURL=user-admin.js.map