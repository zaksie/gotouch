var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_1 = require('../../../public/app.common/modules/module');
var VisualMenu = require('../../../public/app.common/modules/visual-menu-module');
var MenuModule = (function (_super) {
    __extends(MenuModule, _super);
    function MenuModule() {
        _super.apply(this, arguments);
        this.visual = VisualMenu();
    }
    MenuModule.prototype.getDefaultLocals = function () { };
    MenuModule.prototype.name = function () { return 'Menu'; };
    MenuModule.prototype.init = function () { };
    MenuModule.prototype.clearPreviousData = function () { };
    MenuModule.prototype.onFetchReceived = function (menu) {
        _super.prototype.onFetchReceived.call(this, menu);
        PubSub.publish('Menu.received', menu);
    };
    MenuModule.prototype.findParentSection = function (section, parent_id) {
        var _this = this;
        if (section.id == parent_id)
            return section;
        if (!section.sections)
            return false;
        var found;
        _.forEach(section.sections, function (s) {
            found = _this.findParentSection(s, parent_id);
            return !found; // break when found != false
        });
        return found;
    };
    return MenuModule;
})(module_1.Module);
exports.MenuModule = MenuModule;
//# sourceMappingURL=menu-module.js.map