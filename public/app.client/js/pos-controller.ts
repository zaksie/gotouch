import {ModuleController} from '../../app.common/modules/module-controller';
import {CommonUserModule} from '../../app.common/modules/user-module';
import {BusinessModule} from './business-module';
import {TabModule} from './tab-module';
import {MenuModule} from './menu-module';

export const CHEFS_ROUTE = '/chefs';
export class POSController extends ModuleController {
    ROUTE() { return CHEFS_ROUTE; }

    constructor() {
        super();
        this.modules = _.assign({}, this.modules, {
            user: new CommonUserModule(this),
            business: new BusinessModule(this),
            tab: new TabModule(this),
            menu: new MenuModule(this)
        });
        this.refresh();
    }
}

export var CommonModule = new POSController();
