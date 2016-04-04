var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_controller_1 = require('../../../public/app.common/modules/module-controller');
var user_module_1 = require('../../../public/app.common/modules/user-module');
var business_module_1 = require('../../../public/app.client/modules/business-module');
var tab_module_1 = require('../../../public/app.client/modules/tab-module');
var menu_module_1 = require('../../../public/app.client/modules/menu-module');
var ClientController = (function (_super) {
    __extends(ClientController, _super);
    function ClientController() {
        _super.call(this);
        this.modules = _.assign({}, this.modules, {
            user: new user_module_1.CommonUserModule(this),
            business: new business_module_1.ClientBusinessModule(this),
            tab: new tab_module_1.ClientTabModule(this),
            menu: new menu_module_1.ClientMenuModule(this)
        });
        console.log('ClientController constructor done');
    }
    ClientController.prototype.ROUTE = function () { return '/diners'; };
    ClientController.prototype.workerUrl = function () { return '/public/app.client/workers/webworker-loader.js'; };
    ClientController.prototype.name = function () { return 'ClientController'; };
    ClientController.prototype.init = function () {
        _super.prototype.init.call(this);
        PubSub.subscribe('User.linked', this.refresh.bind(this));
    };
    return ClientController;
})(module_controller_1.ModuleController);
exports.ClientController = ClientController;
exports.CommonModule = new ClientController();
//# sourceMappingURL=client-controller.js.map