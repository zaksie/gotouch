import {Datastore} from './datastore';
import {CloudStorage} from './storage';
import {GooglePubSub} from './pubsub';
import {Compute} from './compute';
import {logging, config} from '../../app';

export module Google {
    var async = require('async');
    var _ = require('lodash');
    var path = require('path');
    var SCOPES = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/datastore'
    ];

    export class GAPIs {
        public config;
        public credentials;
        public projectId;
        public gcloud;
        public googleapis;

        public datastore;
        public storage;
        public pubsub;
        public gce;

        constructor(options = {}) {
            this.config = config;
            this.projectId = config.gcloud.projectId;
            var key = require("path").join(__dirname, '../..', config.gcloud.credentials);
            this.gcloud = require('gcloud')({
                projectId: this.projectId,
                keyFilename: key
            });

            this.googleapis = require('googleapis');
            this.googleapis.auth.getApplicationDefault(function (err, authClient) {
                if (err) {
                    logging.error(err);
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
                else logging.error('authClient.createScopedRequired - undefined');

            }.bind(this));
        }
        initModules(options) {
            this.datastore = new Datastore(this);
            if (options.mini)
                return;
            this.gce = new Compute(this);
            this.storage = new CloudStorage(this);
            this.pubsub = new GooglePubSub(this);
        }
    }
}
