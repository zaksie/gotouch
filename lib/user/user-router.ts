import {logging, gapis, config, app, duid} from '../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
import PubSub = require('pubsub-js');
import {BLACK_LISTED_EMAIL_KEY} from '../service/mailer';
import {User} from './user';
import {UserClient, CLIENT_USER_ROUTE} from './client/user-client';
import {UserPOS, POS_USER_ROUTE} from './pos/user-pos';
import {UserAdmin, ADMIN_USER_ROUTE} from './admin/user-admin';
var bcrypt = require('bcrypt');
var async = require('async');
var _ = require('lodash');

const USERS = [new UserClient(), new UserPOS(), new UserAdmin()]
export class UserRouter {
    ofType(type) {
        if (type[0] != '/')
            type = '/' + type;
        let throwErr = () => {
            throw new Error('Invalid type in UserRouter');
        };
        return _.find(USERS, (u) => {
            return type == u.USER_ROUTE();
        }) || throwErr();
    }

    find(usermap, final_callback) {
        if (!gapis.datastore)
            return setTimeout(this.find.bind(this), 300, usermap, final_callback);
        let users = {}
        var q = async.queue((user_id, queue_callback) => {
            if (!user_id || !_.isString(user_id.route))
                return queue_callback('Invalid user');
            async.waterfall([
                (callback) => {
                    this.ofType(user_id.route).findById(user_id.id, callback);
                }, (user, callback) => {
                    let authorized = this.ofType(user_id.route).isAuthorized(user);
                    callback(null, authorized ? user : null);
                }], queue_callback);

        });

        q.drain = () => {
            final_callback(null, Object.keys(users).length ? users : null);
        }

        _.forEach(usermap, (user_id) => {
                q.push(user_id, (err, user) => {
                    if (err)
                        logging.error(err);
                    else if (user)
                        users[user.route] = user;
                });
        });
    }

}

