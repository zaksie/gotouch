import {Base} from '../../../public/app.common/modules/base';
import {Utils} from '../../../public/app.common/modules/utils';
declare var io, _;

export abstract class Controller extends Base {
    abstract ROUTE();
    modules;
    utils = Utils;
    constructor() {
        super();
        this.init();
    }
    refresh() {
        _.forEach(this.modules, (module) => {
            module.refresh();
        });
    }


}
    

