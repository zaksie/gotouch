import {WebWorker, Progress} from '../../../public/app.common/workers/webworker';
declare var importScripts, io, postMessage, onmessage;

export abstract class TabWorker extends WebWorker {
    open = [];
    closed = [];
    name() {
        return 'Tab';
    }
    clearPreviousData() {
        //TODO: see if its ok to override all previous data
        this.open = [];
        this.closed = [];
    }
    isReady() {
        return true;
    }
}
