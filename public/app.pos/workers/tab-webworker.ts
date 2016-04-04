declare var postMessage;

import {TabWorker} from '../../../public/app.common/workers/tab-webworker';

export class POSTabWorker extends TabWorker {
    REQUEST_MESSAGE() {
        return 'request-open-tabs';
    }
    RECEIVE_MESSAGE() {
        return 'receive-open-tab';
    }

    init() {
        super.init();
        this.socket.on('order-approved', (tab, callback) => {
            callback(200, this.socket.id);
            postMessage(['Tab.approved', tab]);
        });
    }
}


