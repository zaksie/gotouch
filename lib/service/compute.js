var app_1 = require('../../app');
var PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var gapis;
var Compute = (function () {
    function Compute(gapisInstance) {
        gapis = gapisInstance;
        this.gce = gapis.gcloud.compute();
        app_1.logging.info('Google Compute Engine configured');
        PubSub.publish('GCE.ready', true);
    }
    return Compute;
})();
exports.Compute = Compute;
//# sourceMappingURL=compute.js.map