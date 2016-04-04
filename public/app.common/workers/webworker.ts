declare var importScripts, io, postMessage, onmessage;
importScripts('/node_modules/socket.io-client/socket.io.js', '/public/js/lodash.min.js');

export enum Progress { START = 1, ONGOING, COMPELETE};
export abstract class WebWorker {
    abstract REQUEST_MESSAGE();
    abstract RECEIVE_MESSAGE();
    abstract clearPreviousData();

    socket;
    percent = 0;
    step = 1/47;// TODO: THIS IS  A DUMMY VARIABLE. A MECHANISM FOR SHOWING PROGRESS IS REQUIRED
    finished_fetching = false; 
    controller;
    parentSubscribers = {};
    abstract name();
    constructor(controller) {
        this.controller = controller;
        this.socket = controller.getSocket();
        this.init();
        this.postConstructorDoneMessage();
    }
    
    subscribeToModule(subscribers) {
        this.parentSubscribers = _.assign(subscribers, this.parentSubscribers);
    }

    postConstructorDoneMessage() {
        postMessage([this.name() + '.ready']);
    }

    init() {
        this.socket.on(this.RECEIVE_MESSAGE(), this.onReceive.bind(this));
        this.socket.on(this.RECEIVE_MESSAGE() + '-end', this.onReceiveEnd.bind(this));
        this.socket.on(this.RECEIVE_MESSAGE() + '-error', this.onReceiveError.bind(this));
        let subscribers = {};
        subscribers['onRequest' + this.name()] = this.onRequest.bind(this)
        this.subscribeToModule(subscribers);
    }

    incrementProgress(state: Progress) {
        switch (state) {
            case Progress.COMPELETE:
                this.percent = 100;
                this.finished_fetching = true;
                break;
            case Progress.START:
                this.percent = 1;
                this.finished_fetching = false;
                break;
            case Progress.ONGOING:
                this.percent += this.step;
                this.finished_fetching = false;
        }
        postMessage([this.name() + '.progress', this.percent]);
    }
    onReceive(data) {
        this.incrementProgress(Progress.ONGOING);
        postMessage([this.name() + '.received', data]);
    }
    onReceiveEnd(data) {
        postMessage([this.name() + '.received.end', data]);
        this.done();
    }

    onReceiveError() {
        postMessage([this.name() + '.received.error']);
        this.done();
    }
    done() {
        this.incrementProgress(Progress.COMPELETE);
    }
    onRequest(data) {
        if (this.socket && this.REQUEST_MESSAGE())
            this.request(data);
    }
    request(data?) {
        this.incrementProgress(Progress.START);
        return this.socket.emit(this.REQUEST_MESSAGE(), data);
    }

    abstract isReady();
}
