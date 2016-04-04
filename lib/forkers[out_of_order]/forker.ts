import {Util} from '.../service/utils';
import {BusinessFork} from './business-fork';
import PubSub = require('pubsub-js');
var _ = require('lodash');
var async = require('async');
var cp = require('child_process');


export class Forker {
    businessForks = [];
    business = {
        fetchMatchingEntities: (placeidsObj, yield_cb, final_cb) => {
            let fork = this.find(this.businessForks);
            fork.fetchMatchingEntities(placeidsObj, yield_cb, final_cb);
        }
    };
    constructor() {
        this.businessForks.push(new BusinessFork());
    }
    find(forks) {
        let free_fork = _.find(forks, (f) => {
            return f.isFree();
        });

        if (!free_fork) {
            free_fork = new BusinessFork();
            this.businessForks.push(free_fork);
        }

        return free_fork;
    }

}

