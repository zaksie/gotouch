var datastore_1 = require('./datastore');
var storage_1 = require('./storage');
var pubsub_1 = require('./pubsub');
var compute_1 = require('./compute');
var app_1 = require('../../app');
var Google;
(function (Google) {
    var async = require('async');
    var _ = require('lodash');
    var path = require('path');
    var SCOPES = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/datastore'
    ];
    var GAPIs = (function () {
        function GAPIs(options) {
            if (options === void 0) { options = {}; }
            this.config = app_1.config;
            this.projectId = app_1.config.gcloud.projectId;
            var key = require("path").join(__dirname, '../..', app_1.config.gcloud.credentials);
            this.gcloud = require('gcloud')({
                projectId: this.projectId,
                keyFilename: key
            });
            this.googleapis = require('googleapis');
            this.googleapis.auth.getApplicationDefault(function (err, authClient) {
                if (err) {
                    app_1.logging.error(err);
                    return;
                }
                // The createScopedRequired method returns true when running on GAE or a local developer
                // machine. In that case, the desired scopes must be passed in manually. When the code is
                // running in GCE or a Managed VM, the scopes are pulled from the GCE metadata server.
                // See https://cloud.google.com/compute/docs/authentication for more information.
                if (authClient.createScopedRequired && authClient.createScopedRequired()) {
                    // Scopes can be specified either as an array or as a single, space-delimited string.
                    this.credentials = authClient.createScoped(SCOPES);
                    this.initModules(options);
                }
                else
                    app_1.logging.error('authClient.createScopedRequired - undefined');
            }.bind(this));
        }
        GAPIs.prototype.initModules = function (options) {
            this.datastore = new datastore_1.Datastore(this);
            if (options.mini)
                return;
            this.gce = new compute_1.Compute(this);
            this.storage = new storage_1.CloudStorage(this);
            this.pubsub = new pubsub_1.GooglePubSub(this);
        };
        return GAPIs;
    })();
    Google.GAPIs = GAPIs;
})(Google = exports.Google || (exports.Google = {}));
//# sourceMappingURL=gapis.js.map