﻿declare var postMessage;

import {BusinessWorker} from '../../../public/app.common/workers/business-webworker';

export class ClientBusinessWorker extends BusinessWorker {
    REQUEST_MESSAGE() {
        return 'request-businesses';
    }
    RECEIVE_MESSAGE() {
        return 'receive-business';
    }
}

