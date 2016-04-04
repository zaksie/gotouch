var gapis_1 = require('../gapis');
exports.PubSub = require('pubsub-js');
exports._ = require('lodash');
exports.async = require('async');
exports.cp = require('child_process');
exports.logging = require('../logging')();
var AbstractForker = (function () {
    function AbstractForker() {
        var _this = this;
        this.app = {};
        this.gapis = new gapis_1.Google.GAPIs();
        this.counter = new Counter();
        this.init();
        process.on('message', function (msg) {
            if (msg.substring(0, 2) == 'new')
                _this.counter.inc();
        });
    }
    return AbstractForker;
})();
exports.AbstractForker = AbstractForker;
var Counter = (function () {
    function Counter() {
        this.counter = 0;
    }
    Counter.prototype.inc = function () {
        return ++this.counter;
    };
    Counter.prototype.dec = function () {
        return --(this.counter);
    };
    Counter.prototype.get = function () {
        return this.counter;
    };
    return Counter;
})();
exports.Counter = Counter;
//# sourceMappingURL=abstract-forker.js.map