import {WorkerController} from '../../../public/app.common/workers/worker-controller';
import {POSBusinessWorker} from '../../../public/app.pos/workers/business-webworker';
import {POSTabWorker} from '../../../public/app.pos/workers/tab-webworker';
import {POSMenuWorker} from '../../../public/app.pos/workers/menu-webworker';

export class POSWorkerController extends WorkerController {
    ROUTE() { return '/chefs'; }
    name() { return 'POSWorkerController'; }

    constructor() {
        super();
        this.modules = _.assign({}, this.modules, {
            business: new POSBusinessWorker(this),
            tab: new POSTabWorker(this),
            menu: new POSMenuWorker(this)
        });
    }
}