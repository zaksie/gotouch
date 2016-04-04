import {WebWorker, Progress} from '../../../public/app.common/workers/webworker';
declare var importScripts, io, postMessage, onmessage;

export abstract class MenuWorker extends WebWorker {
    RECEIVE_MESSAGE() {
        return 'menu-update';
    }

    name() {
        return 'Menu';
    }
    clearPreviousData() { }
}
