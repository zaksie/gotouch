var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var user_1 = require('../user');
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');
exports.CLIENT_USER_KEY = 'ClientUser';
exports.CLIENT_USER_ROUTE = '/diners'; //this is also the type
var UserClient = (function (_super) {
    __extends(UserClient, _super);
    function UserClient() {
        _super.apply(this, arguments);
    }
    UserClient.prototype.REGISTERED_USER_KEY = function () {
        return exports.CLIENT_USER_KEY;
    };
    UserClient.prototype.USER_ROUTE = function () {
        return exports.CLIENT_USER_ROUTE;
    };
    UserClient.prototype.isRegistrationAllowed = function (params, callback) {
        callback(null, true);
    };
    UserClient.prototype.isSocialLoginAllowed = function (params, callback) {
        callback(null, true, null);
    };
    UserClient.prototype.onNewRegisteredUser = function (proto, params, callback) {
        callback(null, proto);
    };
    UserClient.prototype.on1stFactorSuccess = function (req, res, next) { next(); };
    ;
    UserClient.prototype.send2ndFactorVerification = function (params, callback) { throw new Error('Not implemented'); };
    UserClient.prototype.verify2ndFactor = function (params, callback) { throw new Error('Not implemented'); };
    return UserClient;
})(user_1.User);
exports.UserClient = UserClient;
//# sourceMappingURL=user-client.js.map