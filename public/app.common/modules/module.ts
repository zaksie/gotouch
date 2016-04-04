import {ModuleController} from '../../../public/app.common/modules/module-controller';
import {Base} from '../../../public/app.common/modules/base';

export abstract class Module extends Base{
    protected controller: ModuleController;
    workerSubscribers = {};
    fetchInProgress;
    current;
    constructor(controller: ModuleController) {
        super();
        this.controller = controller;
        this.worker = controller.worker;
        let subscriptions = {};
        subscriptions[this.name() + '.ready'] = this.onReady.bind(this);
        subscriptions[this.name() + '.received'] = this.onFetchReceived.bind(this);
        subscriptions[this.name() + '.received.end'] = this.onFetchEnd.bind(this);
        subscriptions[this.name() + '.received.error'] = this.onFetchError.bind(this);
        subscriptions[this.name() + '.progress'] = this.onLoadingProgress.bind(this);
        this.subscribeToWorker(subscriptions);
        this.init();
    }
    subscribeToWorker(subscriptions) {
        for (var s in subscriptions)
            this.workerSubscribers[s] = subscriptions[s];
    }

    abstract init();
    refresh() {
        this.request();
    }
    abstract save();
    protected abstract getDefaultLocals();
    protected saveAux(array, id) {
        _.forEach(array, (item) => {
            if (!localStorage) return;
            let existingStringified = localStorage[item[id]];
            let locals = {};
            if (existingStringified)
                locals = JSON.parse(existingStringified);
            _.assign(locals, item.locals);
            localStorage[item[id]] = JSON.stringify(locals);
        });
    }
    abstract clearPreviousData();

    request(data?) {
        this.clearPreviousData();
        this.fetchInProgress = true;
        this.postMessage(['onRequest' + this.name(), data]);
    }
    onLoadingProgress(data) {
        return PubSub.publish('Loading.progress.' + this.name(), data);
    }
    onFetchReceived(data) {
    }

    onFetchEnd(data) {
        this.fetchInProgress = false;
    }

    onFetchError(data) {
        this.fetchInProgress = false;
    }
}