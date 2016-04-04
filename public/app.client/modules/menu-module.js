var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var menu_module_1 = require('../../../public/app.common/modules/menu-module');
var ClientMenuModule = (function (_super) {
    __extends(ClientMenuModule, _super);
    function ClientMenuModule() {
        var _this = this;
        _super.apply(this, arguments);
        this.current = {
            placeid: '',
            name: '',
            get: function () {
                var business = _this.controller.modules.business.get(_this.current.placeid);
                if (!business || !_this.current.name)
                    return null;
                return _.find(business.menus, function (m) { return m.name == _this.current.name; });
            },
            set: function (placeid, name) {
                _this.current.placeid = placeid;
                _this.current.name = name;
            }
        };
    }
    ClientMenuModule.prototype.refresh = function () { };
    ClientMenuModule.prototype.getDefaultLocals = function () { };
    ClientMenuModule.prototype.save = function () { };
    return ClientMenuModule;
})(menu_module_1.MenuModule);
exports.ClientMenuModule = ClientMenuModule;
//# sourceMappingURL=menu-module.js.map