var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var gapis;
var GooglePubSub = (function () {
    function GooglePubSub(gapisInstance) {
        var _this = this;
        gapis = gapisInstance;
        this.instance = gapis.gcloud.pubsub();
        utils_1.Util.getInstanceUUID(function (uuid) {
            _this.MACHINE_UUID = uuid;
            app_1.logging.info('Google Pub/Sub configured using UUID: ' + uuid);
            PubSub.publish('GooglePubSub.ready', true);
        });
    }
    GooglePubSub.prototype.getTopic = function (topic_name, callback) {
        var topic = this.instance.topic(topic_name);
        topic.get({ autoCreate: true }, callback);
    };
    GooglePubSub.prototype.subscribe = function (topic, subscription_name, callback) {
        topic.subscription(subscription_name + '~' + this.MACHINE_UUID, { autoAck: true })
            .get({ autoCreate: true }, callback);
    };
    GooglePubSub.prototype.deleteAllSubscriptions = function () {
        var _this = this;
        var callback = function (err, subscriptions, nextQuery, apiResponse) {
            _.forEach(subscriptions, function (s) {
                app_1.logging.info('Deleting subscription: ' + s.id);
                s.delete(function (err, apiResponse) {
                    if (err)
                        app_1.logging.error(err);
                });
            });
            if (nextQuery) {
                // More results exist.
                _this.instance.getSubscriptions(nextQuery, callback);
            }
        };
        this.instance.getSubscriptions({
            autoPaginate: false,
            pageSize: 100
        }, callback);
    };
    return GooglePubSub;
})();
exports.GooglePubSub = GooglePubSub;
//# sourceMappingURL=pubsub.js.map