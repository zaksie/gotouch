declare var postMessage;

import {UserManagerWorker} from '../../../public/app.common/workers/user-manager-webworker';

export class AdminUserManagerWorker extends UserManagerWorker {
    REQUEST_MESSAGE() {
        return 'request-users';
    }
    RECEIVE_MESSAGE() {
        return 'receive-user-batch';
    }
    isReady() {
        return true;
    }
}


