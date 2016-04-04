var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tab_module_1 = require('../../../public/app.common/modules/tab-module');
var POSTabModule = (function (_super) {
    __extends(POSTabModule, _super);
    function POSTabModule() {
        _super.apply(this, arguments);
        this.current = {};
    }
    //TODO: put in support for caching tabs in localStorage
    POSTabModule.prototype.requestOpenOrder = function () {
        if (!this.controller.modules.user.current.linked)
            return console.log('Cannot request open orders as user is not linked');
        console.log('Requesting open tabs');
        this.request();
    };
    POSTabModule.prototype.removeArticle = function () { };
    POSTabModule.prototype.addArticle = function () { };
    return POSTabModule;
})(tab_module_1.TabModule);
exports.POSTabModule = POSTabModule;
//# sourceMappingURL=tab-module.js.map