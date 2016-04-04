import {logging, config} from '../../app';
import {Util} from '../service/utils';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var gapis;

export class GooglePubSub {
    instance;
    MACHINE_UUID;
    constructor(gapisInstance) {
        gapis = gapisInstance;
        this.instance = gapis.gcloud.pubsub();
        Util.getInstanceUUID((uuid) => {
            this.MACHINE_UUID = uuid;
            logging.info('Google Pub/Sub configured using UUID: ' + uuid);
            PubSub.publish('GooglePubSub.ready', true);
        });
    }

    getTopic(topic_name, callback) {
        var topic = this.instance.topic(topic_name);
        topic.get({ autoCreate: true }, callback);
    }

    subscribe(topic, subscription_name, callback) {
        topic.subscription(subscription_name + '~' + this.MACHINE_UUID, { autoAck: true })
            .get({ autoCreate: true }, callback);
    }

    deleteAllSubscriptions() {
        var callback = (err, subscriptions, nextQuery, apiResponse) => {
            _.forEach(subscriptions, (s) => {
                logging.info('Deleting subscription: ' + s.id);
                s.delete(function (err, apiResponse) {
                    if (err)
                        logging.error(err);
                });
            });
            if (nextQuery) {
                // More results exist.
                this.instance.getSubscriptions(nextQuery, callback);
            }
        };

        this.instance.getSubscriptions({
            autoPaginate: false,
            pageSize: 100
        }, callback);
    }
}
