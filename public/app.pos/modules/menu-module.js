var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var menu_module_1 = require('../../../public/app.common/modules/menu-module');
var POSMenuModule = (function (_super) {
    __extends(POSMenuModule, _super);
    function POSMenuModule() {
        _super.apply(this, arguments);
        this.current = {};
    }
    POSMenuModule.prototype.refresh = function () { };
    POSMenuModule.prototype.getDefaultLocals = function () { };
    POSMenuModule.prototype.init = function () {
        this.subscribeToWorker({ 'Menu.getArticleData.done': this.getArticleDescriptionCallback.bind(this) });
        this.subscribeToWorker({ 'Menu.addSection.done': this.addSectionCallback.bind(this) });
        this.subscribeToWorker({ 'Menu.addArticle.done': this.addArticleCallback.bind(this) });
    };
    POSMenuModule.prototype.save = function () {
    };
    POSMenuModule.prototype.savePage = function (page) {
        this.postMessage(['Menu.page.save', page]);
    };
    ///////////////////
    POSMenuModule.prototype.getArticleDescription = function (menuEditorNode, selection) {
        this.postMessage(['Menu.getArticleData', menuEditorNode.page, menuEditorNode.section, selection]);
    };
    POSMenuModule.prototype.getArticleDescriptionCallback = function (data) {
        PubSub.publish('Menu.getArticleData', data);
    };
    //////////
    POSMenuModule.prototype.addSection = function (section, selection) {
        this.postMessage(['Menu.addSection', section, selection]);
    };
    POSMenuModule.prototype.addSectionCallback = function (data) {
        PubSub.publish('Menu.addSection', data);
    };
    ///////
    POSMenuModule.prototype.addArticle = function (section, selection, details) {
        this.postMessage(['Menu.addArticle', section, selection, details]);
    };
    POSMenuModule.prototype.addArticleCallback = function (data) {
        PubSub.publish('Menu.addArticle', data);
    };
    return POSMenuModule;
})(menu_module_1.MenuModule);
exports.POSMenuModule = POSMenuModule;
//# sourceMappingURL=menu-module.js.map