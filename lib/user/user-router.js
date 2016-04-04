var app_1 = require('../../app');
var user_client_1 = require('./client/user-client');
var user_pos_1 = require('./pos/user-pos');
var user_admin_1 = require('./admin/user-admin');
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');
var USERS = [new user_client_1.UserClient(), new user_pos_1.UserPOS(), new user_admin_1.UserAdmin()];
var UserRouter = (function () {
    function UserRouter() {
    }
    UserRouter.prototype.ofType = function (type) {
        if (type[0] != '/')
            type = '/' + type;
        var throwErr = function () {
            throw new Error('Invalid type in UserRouter');
        };
        return _.find(USERS, function (u) {
            return type == u.USER_ROUTE();
        }) || throwErr();
    };
    UserRouter.prototype.find = function (usermap, final_callback) {
        var _this = this;
        if (!app_1.gapis.datastore)
            return setTimeout(this.find.bind(this), 300, usermap, final_callback);
        var users = {};
        var q = async.queue(function (user_id, queue_callback) {
            if (!user_id || !_.isString(user_id.route))
                return queue_callback('Invalid user');
            async.waterfall([
                function (callback) {
                    _this.ofType(user_id.route).findById(user_id.id, callback);
                }, function (user, callback) {
                    var authorized = _this.ofType(user_id.route).isAuthorized(user);
                    callback(null, authorized ? user : null);
                }], queue_callback);
        });
        q.drain = function () {
            final_callback(null, Object.keys(users).length ? users : null);
        };
        _.forEach(usermap, function (user_id) {
            q.push(user_id, function (err, user) {
                if (err)
                    app_1.logging.error(err);
                else if (user)
                    users[user.route] = user;
            });
        });
    };
    return UserRouter;
})();
exports.UserRouter = UserRouter;
//# sourceMappingURL=user-router.js.map