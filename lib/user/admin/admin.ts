import {logging, config, gapis, app, pos} from '../../../app';
import {Util} from '../../service/utils';
import {Endpoint} from '../endpoint';
import {BUSINESS_KEY} from '../../business/business';
import {ADMIN_USER_ROUTE} from './user-admin';
import {POS_USER_ROUTE} from '../pos/user-pos';
import PubSub = require('pubsub-js');
import {CONST} from '../../service/CONST';
var _ = require('lodash');
var async = require('async');

const UNREGISTERED_POS_ACCOUNT_EXPIRY_HOURS = 24 * 14;
export class Admin extends Endpoint {
    public DisconnectUserTopic;
    constructor() {
        super();
        PubSub.subscribe('GooglePubSub.ready', this.initGooglePubSubTopics.bind(this));
    }

    initGooglePubSubTopics() {
        gapis.pubsub.getTopic(CONST.gPubSub.DisconnectUser, (err, topic) => {
            if (err)
                return logging.error(err);
            this.DisconnectUserTopic = topic;

            PubSub.publish(CONST.PubSub.TopicDisconnectUserReady, null);
        });

        
    }
    // @Implements
    ROUTE() {
        return ADMIN_USER_ROUTE;
    }    

    getPOSUsers(batch_callback, final_callback) {
        async.series([
            (callback) => {
                app.twilio.fetchAllCodeEntries(POS_USER_ROUTE, (err, results) => {
                    if (!err && results)
                        batch_callback(results);
                    callback(err);
                });
            },
            (callback) => { app.user.ofType(POS_USER_ROUTE).fetchAll(batch_callback, callback); }],
            final_callback);
    }
    getBusinesses(batch_callback, final_callback) {
        app.business.fetchAll(batch_callback, final_callback, { partial: true });
    }

    getBusinessHash(yield_callback, callback) {
        app.business.getHashOfGoogleInfoRecords(yield_callback, callback);
    }

    sendSMSCodeToPOSUser(body, callback) {
        try {
            body.name = ' ' + body.name;
            let subject = '% - your yummlet POS access code';
            async.waterfall([
                (callback) => {
                    body.subject = subject;
                    body.kind = POS_USER_ROUTE;
                    body.code;
                    app.twilio.sendCode(body, callback, { createIfNotFound: true });
                }], (err, result) => {
                    callback(err);
                });
        } catch (e) {
            callback(e);
        }
    }

    upsertPosUser(body, callback) {
        (new UpsertUserAction()).act(body, callback);
    }

    deletePOSUser(user, callback) {
        (new DeleteUserAction()).act(user, (err) => {
            if (err) return logging.error(err);
            this.disconnectPOSUser(user, callback);
        });

    }
    deactivatePOSUser(user, value, callback) {
        if(value)
            (new DeactivateAction()).act(user, (err) => {
                if (err) return logging.error(err);
                this.disconnectPOSUser(user, callback);
            });
        else
            (new ReactivateAction()).act(user, callback);
    }

    disconnectPOSUser(user, callback) {
        if (this.DisconnectUserTopic)
            this.DisconnectUserTopic.publish({ data: "disconnect" }, (err) => {
                if (err) return logging.error(err);
            });
    }

    protected canUpdateMedia() {
        return true;
    }

    protected canDeleteMedia() {
        return true;
    }

}
function generateCodeForPOSUser(params) {
    let formatted = Util.generateRandomCaseInsensitive('xxxx - xxxx');
    params.formatted_code = params.formatted_code || formatted;
    params.code = app.twilio.sanitizeSMSCode(params.formatted_code);
}
abstract class AbstractAction {
    pre(params) { }
    abstract caseUser(params, callback);
    abstract caseSMSCode(params, callback);
    post(result, params) { return result;}

    act(params, final_callback) {
        async.waterfall([
            (callback) => {
                this.pre(params);
                if (!params.id) return callback(null, null);
                app.user.ofType(POS_USER_ROUTE).findById(params.id, callback);
            },
            (user, callback) => {
                if (user)
                    return this.caseUser(params, callback);
                if (!params.code) return callback('Invalid parameters');
                this.caseSMSCode(params, callback);
            }], (err, result) => {
                if(!err)
                    result = this.post(result, params);
                final_callback(err, err ? null : result);
            });
    }
}

class UpsertUserAction extends AbstractAction {
    pre(params) {
        let businesses = _.uniq(JSON.parse(params.businesses), (b) => { return b.placeid });
        params.placeids = _.map(businesses, (b) => { return b.placeid; }),
        delete params.businesses;
        if(!params.formatted_code)
            generateCodeForPOSUser(params);
    }
    caseUser(params, callback) {
        app.user.ofType(POS_USER_ROUTE).upsertUserInfo(params.id, params, true, callback);
    }
    caseSMSCode(params, callback) {
        params.expiry_options = { hours: UNREGISTERED_POS_ACCOUNT_EXPIRY_HOURS };
        app.twilio.upsertCodeEntry(params.code, POS_USER_ROUTE, params, callback);
    }
    post(result, params) {
        return { id: result, code: params.code };
    }
}

class DeleteUserAction extends AbstractAction {
    caseUser(params, callback) {
        app.user.ofType(POS_USER_ROUTE).deleteUser(params.id, callback);
    }
    caseSMSCode(params, callback) {
        app.twilio.deleteCodeEntry(params.code, POS_USER_ROUTE, callback);
    }
}

class DeactivateAction extends UpsertUserAction {
    pre(params) {
        params.$inactive = true;
    }
}

class ReactivateAction extends UpsertUserAction {
    pre(params) {
        params.$inactive = false;
    }
}
