import {logging, gapis, config, client} from '../../../app';
import {Util} from '../../service/utils';
var async = require('async');
var _ = require('lodash');

export const UNREGISTERED_USER_KEY = 'UnregisteredUser';
export class GenericUser {

    open(cookie, callback) {
        if (!cookie.id) return callback('Invalid cookie id');
        if (!gapis.datastore) return callback('Websockets you be quick as the Devil!');

        logging.info('in GenericUser.open with cookie id: ' + cookie.id);
        gapis.datastore.startTransaction(this.openUserAux.bind(this), (err, result) => {
            if (err)
                logging.error(err);
            else
                logging.info('upserted user: ' + result);
            callback(err, result);
        }, cookie);
    }

    private openUserAux(main_callback, tx, cookie) {
        async.waterfall([
            (callback) => {
                this.findUser(cookie, callback, tx);
            },
            (result, detailedResults, callback) => {
                let userExists = result.found.length > 0;

                if (!userExists) {
                    var entities = [];
                    entities.push(this.constructUser(cookie));
                    return gapis.datastore.upsert(entities, callback, tx);
                }

                callback(null)
            },
            (callback) => {
                var entities = [];
                return gapis.datastore.insertAutoId(entities, callback, tx);
            }
        ], main_callback);
    }

    private constructKey(cookie) {
        return {
            path: [{ kind: UNREGISTERED_USER_KEY, name: cookie.id }]
        };
    }
    private findUser(cookie, callback, tx) {
        var keys = [this.constructKey(cookie)];
        gapis.datastore.lookup(keys, callback, tx);
    }

    private constructUser(cookie) {
        var key = this.constructKey(cookie);

        var time = new Date().toISOString();
        var properties = {
            // TODO: removed for now
            //location_lat: { doubleValue: data.location.lat },
            //location_lon: { doubleValue: data.location.lon },
            location_time: { dateTimeValue: time}
        };

        Util.filter(properties);

        return { key: key, properties: properties };
    }

}
