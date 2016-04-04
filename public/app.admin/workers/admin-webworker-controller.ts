import {WorkerController} from '../../../public/app.common/workers/worker-controller';
import {AdminBusinessWorker} from '../../../public/app.admin/workers/business-webworker';
import {AdminUserManagerWorker} from '../../../public/app.admin/workers/user-manager-webworker';

export class AdminWorkerController extends WorkerController {
    ROUTE() { return '/admins'; }
    name() { return 'AdminWorkerController'; }

    constructor() {
        super();
        this.modules = _.assign({}, this.modules, {
            business: new AdminBusinessWorker(this),
            user_manager: new AdminUserManagerWorker(this),
        });
    }
}