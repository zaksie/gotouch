import {logging, config} from '../../app';
import {Util} from '../service/utils';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var gapis;
export class Compute {
    gce;
    constructor(gapisInstance) {
        gapis = gapisInstance;
        this.gce = gapis.gcloud.compute();
        logging.info('Google Compute Engine configured');
        PubSub.publish('GCE.ready', true);
    }

    
}
