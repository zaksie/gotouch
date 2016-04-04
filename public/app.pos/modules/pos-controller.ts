import {ModuleController} from '../../../public/app.common/modules/module-controller';
import {CommonUserModule} from '../../../public/app.common/modules/user-module';
import {CommonSocialModule} from '../../../public/app.common/modules/social-module';
import {POSBusinessModule} from '../../../public/app.pos/modules/business-module';
import {POSTabModule} from '../../../public/app.pos/modules/tab-module';
import {POSMenuModule} from '../../../public/app.pos/modules/menu-module';

export class POSController extends ModuleController {
    ROUTE() { return '/chefs'; }
    workerUrl() { return '/public/app.pos/workers/webworker-loader.js' }
    name() { return 'POSController'; }

    constructor() {
        super();
        this.modules = _.assign({}, this.modules, {
            user: new CommonUserModule(this),
            business: new POSBusinessModule(this),
            tab: new POSTabModule(this),
            menu: new POSMenuModule(this),
            social: new CommonSocialModule(this)
        });
    }

    init() {
        super.init();
        PubSub.subscribe('User.linked', this.refresh.bind(this));
    }
}

export var CommonModule = new POSController();
