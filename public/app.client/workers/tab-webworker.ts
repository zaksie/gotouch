declare var postMessage;

import {TabWorker} from '../../../public/app.common/workers/tab-webworker';

export class ClientTabWorker extends TabWorker {
    REQUEST_MESSAGE() {
        return 'request-open-tabs';
    }
    RECEIVE_MESSAGE() {
        return 'receive-open-tab';
    }

    init() {
        super.init();
    }
}


