var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../../app');
var utils_1 = require('../../service/utils');
var endpoint_1 = require('../endpoint');
var user_admin_1 = require('./user-admin');
var user_pos_1 = require('../pos/user-pos');
var PubSub = require('pubsub-js');
var CONST_1 = require('../../service/CONST');
var _ = require('lodash');
var async = require('async');
var UNREGISTERED_POS_ACCOUNT_EXPIRY_HOURS = 24 * 14;
var Admin = (function (_super) {
    __extends(Admin, _super);
    function Admin() {
        _super.call(this);
        PubSub.subscribe('GooglePubSub.ready', this.initGooglePubSubTopics.bind(this));
    }
    Admin.prototype.initGooglePubSubTopics = function () {
        var _this = this;
        app_1.gapis.pubsub.getTopic(CONST_1.CONST.gPubSub.DisconnectUser, function (err, topic) {
            if (err)
                return app_1.logging.error(err);
            _this.DisconnectUserTopic = topic;
            PubSub.publish(CONST_1.CONST.PubSub.TopicDisconnectUserReady, null);
        });
    };
    // @Implements
    Admin.prototype.ROUTE = function () {
        return user_admin_1.ADMIN_USER_ROUTE;
    };
    Admin.prototype.getPOSUsers = function (batch_callback, final_callback) {
        async.series([
            function (callback) {
                app_1.app.twilio.fetchAllCodeEntries(user_pos_1.POS_USER_ROUTE, function (err, results) {
                    if (!err && results)
                        batch_callback(results);
                    callback(err);
                });
            },
            function (callback) { app_1.app.user.ofType(user_pos_1.POS_USER_ROUTE).fetchAll(batch_callback, callback); }], final_callback);
    };
    Admin.prototype.getBusinesses = function (batch_callback, final_callback) {
        app_1.app.business.fetchAll(batch_callback, final_callback, { partial: true });
    };
    Admin.prototype.getBusinessHash = function (yield_callback, callback) {
        app_1.app.business.getHashOfGoogleInfoRecords(yield_callback, callback);
    };
    Admin.prototype.sendSMSCodeToPOSUser = function (body, callback) {
        try {
            body.name = ' ' + body.name;
            var subject = '% - your yummlet POS access code';
            async.waterfall([
                function (callback) {
                    body.subject = subject;
                    body.kind = user_pos_1.POS_USER_ROUTE;
                    body.code;
                    app_1.app.twilio.sendCode(body, callback, { createIfNotFound: true });
                }], function (err, result) {
                callback(err);
            });
        }
        catch (e) {
            callback(e);
        }
    };
    Admin.prototype.upsertPosUser = function (body, callback) {
        (new UpsertUserAction()).act(body, callback);
    };
    Admin.prototype.deletePOSUser = function (user, callback) {
        var _this = this;
        (new DeleteUserAction()).act(user, function (err) {
            if (err)
                return app_1.logging.error(err);
            _this.disconnectPOSUser(user, callback);
        });
    };
    Admin.prototype.deactivatePOSUser = function (user, value, callback) {
        var _this = this;
        if (value)
            (new DeactivateAction()).act(user, function (err) {
                if (err)
                    return app_1.logging.error(err);
                _this.disconnectPOSUser(user, callback);
            });
        else
            (new ReactivateAction()).act(user, callback);
    };
    Admin.prototype.disconnectPOSUser = function (user, callback) {
        if (this.DisconnectUserTopic)
            this.DisconnectUserTopic.publish({ data: "disconnect" }, function (err) {
                if (err)
                    return app_1.logging.error(err);
            });
    };
    Admin.prototype.canUpdateMedia = function () {
        return true;
    };
    Admin.prototype.canDeleteMedia = function () {
        return true;
    };
    return Admin;
})(endpoint_1.Endpoint);
exports.Admin = Admin;
function generateCodeForPOSUser(params) {
    var formatted = utils_1.Util.generateRandomCaseInsensitive('xxxx - xxxx');
    params.formatted_code = params.formatted_code || formatted;
    params.code = app_1.app.twilio.sanitizeSMSCode(params.formatted_code);
}
var AbstractAction = (function () {
    function AbstractAction() {
    }
    AbstractAction.prototype.pre = function (params) { };
    AbstractAction.prototype.post = function (result, params) { return result; };
    AbstractAction.prototype.act = function (params, final_callback) {
        var _this = this;
        async.waterfall([
            function (callback) {
                _this.pre(params);
                if (!params.id)
                    return callback(null, null);
                app_1.app.user.ofType(user_pos_1.POS_USER_ROUTE).findById(params.id, callback);
            },
            function (user, callback) {
                if (user)
                    return _this.caseUser(params, callback);
                if (!params.code)
                    return callback('Invalid parameters');
                _this.caseSMSCode(params, callback);
            }], function (err, result) {
            if (!err)
                result = _this.post(result, params);
            final_callback(err, err ? null : result);
        });
    };
    return AbstractAction;
})();
var UpsertUserAction = (function (_super) {
    __extends(UpsertUserAction, _super);
    function UpsertUserAction() {
        _super.apply(this, arguments);
    }
    UpsertUserAction.prototype.pre = function (params) {
        var businesses = _.uniq(JSON.parse(params.businesses), function (b) { return b.placeid; });
        params.placeids = _.map(businesses, function (b) { return b.placeid; }),
            delete params.businesses;
        if (!params.formatted_code)
            generateCodeForPOSUser(params);
    };
    UpsertUserAction.prototype.caseUser = function (params, callback) {
        app_1.app.user.ofType(user_pos_1.POS_USER_ROUTE).upsertUserInfo(params.id, params, true, callback);
    };
    UpsertUserAction.prototype.caseSMSCode = function (params, callback) {
        params.expiry_options = { hours: UNREGISTERED_POS_ACCOUNT_EXPIRY_HOURS };
        app_1.app.twilio.upsertCodeEntry(params.code, user_pos_1.POS_USER_ROUTE, params, callback);
    };
    UpsertUserAction.prototype.post = function (result, params) {
        return { id: result, code: params.code };
    };
    return UpsertUserAction;
})(AbstractAction);
var DeleteUserAction = (function (_super) {
    __extends(DeleteUserAction, _super);
    function DeleteUserAction() {
        _super.apply(this, arguments);
    }
    DeleteUserAction.prototype.caseUser = function (params, callback) {
        app_1.app.user.ofType(user_pos_1.POS_USER_ROUTE).deleteUser(params.id, callback);
    };
    DeleteUserAction.prototype.caseSMSCode = function (params, callback) {
        app_1.app.twilio.deleteCodeEntry(params.code, user_pos_1.POS_USER_ROUTE, callback);
    };
    return DeleteUserAction;
})(AbstractAction);
var DeactivateAction = (function (_super) {
    __extends(DeactivateAction, _super);
    function DeactivateAction() {
        _super.apply(this, arguments);
    }
    DeactivateAction.prototype.pre = function (params) {
        params.$inactive = true;
    };
    return DeactivateAction;
})(UpsertUserAction);
var ReactivateAction = (function (_super) {
    __extends(ReactivateAction, _super);
    function ReactivateAction() {
        _super.apply(this, arguments);
    }
    ReactivateAction.prototype.pre = function (params) {
        params.$inactive = false;
    };
    return ReactivateAction;
})(UpsertUserAction);
//# sourceMappingURL=admin.js.map