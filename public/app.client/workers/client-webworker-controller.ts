import {WorkerController} from '../../../public/app.common/workers/worker-controller';
import {ClientBusinessWorker} from '../../../public/app.client/workers/business-webworker';
import {ClientTabWorker} from '../../../public/app.client/workers/tab-webworker';
import {ClientMenuWorker} from '../../../public/app.client/workers/menu-webworker';

export const ROUTE = '/diners';
export class ClientWorkerController extends WorkerController {
    ROUTE() { return ROUTE; }
    name() { return 'ClientWorkerController'; }

    constructor() {
        super();
        this.modules = _.assign({}, this.modules, {
            business: new ClientBusinessWorker(this),
            tab: new ClientTabWorker(this),
            menu: new ClientMenuWorker(this)
        });
    }
}