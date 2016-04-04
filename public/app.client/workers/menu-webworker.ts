declare var postMessage;

import {MenuWorker} from '../../../public/app.common/workers/menu-webworker';

export class ClientMenuWorker extends MenuWorker {
    REQUEST_MESSAGE() {
        return 'request-menu';
    }
    RECEIVE_MESSAGE() {
        return 'receive-menu';
    }

    isReady() {
        return true;
    }
}

