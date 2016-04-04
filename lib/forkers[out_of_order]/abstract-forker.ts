import {Util} from '.../service/utils';
import {Google} from '../gapis';
export var PubSub = require('pubsub-js');
export var _ = require('lodash');
export var async = require('async');
export var cp = require('child_process');
export var logging = require('../logging')();

export abstract class AbstractForker {
    app = {};
    gapis = new Google.GAPIs();
    counter = new Counter();

    constructor() {
        this.init();
        process.on('message', (msg) => {
            if (msg.substring(0, 2) == 'new')
                this.counter.inc();
        });
    }

    abstract init();
}

export class Counter {
    private counter = 0;
    inc() {
        return ++this.counter;
    }

    dec() {
        return --(this.counter);
    }
    get() {
        return this.counter;
    }
}