var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_controller_1 = require('../../../public/app.common/modules/module-controller');
var user_module_1 = require('../../../public/app.common/modules/user-module');
var social_module_1 = require('../../../public/app.common/modules/social-module');
var business_module_1 = require('../../../public/app.pos/modules/business-module');
var tab_module_1 = require('../../../public/app.pos/modules/tab-module');
var menu_module_1 = require('../../../public/app.pos/modules/menu-module');
var POSController = (function (_super) {
    __extends(POSController, _super);
    function POSController() {
        _super.call(this);
        this.modules = _.assign({}, this.modules, {
            user: new user_module_1.CommonUserModule(this),
            business: new business_module_1.POSBusinessModule(this),
            tab: new tab_module_1.POSTabModule(this),
            menu: new menu_module_1.POSMenuModule(this),
            social: new social_module_1.CommonSocialModule(this)
        });
    }
    POSController.prototype.ROUTE = function () { return '/chefs'; };
    POSController.prototype.workerUrl = function () { return '/public/app.pos/workers/webworker-loader.js'; };
    POSController.prototype.name = function () { return 'POSController'; };
    POSController.prototype.init = function () {
        _super.prototype.init.call(this);
        PubSub.subscribe('User.linked', this.refresh.bind(this));
    };
    return POSController;
})(module_controller_1.ModuleController);
exports.POSController = POSController;
exports.CommonModule = new POSController();
//# sourceMappingURL=pos-controller.js.map