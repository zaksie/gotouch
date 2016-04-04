export abstract class Base {
    ready = false;
    commandQueueTillSystemIsReady = [];
    worker;
    abstract name();
    abstract init();
    abstract refresh();

    onReady(data) {
        this.ready = true;
        //console.log(this.name() + ' is ready. calling ' + this.commandQueueTillSystemIsReady.length+ ' functions...');
        this.commandQueueTillSystemIsReady.forEach((item) => {
            item.f(item.data);
        });
        this.commandQueueTillSystemIsReady.length = 0;
    }
    isReady(params) {
        return this.ready;
    }
    postMessage(commandArray) {
        if (!_.isArray(commandArray))
            commandArray = [commandArray];
        if (!this.ready)
            this.callWhenReady(this.postMessage.bind(this), commandArray);
        else
            this.worker.postMessage(commandArray);
    }
    callWhenReady(next, params?) {
        if (this.isReady(params))
            next(params);
        else
            setTimeout(this.callWhenReady.bind(this), 1000, next, params);
    }
}