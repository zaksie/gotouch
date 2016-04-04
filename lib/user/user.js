var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var mailer_1 = require('../service/mailer');
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');
var user_generic_1 = require('./client/user-generic');
var GoogleAuth = require('google-auth-library');
var sjcl = require('sjcl');
var querystring = require('querystring');
exports.USER_TRACE_KEY = 'UserTrace';
exports.USER_KEY = 'User';
exports.FACEBOOK = 'fb';
exports.GOOGLE = 'google';
var SALT_LENGTH = 10;
(function (AccountStatus) {
    AccountStatus[AccountStatus["AWAITING_ACTIVATION"] = 412] = "AWAITING_ACTIVATION";
    AccountStatus[AccountStatus["EXPECTING_PWD_CHANGE"] = 423] = "EXPECTING_PWD_CHANGE";
    AccountStatus[AccountStatus["WRONG_USER"] = 401] = "WRONG_USER";
    AccountStatus[AccountStatus["WRONG_PWD"] = 401] = "WRONG_PWD";
    AccountStatus[AccountStatus["INACTIVE_ACCOUNT"] = 403] = "INACTIVE_ACCOUNT";
})(exports.AccountStatus || (exports.AccountStatus = {}));
var AccountStatus = exports.AccountStatus;
;
var NOT_OK = false;
var OK = true;
var MAX_FETCH_ALL_PAGE_SIZE = 100;
var HOURS_BEFORE_REGISTRATION_ACTIVATION_LINK_EXPIRES = 72;
var User = (function () {
    function User() {
        this.generic = new user_generic_1.GenericUser();
    }
    User.prototype.finalizeRegistration = function (params, callback) {
        callback();
    };
    User.prototype.fetchAll = function (yield_callback, final_callback, DS_KIND) {
        var _this = this;
        var kind = DS_KIND || this.REGISTERED_USER_KEY();
        var cursorGQLQuery = function (cursor, pass_along_cb, callback) {
            var gql = 'SELECT * FROM ' + kind + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            app_1.gapis.datastore.runGQLQuery(gql, function (err, results) { callback(err, results, cursor + 1, pass_along_cb); });
        };
        var cursor_callback = function (err, results, new_cursor, final_callback) {
            app_1.logging.info('Fetching POS user info for admin. Batch no. ' + new_cursor);
            var condition = results.batch.entityResults.length;
            if (condition) {
                var formatted_results = _.map(results.batch.entityResults, function (r) {
                    r = _this.getUserFromProto(null, r.entity);
                    return r.user;
                });
                yield_callback(formatted_results);
                return cursorGQLQuery(new_cursor, final_callback, cursor_callback);
            }
            final_callback();
        };
        cursorGQLQuery(0, final_callback, cursor_callback);
    };
    User.prototype.open = function (cookie, data, callback) {
        // TODO: perhaps add something about registered users per se;
        this.generic.open(cookie, callback);
    };
    User.prototype.on1stFactorSuccess = function (req, res, next) {
        var route = this.USER_ROUTE();
        var user = req.user[route];
        // TODO: IMPORTANT!! Remove this before going into production
        if (user.username == 'demo@demo.demo')
            return next();
        if (req.body.code) {
            user.code = req.body.code;
            return this.verify2ndFactor(user, function (err, valid) {
                if (valid)
                    return next();
                logout(1);
                return res.sendStatus(449);
            });
        }
        if (!user.phone_number) {
            logout(2);
            return res.sendStatus(449);
        }
        this.send2ndFactorVerification(user, function (err, code) {
            logout(3);
            if (err)
                return res.sendStatus(503);
            return res.sendStatus(449);
        });
        function logout(no) {
            req._logout(route, function (err) {
                if (err)
                    app_1.logging.error('error in on1stFactorSuccess(' + no + ')', err);
            });
        }
    };
    User.prototype.requestSupport = function (body, callback) {
        var html = '';
        for (var attr in body) {
            html += '<p><strong>' + attr + '</strong>: ' + body[attr] + '</p>';
        }
        app_1.app.mailer.sendContactRequest('Login support requested', html, callback);
    };
    User.prototype.registerForPilot = function (body, callback) {
        body.type = 'PILOT REGISTRATION';
        this.requestSupport(body, callback);
    };
    User.prototype.checkIfUsernameExists = function (username, callback) {
        this.findUser(username, function (err, result) {
            callback(err, result.batch.entityResults.length);
        }, null);
    };
    User.prototype.register = function (final_callback, cookieid, username, password, email, args, proto_args, anchor) {
        app_1.gapis.datastore.startTransaction(this.registerAux.bind(this), final_callback, cookieid, username, password, email, args, proto_args, anchor);
    };
    User.prototype.sendResetLink = function (username, final_callback) {
        var _this = this;
        this.findUser(username, function (err, result) {
            if (result.batch.entityResults.length) {
                var state = _this.getState(result.batch.entityResults[0].entity);
                if (!state.can.sendResetLink)
                    return final_callback(state.statuses);
                var resetVerification = new ResetVerification();
                var unsubscribeVerification = new UnsubscribeVerification();
                var code = app_1.duid.getDUID(4).join("");
                result.batch.entityResults[0].entity.properties.code = { stringValue: code };
                async.waterfall([
                    function (callback) {
                        app_1.gapis.datastore.upsert([result.batch.entityResults[0].entity], callback);
                    },
                    function (__not_important__, __not_important_2__, callback) {
                        var id = result.batch.entityResults[0].entity.key.path[0].id;
                        var reset = resetVerification.generateLink({ user: _this, id: id, code: code });
                        var unsubscribe = unsubscribeVerification.generateLink({ id: id, code: code });
                        app_1.app.mailer.sendResetPassword({ email: username, reset: reset, unsubscribe: unsubscribe, new_password_route: _this.getNewPasswordRoute() }, callback);
                    }], final_callback);
            }
        }, null);
    };
    User.prototype.changePassword = function (coded_username, password, callback) {
        var _this = this;
        var username = (new ResetVerification).parseUsername(coded_username);
        if (!username)
            return callback(null, NOT_OK);
        this.findUser(username, function (err, result) {
            if (!result.batch.entityResults.length)
                return callback(null, NOT_OK);
            var state = _this.getState(result.batch.entityResults[0].entity);
            if (!state.can.changePassword)
                return callback(state.statuses);
            bcrypt.hash(password, SALT_LENGTH, function (err, hashed_pwd) {
                if (err)
                    return callback(err);
                result.batch.entityResults[0].entity.properties.hashed_pwd = { stringValue: hashed_pwd };
                (new ResetVerification()).completedSuccessfully(result.batch.entityResults[0].entity);
                app_1.gapis.datastore.upsert([result.batch.entityResults[0].entity], callback);
            });
        }, null);
    };
    User.prototype.deleteUser = function (id, callback) {
        var key = {
            path: [{
                    kind: this.REGISTERED_USER_KEY(),
                    id: id
                }]
        };
        app_1.gapis.datastore.delete([key], callback);
    };
    User.prototype.registerAux = function (final_callback, tx, cookieid, username, password, email, args, proto_args, anchor) {
        var _this = this;
        if (!cookieid || !username || !password || !email)
            return final_callback(new Error('invalid arguments'));
        var code = app_1.duid.getDUID(4).join("");
        var new_entity_key;
        var emailVerification = new EmailVerification();
        var unsubscribeVerification = new UnsubscribeVerification();
        var requiresActivation = anchor.email != username;
        async.waterfall([
            function (callback) {
                bcrypt.hash(password, SALT_LENGTH, callback);
            },
            function (hashed_pwd, callback) {
                if (!args)
                    args = {};
                if (requiresActivation) {
                    args.code = code;
                    args._expires = utils_1.Util.generateExpires(HOURS_BEFORE_REGISTRATION_ACTIVATION_LINK_EXPIRES); //the underscore is for clean-sweeper //The _expires field actually stands for activation_required. bad design :(
                }
                args.how = 'local';
                var entity = _this.constructRegisteredUser({
                    cookieid: cookieid,
                    username: username,
                    hashed_pwd: hashed_pwd,
                    email: email,
                    args: args,
                    proto_args: proto_args
                });
                _this.onNewRegisteredUser(entity, anchor, function (err) { callback(err, entity); });
            },
            function (entity, callback) {
                app_1.gapis.datastore.insertAutoId([entity], callback, tx);
            },
            function (result, __not_important__, callback) {
                if (!result.mutationResult.insertAutoIdKeys)
                    return callback('Failed to insert new user record into DS');
                if (!requiresActivation)
                    return callback();
                new_entity_key = result.mutationResult.insertAutoIdKeys[0];
                var id = new_entity_key.path[0].id;
                var activate = emailVerification.generateLink({ user: _this, id: id, code: code });
                var unsubscribe = unsubscribeVerification.generateLink({ id: id, code: code });
                app_1.app.mailer.sendActivation({ email: email, activate: activate, unsubscribe: unsubscribe }, callback);
            }], function (err, arg0, arg1) {
            if (err) {
                app_1.logging.error(err);
                app_1.gapis.datastore.delete([new_entity_key], function (err) { if (err)
                    app_1.logging.error(err); });
            }
            else
                _this.finalizeRegistration(anchor, function (err) { if (err)
                    app_1.logging.error(err); });
            final_callback(err, arg0, arg1);
        });
    };
    User.prototype.upsertUserInfo = function (id, args, overwrite, callback, DS_KIND) {
        var _this = this;
        var kind = DS_KIND || this.REGISTERED_USER_KEY();
        var insertNew = function (params, callback) {
            app_1.logging.info('inserting new ' + kind);
            var entity = _this.constructRegisteredUser(params);
            app_1.gapis.datastore.insertAutoId([entity], callback);
        };
        if (!id)
            return insertNew({ args: args, DS_KIND: kind }, callback);
        var key = {
            path: [{ kind: kind, id: id }]
        };
        app_1.gapis.datastore.lookup([key], function (err, result) {
            if (!err)
                if (result.found.length) {
                    var properties = utils_1.Util.fromProtoEntity(result.found[0].entity.properties);
                    if (overwrite)
                        properties = utils_1.Util._merge(properties, args);
                    else
                        properties = utils_1.Util._merge(args, properties);
                    var proto = {
                        key: key, properties: {}
                    };
                    utils_1.Util.toProtoEntity(proto.properties, properties);
                    app_1.logging.info('updating ' + kind);
                    return app_1.gapis.datastore.upsert([proto], function (err) { callback(err); });
                }
                else {
                    return insertNew({ args: args, DS_KIND: kind }, callback);
                }
        });
    };
    User.prototype.activateAccount = function (query, callback) {
        this.findUserBySecretQuery(new EmailVerification(), query, callback);
    };
    User.prototype.resetPassword = function (query, callback) {
        this.findUserBySecretQuery(new ResetVerification(), query, callback);
    };
    User.prototype.unsubscribe = function (query, callback) {
        this.findUserBySecretQuery(new UnsubscribeVerification(), query, callback);
    };
    User.prototype.authenticate = function (req, username, password, final_callback) {
        var _this = this;
        bcrypt.hash(password, SALT_LENGTH, function (err, hashed_pwd) {
            // this is for seeing how the hashed_pwd looks like for admin users.
            // will be removed after admins will be allowed to add other admins
            return hashed_pwd;
        });
        var user, protoUser;
        async.waterfall([
            function (callback) {
                _this.findUser(username, callback, null);
            },
            function (results, resultDetails, callback) {
                if (!results.batch.entityResults.length)
                    return callback(AccountStatus.WRONG_USER);
                protoUser = results.batch.entityResults[0].entity;
                var result = _this.getUserFromProto(req, protoUser);
                var state = _this.getState(protoUser);
                if (!state.can.authenticate)
                    return callback(state.statuses);
                user = result.user;
                user.id = protoUser.key.path[0].id;
                bcrypt.hash(password, SALT_LENGTH, function (err, hashed_pwd) {
                    app_1.logging.info('pwd: ' + hashed_pwd);
                });
                bcrypt.compare(password, result.hashed_pwd, callback);
            }], function (err, correct_pwd) {
            if (err == AccountStatus.WRONG_USER || !correct_pwd)
                return final_callback(null, false);
            else if (err)
                return final_callback(err);
            final_callback(null, _this.toPassportFormat(req, user));
        });
    };
    User.prototype.toPassportFormat = function (req, user) {
        var _users_ = {};
        _users_[this.USER_ROUTE()] = user;
        return _.assign({}, req.user, _users_);
    };
    User.prototype.findBy = function (keyvalue, callback, DS_KIND) {
        if (!app_1.gapis.datastore)
            return setTimeout(this.findBy.bind(this), 300, keyvalue, callback, DS_KIND);
        DS_KIND = DS_KIND || this.REGISTERED_USER_KEY();
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            if (result.batch.entityResults.length) {
                var user = { how: utils_1.Util.fromProtoEntity(result.batch.entityResults[0].entity.properties).how };
            }
            callback(null, user);
        };
        var gql = 'SELECT * FROM ' + DS_KIND + ' WHERE ' + keyvalue.key + ' = "' + keyvalue.value + '"';
        app_1.gapis.datastore.runGQLQuery(gql, mid_callback);
    };
    User.prototype.findById = function (id, callback) {
        var _this = this;
        var key = {
            path: [{
                    kind: this.REGISTERED_USER_KEY(), id: id
                }]
        };
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            if (result.found.length)
                var user = _this.getUserFromProto(null, result.found[0].entity).user;
            callback(null, user);
        };
        app_1.gapis.datastore.lookup([key], mid_callback);
    };
    User.prototype.isAuthorized = function (user) {
        return user && !user.$inactive && !user.expectingPasswordChange;
    };
    // A tid bit: I do not check on pre-existing usernames when accepting social login 
    // since FB/G verify those email addrs in the first place => if emails match -> it's the same person.
    User.prototype.socialLogin = function (params, final_callback) {
        var _this = this;
        params.profile.ip = utils_1.Util.getIP(params.req);
        async.waterfall([
            function (callback) {
                params.provider.verify(params.profile.token, callback);
            },
            function (data, callback) {
                // Analyze server token response
                if (!params.provider.isVerified(data, params.profile))
                    return callback(new Error('Token error'));
                _this.findAndMerge(params.profile, callback);
            },
            function (userObject, callback) {
                if (userObject) {
                    if (!_this.isAuthorized(userObject.user))
                        return callback(AccountStatus.INACTIVE_ACCOUNT);
                    userObject._found = true;
                    return app_1.gapis.datastore.upsert([userObject.proto], function (err) {
                        callback(err, userObject);
                    });
                }
                _this.isSocialLoginAllowed(params.profile, function (err, allowed, anchor) {
                    if (err)
                        return callback(err);
                    if (!allowed)
                        return callback(403);
                    var entity = _this.constructSocialUser(params.cookie.id, params.profile);
                    _this.onNewRegisteredUser(entity, anchor, function (err) { callback(err, entity); });
                });
            },
            function (proto, callback) {
                if (proto._found)
                    return callback(null, proto); // proto IS actually a userObject at this stage. bad design :(
                var mid_callback = function (err, result) {
                    if (err)
                        return callback(err);
                    var id = result.mutationResult.insertAutoIdKeys[0].path[0].id;
                    proto.key.path[0].id = id; //so that it dovetails better with the other option (that the user has been _found)
                    var user = utils_1.Util.fromProtoEntity(proto.properties);
                    callback(null, { user: user, proto: proto });
                };
                return app_1.gapis.datastore.insertAutoId([proto], mid_callback, null);
            },
            function (userObject, callback) {
                var id = userObject.proto.key.path[0].id;
                // insert a track record of user log activity
                _this.generateUserTraceKey(userObject.proto, id);
                // remove full token from user
                delete userObject.user.token;
                _this.finalizeRegistration(userObject.user, function (err) { callback(err, userObject); });
                _this.finalizeUserObject(params.req, userObject.user, id);
            },
            function (userObject, callback) {
                _this.logSocialUserIntoLocalSystem(params.req, userObject.user, callback);
            }], function (err, user) {
            final_callback(err, err ? null : user);
        });
    };
    User.prototype.logSocialUserIntoLocalSystem = function (req, user, callback) {
        var passportFormat = this.toPassportFormat(req, user);
        req.login(passportFormat, function (err) {
            app_1.logging.info('User logged in using a social account');
            callback(err, user);
        });
    };
    User.prototype.getState = function (proto_original_entity) {
        var statuses = [];
        var can = { sendResetLink: true, activateAccount: true, changePassword: true, authenticate: true };
        var properties = utils_1.Util.fromProtoEntity(proto_original_entity.properties);
        if (properties._expires) {
            statuses.push(AccountStatus.AWAITING_ACTIVATION);
            delete can.sendResetLink;
            delete can.changePassword;
            delete can.authenticate;
        }
        if (properties.$inactive) {
            statuses.push(AccountStatus.INACTIVE_ACCOUNT);
        }
        if (properties.expectingPasswordChange) {
            statuses.push(AccountStatus.EXPECTING_PWD_CHANGE);
        }
        return {
            can: can, statuses: statuses
        };
    };
    User.prototype.findUserBySecretQuery = function (invoker, query, final_callback) {
        var _this = this;
        var data = invoker.decipherQuery(query);
        if (!data)
            return final_callback(new Error('invalid query'));
        var keys = [{
                path: [{ kind: this.REGISTERED_USER_KEY(), id: data.id }]
            }];
        var userObject = {};
        async.waterfall([
            function (callback) {
                app_1.gapis.datastore.lookup(keys, callback);
            },
            function (result, __not_important__, callback) {
                userObject.user = { code: null };
                if (result.found.length) {
                    userObject.user = utils_1.Util.fromProtoEntity(result.found[0].entity.properties);
                }
                if (userObject.user.code != data.code)
                    return callback(null, null, false);
                userObject.proto = result.found[0].entity;
                invoker.onRecordFound(userObject);
                app_1.gapis.datastore.upsert([userObject.proto], function (err, result) { callback(err, result, true); });
            },
            function (result, valid, callback) {
                callback(null, invoker.getRedirectUrl(_this, valid), invoker.getReturnData(userObject));
            }], final_callback);
    };
    User.prototype.findAndMerge = function (profile, callback) {
        var _this = this;
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            if (!result.batch.entityResults.length)
                return callback(null, null);
            var proto = result.batch.entityResults[0].entity;
            var user = _this.getUserFromProto(null, proto).user;
            user = _.merge({}, user, profile);
            utils_1.Util.toProtoEntity(proto.properties, user);
            callback(null, { user: user, proto: proto });
        };
        var gql = 'SELECT * FROM ' + this.REGISTERED_USER_KEY() + ' WHERE username = "' + profile.username + '"';
        app_1.gapis.datastore.runGQLQuery(gql, mid_callback, null);
    };
    User.prototype.getUserFromProto = function (req, entity) {
        var user = utils_1.Util.fromProtoEntity(entity.properties);
        var hashed_pwd = (user.hashed_pwd || "").toString();
        this.fixMultiplePlaceIdsBug(user);
        this.finalizeUserObject(req, user, entity.key.path[0].id);
        return { user: user, hashed_pwd: hashed_pwd };
    };
    User.prototype.fixMultiplePlaceIdsBug = function (user) {
        if (user.placeids)
            user.placeids = _.uniq(user.placeids);
    };
    User.prototype.findUser = function (username, callback, tx) {
        var gql = 'SELECT * FROM ' + this.REGISTERED_USER_KEY() + ' WHERE username = "' + username + '"';
        app_1.gapis.datastore.runGQLQuery(gql, callback, tx);
    };
    User.prototype.generateUserTraceKey = function (proto, id) {
        proto.key = {
            path: [{ kind: this.REGISTERED_USER_KEY(), id: id },
                { kind: exports.USER_TRACE_KEY }
            ]
        };
        // update clock
        proto.properties.time = { dateTimeValue: new Date().toISOString() };
        app_1.gapis.datastore.insertAutoId([proto], function (err) {
            if (err)
                app_1.logging.error(err);
        });
    };
    User.prototype.constructRegisteredUser = function (params) {
        var kind = params.DS_KIND || this.REGISTERED_USER_KEY();
        var key = {
            path: [{ kind: kind }]
        };
        var time = new Date().toISOString();
        var properties;
        properties = {
            username: { stringValue: params.username },
            cookieid: { stringValue: params.cookieid },
            hashed_pwd: { stringValue: params.hashed_pwd },
            email: { stringValue: params.email },
            time: { dateTimeValue: time },
        };
        properties = utils_1.Util.addArgsTo(properties, params.args, params.proto_args);
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    User.prototype.constructSocialUser = function (cookieid, profile) {
        var madeUpHash = (Math.random() * Math.pow(10, 10)).toString();
        var proto_args = { expires: { dateTimeValue: profile.expires } };
        return this.constructRegisteredUser({
            cookieid: cookieid,
            username: profile.username,
            hashed_pwd: madeUpHash,
            email: profile.email,
            args: profile,
            proto_args: proto_args
        });
    };
    User.prototype.finalizeUserObject = function (req, user, id, options) {
        options = options || {};
        user.id = id;
        user.route = this.USER_ROUTE();
        delete user.hashed_pwd;
        if (!options.forAdmin) {
            for (var key in user)
                if (key[0] == '_internal_')
                    delete user[key];
        }
        user.hash = utils_1.Util.hash(user);
    };
    User.prototype.getEmailVerificationRedirectUrl = function () {
        return this.USER_ROUTE();
    };
    User.prototype.getEmailVerificationInvalidUrl = function () {
        return '/login/invalidactivation';
    };
    User.prototype.getEmailVerificationRoute = function () {
        return '/login' + this.USER_ROUTE() + '/activation';
    };
    User.prototype.getPasswordResetRoute = function () {
        return '/login' + this.USER_ROUTE() + '/reset/link';
    };
    User.prototype.getNewPasswordRoute = function () {
        return '/login' + this.USER_ROUTE() + '/reset/newpassword';
    };
    return User;
})();
exports.User = User;
var Facebook = (function () {
    function Facebook() {
        this.is = exports.FACEBOOK;
    }
    Facebook.prototype.verify = function (token, callback) {
        utils_1.Util.postHttps('graph.facebook.com', '/oauth/access_token', {
            client_id: app_1.config.facebook.client_id,
            client_secret: app_1.config.facebook.secret,
            grant_type: 'fb_exchange_token',
            fb_exchange_token: token
        }, function (data) {
            callback(null, data);
        });
    };
    Facebook.prototype.isVerified = function (data, profile) {
        if (_.includes(data[0], 'error'))
            return false;
        profile.token = data[0].match('access_token=(.*)&expires')[1];
        var now = new Date();
        var expires = data[0].match('&expires=(.*)')[1];
        now.setSeconds(parseInt(expires));
        profile.expires = now.toISOString();
        return true;
    };
    return Facebook;
})();
exports.Facebook = Facebook;
var Google = (function () {
    function Google() {
        this.is = exports.GOOGLE;
    }
    Google.prototype.verify = function (token, callback) {
        var oauth2client = new (new GoogleAuth).OAuth2;
        var audience = app_1.config.google.client_id;
        oauth2client.verifyIdToken(token, audience, callback);
    };
    Google.prototype.isVerified = function (data, profile) {
        // no analysis necessary
        return true;
    };
    return Google;
})();
exports.Google = Google;
var QueryVerification = (function () {
    function QueryVerification() {
    }
    QueryVerification.prototype.getEncryptedQuery = function (id, code, pwd) {
        var data = id + utils_1.KEY_VALUE_SEPARATOR + code;
        var secret = sjcl.encrypt(pwd, data);
        return querystring.stringify(JSON.parse(secret));
    };
    QueryVerification.prototype.decipherQuery = function (query) {
        var secret = JSON.stringify(query, function (k, v) {
            return (_.isString(v) && /(^\d+$)/.test(v)) ? parseInt(v) : v;
        });
        var data = sjcl.decrypt(this.sjcl_password(), secret);
        var arr = data.split(utils_1.KEY_VALUE_SEPARATOR);
        var id = arr[0];
        var code = arr[1];
        if (!id || !code)
            return null;
        return { id: id, code: code };
    };
    return QueryVerification;
})();
exports.QueryVerification = QueryVerification;
var EmailVerification = (function (_super) {
    __extends(EmailVerification, _super);
    function EmailVerification() {
        _super.apply(this, arguments);
    }
    EmailVerification.prototype.sjcl_password = function () {
        return app_1.config.sjcl.passwords.accountActivation;
    };
    EmailVerification.prototype.getRedirectUrl = function (user, isValid) {
        if (!isValid)
            return user.getEmailVerificationInvalidUrl();
        return user.getEmailVerificationRedirectUrl();
    };
    EmailVerification.prototype.onRecordFound = function (recordObject) {
        delete recordObject.proto.properties._expires;
        delete recordObject.proto.properties.code;
    };
    EmailVerification.prototype.getReturnData = function (userObject) {
        return userObject.user;
    };
    EmailVerification.prototype.generateLink = function (data) {
        var query = this.getEncryptedQuery(data.id, data.code, this.sjcl_password());
        return app_1.config.dns + data.user.getEmailVerificationRoute() + '?' + query;
    };
    return EmailVerification;
})(QueryVerification);
exports.EmailVerification = EmailVerification;
var UnsubscribeVerification = (function (_super) {
    __extends(UnsubscribeVerification, _super);
    function UnsubscribeVerification() {
        _super.apply(this, arguments);
    }
    UnsubscribeVerification.prototype.sjcl_password = function () { return app_1.config.sjcl.passwords.unsubscribe; };
    UnsubscribeVerification.prototype.getRedirectUrl = function (user, isValid) {
        if (!isValid)
            return '/unsubscribe/failure';
        return '/unsubscribe/success';
    };
    UnsubscribeVerification.prototype.onRecordFound = function (recordObject) {
        delete recordObject.proto.properties.code;
        app_1.gapis.datastore.upsert([this.constructBlacklisted(recordObject.properties.email)], function (err) { if (err)
            app_1.logging.error(err); });
    };
    UnsubscribeVerification.prototype.getReturnData = function (userObject) { };
    UnsubscribeVerification.prototype.constructBlacklisted = function (email) {
        return {
            key: {
                path: [{ kind: mailer_1.BLACK_LISTED_EMAIL_KEY, name: email }]
            },
            properties: {}
        };
    };
    UnsubscribeVerification.prototype.generateLink = function (data) {
        var query = this.getEncryptedQuery(data.id, data.code, this.sjcl_password());
        return app_1.config.dns + '/unsubscribe?' + query;
    };
    return UnsubscribeVerification;
})(QueryVerification);
exports.UnsubscribeVerification = UnsubscribeVerification;
var ResetVerification = (function (_super) {
    __extends(ResetVerification, _super);
    function ResetVerification() {
        _super.apply(this, arguments);
    }
    ResetVerification.prototype.sjcl_password = function () { return app_1.config.sjcl.passwords.passwordReset; };
    ResetVerification.prototype.getRedirectUrl = function (user, isValid) {
        return isValid;
    };
    ResetVerification.prototype.onRecordFound = function (recordObject) {
    };
    ResetVerification.prototype.completedSuccessfully = function (entity) {
        delete entity.properties.code;
        entity.properties.expectingPasswordChange = { booleanValue: true };
    };
    ResetVerification.prototype.getReturnData = function (userObject) {
        return sjcl.encrypt(app_1.config.sjcl.passwords.username, userObject.user.username);
    };
    ResetVerification.prototype.parseUsername = function (coded_username) {
        return sjcl.decrypt(app_1.config.sjcl.passwords.username, coded_username);
    };
    ResetVerification.prototype.generateLink = function (data) {
        var query = this.getEncryptedQuery(data.id, data.code, this.sjcl_password());
        return app_1.config.dns + data.user.getPasswordResetRoute() + '?' + query;
    };
    return ResetVerification;
})(QueryVerification);
exports.ResetVerification = ResetVerification;
//# sourceMappingURL=user.js.map