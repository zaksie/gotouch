import {logging, gapis, config, client, duid, app} from '../../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../../service/utils';
import {BUSINESS_KEY} from '../../business/business';

var async = require('async');
var _ = require('lodash');

const APPROVED_ORDER_KEY = 'ApprovedOrder';
const APPROVED_ORDER_ACK_KEY = 'ApprovedOrderAck';

export class ApprovedOrder {

    fetchFor(placeids, yield_callback, final_callback) {
        var q = async.queue((placeid, callback) => {
            this.fetchForAux(placeid, yield_callback, callback);
        });

        q.drain = () => {
            final_callback();
        }

        placeids.forEach((placeid) => {
            q.push(placeid, function (err, tab) {
                if (err)
                    return logging.error(err)
            });
        });
    }
    private fetchForAux(placeid, yield_callback, callback) {
        let gql = 'SELECT * FROM ' + APPROVED_ORDER_KEY + ' WHERE __key__ HAS ANCESTOR Key(' + BUSINESS_KEY + ',"' + placeid + '")';
        gapis.datastore.runGQLQuery(gql, (err, results) => {
            if (err) return callback(err);
            if (!results.batch.entityResults.length) return callback('No entries found');
            _.forEach(results.batch.entityResults, (r) => {
                let item = Util.fromProtoEntity(r.entity.properties);
                let tab = JSON.parse(item.tab);
                tab.id = r.entity.key.path[1].id;
                tab.hash = item.hash;
                yield_callback(tab);
            });
            callback();
        });
    }

    storeApprovedOrderInDS(tab, callback) {
        let entity = this.constructApprovedOrderEntity(tab);
        gapis.datastore.insertAutoId([entity], (err, result) => {
            if (result) {
                tab.id = result.mutationResult.insertAutoIdKeys[0].path[1].id;
                tab.hash = entity.properties.hash.stringValue;
            }
            callback(err, tab);
        });
    }

    storeApprovedOrderAck(tab, data, callback) {
        let key = this.constructApprovedOrderAckKey(tab.placeid, tab.id, data.socketid);
        let properties = {};
        Util.toProtoEntity(properties, { time: (new Date()).toISOString() });

        gapis.datastore.upsert([{ key: key, properties: properties }], callback);
    }
    private constructApprovedOrderAckKey(placeid, tabid, socketid) {
        return {
            path: [{ kind: BUSINESS_KEY, name: placeid },
                { kind: APPROVED_ORDER_KEY, id: tabid },
                { kind: APPROVED_ORDER_ACK_KEY, name: socketid }]
        };
    }
    private constructApprovedOrderEntity(tab) {
        let key = {
            path: [{ kind: BUSINESS_KEY, name: tab.placeid },
                { kind: APPROVED_ORDER_KEY }]
        };
        let time = new Date().toISOString();
        let properties;
        let tabstring = JSON.stringify(tab);
        properties = {
            tab: { stringValue: tabstring, indexed: false },
            hash: { stringValue: Util.hash(tabstring) },
            time: { dateTimeValue: time },
        };

        Util.filter(properties);

        return { key: key, properties: properties };
    }
}
