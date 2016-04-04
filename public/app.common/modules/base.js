var Base = (function () {
    function Base() {
        this.ready = false;
        this.commandQueueTillSystemIsReady = [];
    }
    Base.prototype.onReady = function (data) {
        this.ready = true;
        //console.log(this.name() + ' is ready. calling ' + this.commandQueueTillSystemIsReady.length+ ' functions...');
        this.commandQueueTillSystemIsReady.forEach(function (item) {
            item.f(item.data);
        });
        this.commandQueueTillSystemIsReady.length = 0;
    };
    Base.prototype.isReady = function (params) {
        return this.ready;
    };
    Base.prototype.postMessage = function (commandArray) {
        if (!_.isArray(commandArray))
            commandArray = [commandArray];
        if (!this.ready)
            this.callWhenReady(this.postMessage.bind(this), commandArray);
        else
            this.worker.postMessage(commandArray);
    };
    Base.prototype.callWhenReady = function (next, params) {
        if (this.isReady(params))
            next(params);
        else
            setTimeout(this.callWhenReady.bind(this), 1000, next, params);
    };
    return Base;
})();
exports.Base = Base;
//# sourceMappingURL=base.js.map