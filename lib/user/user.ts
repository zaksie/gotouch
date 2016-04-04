import {logging, gapis, config, app, duid} from '../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
import PubSub = require('pubsub-js');
import {BLACK_LISTED_EMAIL_KEY} from '../service/mailer';
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');
import {GenericUser} from './client/user-generic';
var GoogleAuth = require('google-auth-library');
var sjcl = require('sjcl');
var querystring = require('querystring');
export const USER_TRACE_KEY = 'UserTrace';
export const USER_KEY = 'User'
export const FACEBOOK = 'fb';
export const GOOGLE = 'google';
const SALT_LENGTH = 10;
export enum AccountStatus { AWAITING_ACTIVATION = 412, EXPECTING_PWD_CHANGE = 423 , WRONG_USER=401, WRONG_PWD=401, INACTIVE_ACCOUNT =403};
const NOT_OK = false;
const OK = true;
const MAX_FETCH_ALL_PAGE_SIZE = 100;
const HOURS_BEFORE_REGISTRATION_ACTIVATION_LINK_EXPIRES = 72;
export abstract class User {
    generic = new GenericUser();
    protected abstract REGISTERED_USER_KEY();
    protected abstract USER_ROUTE();
    protected abstract onNewRegisteredUser(proto, anchor, callback);
    abstract isRegistrationAllowed(params, callback: (err, allowed)=>void);
    abstract isSocialLoginAllowed(params, callback: (err, allowed, anchor) => void);
    protected abstract send2ndFactorVerification(params, callback: (err, code) => void);
    protected abstract verify2ndFactor(params, callback: (err, valid) => void);
    protected finalizeRegistration(params, callback) {
        callback();
    }
    fetchAll(yield_callback, final_callback, DS_KIND?) {
        let kind = DS_KIND || this.REGISTERED_USER_KEY();

        var cursorGQLQuery = (cursor, pass_along_cb, callback) => {
            let gql = 'SELECT * FROM ' + kind + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            gapis.datastore.runGQLQuery(gql, (err, results) => { callback(err, results, cursor + 1, pass_along_cb) });
        }

        var cursor_callback = (err, results, new_cursor, final_callback) => {
            logging.info('Fetching POS user info for admin. Batch no. ' + new_cursor);
            let condition = results.batch.entityResults.length;
            if (condition) {
                let formatted_results = _.map(results.batch.entityResults, (r) => {
                    r = this.getUserFromProto(null, r.entity);
                    return r.user;
                });
                yield_callback(formatted_results);
                return cursorGQLQuery(new_cursor, final_callback, cursor_callback);
            }
            final_callback();
        }

        cursorGQLQuery(0, final_callback, cursor_callback);
    }

    open(cookie, data, callback) {
        // TODO: perhaps add something about registered users per se;
        this.generic.open(cookie, callback);
    }

    on1stFactorSuccess(req, res, next) {
        let route = this.USER_ROUTE();
        let user = req.user[route];

        // TODO: IMPORTANT!! Remove this before going into production
        if (user.username == 'demo@demo.demo') return next();

        if (req.body.code) { // resend request is done by setting code = null
            user.code = req.body.code;
            return this.verify2ndFactor(user, (err, valid) => {
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
        this.send2ndFactorVerification(user, (err, code) => {
            logout(3);
            if (err) return res.sendStatus(503);
            return res.sendStatus(449);
        });

        function logout(no) {
            req._logout(route, (err) => {
                if (err) logging.error('error in on1stFactorSuccess('+no+')', err)
            });
        }
    }
    requestSupport(body, callback) {
        let html ='';
        for (let attr in body) {
            html += '<p><strong>' + attr + '</strong>: ' + body[attr] + '</p>';
        }

        app.mailer.sendContactRequest('Login support requested', html, callback)
    }

    registerForPilot(body, callback) {
        body.type = 'PILOT REGISTRATION';
        this.requestSupport(body, callback);
    }

    checkIfUsernameExists(username, callback) {
        this.findUser(username, (err, result) => {
            callback(err, result.batch.entityResults.length);
        }, null);
    }
    register(final_callback, cookieid, username, password, email, args, proto_args, anchor) {
        gapis.datastore.startTransaction(this.registerAux.bind(this), final_callback, cookieid, username, password, email, args, proto_args, anchor);
    }

    sendResetLink(username, final_callback) {
        this.findUser(username, (err, result) => {
            if (result.batch.entityResults.length) {
                var state = this.getState(result.batch.entityResults[0].entity);
                if (!state.can.sendResetLink) return final_callback(state.statuses);
                let resetVerification = new ResetVerification();
                let unsubscribeVerification = new UnsubscribeVerification();
                let code = duid.getDUID(4).join("");
                result.batch.entityResults[0].entity.properties.code = { stringValue: code }
                async.waterfall([
                    (callback) => {
                        gapis.datastore.upsert([result.batch.entityResults[0].entity], callback);
                    },
                    (__not_important__, __not_important_2__, callback) => {
                        let id = result.batch.entityResults[0].entity.key.path[0].id;
                        let reset = resetVerification.generateLink({ user: this, id: id, code: code });
                        let unsubscribe = unsubscribeVerification.generateLink({ id: id, code: code });
                        app.mailer.sendResetPassword({ email: username, reset: reset, unsubscribe: unsubscribe, new_password_route: this.getNewPasswordRoute()}, callback);
                    }], final_callback);
            }
        }, null);
    }
    changePassword(coded_username, password, callback) {
        let username = (new ResetVerification).parseUsername(coded_username);
        if (!username) return callback(null, NOT_OK);
        this.findUser(username, (err, result) => {
            if (!result.batch.entityResults.length)
                return callback(null, NOT_OK);
            var state = this.getState(result.batch.entityResults[0].entity);
            if (!state.can.changePassword) return callback(state.statuses);

            bcrypt.hash(password, SALT_LENGTH, (err, hashed_pwd) => {
                if (err) return callback(err);
                result.batch.entityResults[0].entity.properties.hashed_pwd = { stringValue: hashed_pwd };
                (new ResetVerification()).completedSuccessfully(result.batch.entityResults[0].entity);
                gapis.datastore.upsert([result.batch.entityResults[0].entity], callback);
            });
        }, null);
    }
    deleteUser(id, callback) {
        let key = {
            path: [{
                kind: this.REGISTERED_USER_KEY(),
                id: id
            }]
        };
        gapis.datastore.delete([key], callback);
    }
    private registerAux(final_callback, tx, cookieid, username, password, email, args, proto_args, anchor) {
        if (!cookieid || !username || !password || !email)
            return final_callback(new Error('invalid arguments'));
        let code = duid.getDUID(4).join("");
        let new_entity_key;
        let emailVerification = new EmailVerification();
        let unsubscribeVerification = new UnsubscribeVerification();
        let requiresActivation = anchor.email != username;
        async.waterfall([
            (callback) => {
                bcrypt.hash(password, SALT_LENGTH, callback);
            },
            (hashed_pwd, callback) => {
                if (!args) args = {};
                if (requiresActivation) {
                    args.code = code;
                    args._expires = Util.generateExpires(HOURS_BEFORE_REGISTRATION_ACTIVATION_LINK_EXPIRES); //the underscore is for clean-sweeper //The _expires field actually stands for activation_required. bad design :(
                }
                args.how = 'local';
                var entity = this.constructRegisteredUser({
                    cookieid: cookieid,
                    username: username,
                    hashed_pwd: hashed_pwd,
                    email: email,
                    args: args,
                    proto_args: proto_args
                });
                this.onNewRegisteredUser(entity, anchor, (err) => { callback(err, entity); });
            },
            (entity, callback)=>{
                gapis.datastore.insertAutoId([entity], callback, tx);
            },
            (result, __not_important__, callback) => {
                if (!result.mutationResult.insertAutoIdKeys) return callback('Failed to insert new user record into DS');
                if (!requiresActivation) return callback();

                new_entity_key = result.mutationResult.insertAutoIdKeys[0];
                let id = new_entity_key.path[0].id;
                let activate = emailVerification.generateLink({ user: this, id: id, code: code });
                let unsubscribe = unsubscribeVerification.generateLink({ id: id, code: code });
                app.mailer.sendActivation({ email: email, activate: activate, unsubscribe: unsubscribe }, callback);
            }], (err, arg0, arg1) => {
                if (err) {
                    logging.error(err);
                    gapis.datastore.delete([new_entity_key], (err) => { if (err) logging.error(err); });
                }
                else
                    this.finalizeRegistration(anchor, (err) => { if (err) logging.error(err); });
                final_callback(err, arg0, arg1);
            });
    }

    protected upsertUserInfo(id, args, overwrite, callback, DS_KIND?) {
        let kind = DS_KIND || this.REGISTERED_USER_KEY();

        let insertNew = (params, callback) => {
            logging.info('inserting new ' + kind);
            let entity = this.constructRegisteredUser(params);
            gapis.datastore.insertAutoId([entity], callback);
        };
        if (!id) return insertNew({ args: args, DS_KIND: kind }, callback);

        let key = {
            path: [{ kind: kind, id: id }]
        };
        gapis.datastore.lookup([key], (err, result) => {
            if (!err)
                if (result.found.length) {
                    let properties = Util.fromProtoEntity(result.found[0].entity.properties);
                    if (overwrite)
                        properties = Util._merge(properties, args);
                    else
                        properties = Util._merge(args, properties);
                    let proto = {
                        key: key, properties: {}
                    };
                    Util.toProtoEntity(proto.properties, properties);
                    logging.info('updating ' + kind);
                    return gapis.datastore.upsert([proto], (err) => { callback(err); });
                }
                else {
                    return insertNew({ args: args, DS_KIND: kind }, callback);
                }
        });

        
    }

    activateAccount(query, callback) {
        this.findUserBySecretQuery(new EmailVerification(), query, callback);
    }
    resetPassword(query, callback) {
        this.findUserBySecretQuery(new ResetVerification(), query, callback);
    }
    unsubscribe(query, callback) {
        this.findUserBySecretQuery(new UnsubscribeVerification(), query, callback);
    }

    authenticate(req, username, password, final_callback) {
        bcrypt.hash(password, SALT_LENGTH, (err, hashed_pwd) => {
            // this is for seeing how the hashed_pwd looks like for admin users.
            // will be removed after admins will be allowed to add other admins
            return hashed_pwd;
        });

        var user, protoUser;
        async.waterfall([
            (callback) => {
                this.findUser(username, callback, null);
            },
            (results, resultDetails, callback) => {
                if (!results.batch.entityResults.length) return callback(AccountStatus.WRONG_USER);
                protoUser = results.batch.entityResults[0].entity;
                let result = this.getUserFromProto(req, protoUser);

                var state = this.getState(protoUser);
                if (!state.can.authenticate) return callback(state.statuses);
                user = result.user;
                user.id = protoUser.key.path[0].id;
                bcrypt.hash(password, SALT_LENGTH, (err, hashed_pwd) => {
                    logging.info('pwd: ' + hashed_pwd);
                });
                bcrypt.compare(password, result.hashed_pwd, callback);
            }], (err, correct_pwd) => {
                if (err == AccountStatus.WRONG_USER || !correct_pwd)
                    return final_callback(null, false);
                else if (err)
                    return final_callback(err);

                final_callback(null, this.toPassportFormat(req, user));
            });
    }
    toPassportFormat(req, user) {
        let _users_ = {} as any;
        _users_[this.USER_ROUTE()] = user;
        return _.assign({}, req.user, _users_);
    }

    findBy(keyvalue, callback, DS_KIND?) {
        if (!gapis.datastore)
            return setTimeout(this.findBy.bind(this), 300, keyvalue, callback, DS_KIND);
        DS_KIND = DS_KIND || this.REGISTERED_USER_KEY();
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            if (result.batch.entityResults.length) {
                var user = { how: Util.fromProtoEntity(result.batch.entityResults[0].entity.properties).how };
            }
            callback(null, user);
        }
        let gql = 'SELECT * FROM ' + DS_KIND + ' WHERE ' + keyvalue.key + ' = "' + keyvalue.value + '"'; 
        gapis.datastore.runGQLQuery(gql, mid_callback);
    }

    findById(id, callback) {
        let key = {
            path: [{
                kind: this.REGISTERED_USER_KEY(), id: id
            }]
        };
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            if (result.found.length)
                var user = this.getUserFromProto(null, result.found[0].entity).user;
            callback(null, user);
        }
        gapis.datastore.lookup([key], mid_callback);
    }

    isAuthorized(user) {
        return user && !user.$inactive && !user.expectingPasswordChange;
    }
    // A tid bit: I do not check on pre-existing usernames when accepting social login 
    // since FB/G verify those email addrs in the first place => if emails match -> it's the same person.
    socialLogin(params, final_callback) {
        params.profile.ip = Util.getIP(params.req);
        async.waterfall([
            (callback) => {
                params.provider.verify(params.profile.token, callback);
            },
            (data, callback) => {
                // Analyze server token response
                if (!params.provider.isVerified(data, params.profile))
                    return callback(new Error('Token error'));
                this.findAndMerge(params.profile, callback);
            },
            (userObject, callback) => {
                if (userObject) {
                    if (!this.isAuthorized(userObject.user)) return callback(AccountStatus.INACTIVE_ACCOUNT);
                    userObject._found = true;
                    return gapis.datastore.upsert([userObject.proto], (err) => {
                        callback(err, userObject);
                    });
                }
                this.isSocialLoginAllowed(params.profile, (err, allowed, anchor) => {
                    if (err) return callback(err);
                    if (!allowed) return callback(403);
                    var entity = this.constructSocialUser(params.cookie.id, params.profile);
                    this.onNewRegisteredUser(entity, anchor, (err) => { callback(err, entity); });
                });
            },
            (proto, callback) => {
                if (proto._found) return callback(null, proto);// proto IS actually a userObject at this stage. bad design :(

                var mid_callback = (err?, result?) => {
                    if (err) return callback(err);
                    let id = result.mutationResult.insertAutoIdKeys[0].path[0].id;
                    proto.key.path[0].id = id; //so that it dovetails better with the other option (that the user has been _found)
                    let user = Util.fromProtoEntity(proto.properties);
                    callback(null, { user: user, proto: proto });

                }
                return gapis.datastore.insertAutoId([proto], mid_callback, null);
            },
            (userObject, callback) => {
                let id = userObject.proto.key.path[0].id;
                // insert a track record of user log activity
                this.generateUserTraceKey(userObject.proto, id);
                // remove full token from user
                delete userObject.user.token;
                this.finalizeRegistration(userObject.user, (err) => { callback(err, userObject); });
                this.finalizeUserObject(params.req, userObject.user, id);
            },
            (userObject, callback) => {
                this.logSocialUserIntoLocalSystem(params.req, userObject.user, callback);
            }], (err, user) => {
                final_callback(err, err ? null : user);
            });
    }
    logSocialUserIntoLocalSystem(req, user, callback) {
        let passportFormat = this.toPassportFormat(req, user);
        req.login(passportFormat, (err) => {
            logging.info('User logged in using a social account');
            callback(err, user);
        });
    }
    protected getState(proto_original_entity) {
        let statuses = [];
        let can = { sendResetLink: true, activateAccount: true, changePassword: true, authenticate: true } as any;
        let properties = Util.fromProtoEntity(proto_original_entity.properties);
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
        }
    }
    protected findUserBySecretQuery(invoker: QueryVerification, query, final_callback) {
        let data = invoker.decipherQuery(query);

        if (!data) return final_callback(new Error('invalid query'));

        let keys = [{
            path: [{ kind: this.REGISTERED_USER_KEY(), id: data.id }]
        }];

        let userObject = {} as any;
        async.waterfall([
            (callback) => {
                gapis.datastore.lookup(keys, callback);
            },
            (result, __not_important__, callback) => {
                userObject.user = { code: null };
                if (result.found.length) {
                    userObject.user = Util.fromProtoEntity(result.found[0].entity.properties);
                }
                if (userObject.user.code != data.code)
                    return callback(null, null, false); 
                userObject.proto = result.found[0].entity;
                invoker.onRecordFound(userObject);
                gapis.datastore.upsert([userObject.proto], (err, result) => { callback(err, result, true); });
            },
            (result, valid, callback) => {
                callback(null, invoker.getRedirectUrl(this, valid), invoker.getReturnData(userObject));
            }], final_callback);
    }

    protected findAndMerge(profile, callback) {
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            if (!result.batch.entityResults.length) return callback(null, null);
            let proto = result.batch.entityResults[0].entity;
            let user = this.getUserFromProto(null, proto).user;
            user = _.merge({}, user, profile);
            Util.toProtoEntity(proto.properties, user);
            callback(null, { user: user, proto: proto });
        }
        var gql = 'SELECT * FROM ' + this.REGISTERED_USER_KEY() + ' WHERE username = "' + profile.username + '"';
        gapis.datastore.runGQLQuery(gql, mid_callback, null);
    }

    protected getUserFromProto(req, entity){
        let user = Util.fromProtoEntity(entity.properties);
        let hashed_pwd = (user.hashed_pwd || "").toString();
        this.fixMultiplePlaceIdsBug(user);
        this.finalizeUserObject(req, user, entity.key.path[0].id);
        return { user: user, hashed_pwd: hashed_pwd };
    }

    protected fixMultiplePlaceIdsBug(user) {
        if(user.placeids)
            user.placeids = _.uniq(user.placeids);
    }

    protected findUser(username, callback, tx) {
        var gql = 'SELECT * FROM ' + this.REGISTERED_USER_KEY() + ' WHERE username = "' + username + '"'; 
        gapis.datastore.runGQLQuery(gql, callback, tx);
    }

    protected generateUserTraceKey(proto, id) {
        proto.key= {
            path: [{ kind: this.REGISTERED_USER_KEY(), id: id },
                { kind: USER_TRACE_KEY }
            ]
        };

        // update clock
        proto.properties.time = { dateTimeValue: new Date().toISOString() };
        gapis.datastore.insertAutoId([proto], (err) => {
            if (err)
                logging.error(err)
        });

    }
    protected constructRegisteredUser(params) {
        let kind = params.DS_KIND || this.REGISTERED_USER_KEY()
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
        properties = Util.addArgsTo(properties, params.args, params.proto_args);
        Util.filter(properties);
        return { key: key, properties: properties };
    }
    protected constructSocialUser(cookieid, profile) {
        let madeUpHash = (Math.random() * Math.pow(10, 10)).toString();
        let proto_args = { expires: { dateTimeValue: profile.expires } };
        return this.constructRegisteredUser({
            cookieid: cookieid,
            username: profile.username,
            hashed_pwd: madeUpHash,
            email: profile.email,
            args: profile,
            proto_args: proto_args
        });
    }
    protected finalizeUserObject(req, user, id, options?) {
        options = options || {};
        user.id = id;
        user.route = this.USER_ROUTE();
        delete user.hashed_pwd;

        if (!options.forAdmin) {
            for (var key in user)
                if (key[0] == '_internal_')
                    delete user[key];
        }
        user.hash = Util.hash(user);
    }
                    
    getEmailVerificationRedirectUrl() {
        return this.USER_ROUTE();
    }

    getEmailVerificationInvalidUrl() {
        return '/login/invalidactivation';
    }

    getEmailVerificationRoute() {
        return '/login' + this.USER_ROUTE()+'/activation';
    }

    getPasswordResetRoute() {
        return '/login' + this.USER_ROUTE()+'/reset/link';
    }
    getNewPasswordRoute() {
        return '/login' + this.USER_ROUTE() + '/reset/newpassword';
    }
}

export class Facebook implements ISocialLogin{
    is = FACEBOOK;

    verify(token, callback) {
        Util.postHttps('graph.facebook.com', '/oauth/access_token',
            {
                client_id: config.facebook.client_id,
                client_secret: config.facebook.secret,
                grant_type: 'fb_exchange_token',
                fb_exchange_token: token
            }, (data) => {
                callback(null, data);
            });
    }

    isVerified(data, profile) {
        if (_.includes(data[0], 'error'))
            return false;
        profile.token = data[0].match('access_token=(.*)&expires')[1];
        let now = new Date();
        let expires = data[0].match('&expires=(.*)')[1];
        now.setSeconds(parseInt(expires));
        profile.expires = now.toISOString();
        return true;
    }
}

export class Google implements ISocialLogin{
    is = GOOGLE;
    verify(token, callback) {
        let oauth2client = new (new GoogleAuth).OAuth2;
        let audience = config.google.client_id;
        oauth2client.verifyIdToken(token, audience, callback);
    }
    isVerified(data, profile) {
        // no analysis necessary
        return true;
    }

}

export interface ISocialLogin {
    verify(token, callback);
    isVerified(data, profile);
    is;
}

export abstract class QueryVerification {
    abstract getRedirectUrl(user, isValid);
    abstract onRecordFound(recordObject);
    abstract getReturnData(userObject);
    abstract generateLink(data);
    abstract sjcl_password();

    getEncryptedQuery(id, code, pwd) {
        let data = id + KEY_VALUE_SEPARATOR + code;
        let secret = sjcl.encrypt(pwd, data);
        return querystring.stringify(JSON.parse(secret));
    }
    decipherQuery(query) {
        let secret = JSON.stringify(query, (k, v) => {
            return (_.isString(v) && /(^\d+$)/.test(v)) ? parseInt(v) : v;
        });
        let data = sjcl.decrypt(this.sjcl_password(), secret);
        let arr = data.split(KEY_VALUE_SEPARATOR);
        let id = arr[0];
        let code = arr[1];
        if (!id || !code)
            return null;
        return { id: id, code: code };
    }
}
export class EmailVerification extends QueryVerification {
    sjcl_password() {
        return config.sjcl.passwords.accountActivation;
    }

    getRedirectUrl(user, isValid) {
        if (!isValid) return user.getEmailVerificationInvalidUrl();
        return user.getEmailVerificationRedirectUrl();
    }

    onRecordFound(recordObject) {
        delete recordObject.proto.properties._expires;
        delete recordObject.proto.properties.code;
    }

    getReturnData(userObject) {
        return userObject.user;
    }
    generateLink(data) {
        let query = this.getEncryptedQuery(data.id, data.code, this.sjcl_password());
        return config.dns + data.user.getEmailVerificationRoute() + '?' +query;
    }
}

export class UnsubscribeVerification extends QueryVerification {
    sjcl_password() { return config.sjcl.passwords.unsubscribe; }
    getRedirectUrl(user, isValid) {
        if (!isValid) return '/unsubscribe/failure';
        return '/unsubscribe/success';
    }
    onRecordFound(recordObject) {
        delete recordObject.proto.properties.code;
        gapis.datastore.upsert([this.constructBlacklisted(recordObject.properties.email)], (err) => { if (err) logging.error(err); });
    }
    getReturnData(userObject) { }

    private constructBlacklisted(email) {
        return {
            key: {
                path: [{ kind: BLACK_LISTED_EMAIL_KEY, name:email }]
            },
            properties: {
            }
        }
    }
    generateLink(data) {
        let query = this.getEncryptedQuery(data.id, data.code, this.sjcl_password());
        return config.dns + '/unsubscribe?' + query;
    }
}

export class ResetVerification extends QueryVerification {
    sjcl_password() { return config.sjcl.passwords.passwordReset; }
    getRedirectUrl(user, isValid) {
        return isValid;
    }
    onRecordFound(recordObject) {
    }
    completedSuccessfully(entity) {
        delete entity.properties.code;
        entity.properties.expectingPasswordChange = { booleanValue: true };
    }
    getReturnData(userObject) {
        return sjcl.encrypt(config.sjcl.passwords.username, userObject.user.username);
    }

    parseUsername(coded_username) {
        return sjcl.decrypt(config.sjcl.passwords.username, coded_username);
    }
    generateLink(data) {
        let query = this.getEncryptedQuery(data.id, data.code, this.sjcl_password());
        return config.dns + data.user.getPasswordResetRoute()+ '?' + query;
    }
}


