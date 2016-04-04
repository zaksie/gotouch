import {ModuleController} from '../../../public/app.common/modules/module-controller';
import {CommonUserModule} from '../../../public/app.common/modules/user-module';
import {AdminBusinessModule} from '../../../public/app.admin/modules/business-module';
import {AdminUserManagerModule} from '../../../public/app.admin/modules/user-manager-module';

export class AdminController extends ModuleController {
    ROUTE() { return '/admins'; }
    workerUrl() { return '/public/app.admin/workers/webworker-loader.js' }
    name() { return 'AdminController'; }

    constructor() {
        super();
        this.modules = _.assign({}, this.modules, {
            user: new CommonUserModule(this),
            business: new AdminBusinessModule(this),
            user_manager: new AdminUserManagerModule(this) 
        });
    }
}

export var CommonModule = new AdminController();
