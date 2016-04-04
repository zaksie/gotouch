import {ModuleController} from '../../../public/app.common/modules/module-controller';
import {CommonUserModule} from '../../../public/app.common/modules/user-module';
import {ClientBusinessModule} from '../../../public/app.client/modules/business-module';
import {ClientTabModule} from '../../../public/app.client/modules/tab-module';
import {ClientMenuModule} from '../../../public/app.client/modules/menu-module';

export class ClientController extends ModuleController {
    ROUTE() { return '/diners'; }
    workerUrl() { return '/public/app.client/workers/webworker-loader.js' }
    name() { return 'ClientController'; }
    constructor() {
        super();
        this.modules = _.assign({}, this.modules, {
            user: new CommonUserModule(this),
            business: new ClientBusinessModule(this),
            tab: new ClientTabModule(this),
            menu: new ClientMenuModule(this)
        });
        console.log('ClientController constructor done');
    }

    init() {
        super.init();
        PubSub.subscribe('User.linked', this.refresh.bind(this));
    }
}

export var CommonModule = new ClientController();
