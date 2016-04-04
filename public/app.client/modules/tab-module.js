var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var tab_module_1 = require('../../../public/app.common/modules/tab-module');
var utils_1 = require('../../../public/app.common/modules/utils');
var ClientTabModule = (function (_super) {
    __extends(ClientTabModule, _super);
    function ClientTabModule() {
        var _this = this;
        _super.apply(this, arguments);
        this.current = {
            get: function () {
                var placeid = _this.controller.modules.business.current.placeid;
                return placeid ? _this.getOpen(placeid, true) : null;
            },
            count: function () {
                var tab = _this.current.get();
                return tab ? tab.articles.length : 0;
            }
        };
    }
    ClientTabModule.prototype.addArticle = function (article) {
        var tab = this.getOpen(article.placeid, true);
        article = _.cloneDeep(article);
        article.uuid = utils_1.Utils.createUUID();
        tab.articles.push(article);
        PubSub.publish('Tab.article.add', { article: article });
    };
    ClientTabModule.prototype.removeArticle = function (business, article) {
        var tab = _.find(this.open, function (o) { return o.placeid == business.placeid; });
        _.remove(tab.articles, function (a) { return a.uuid == article.uuid; });
        PubSub.publish('Tab.article.remove', { business: business, article: article });
    };
    return ClientTabModule;
})(tab_module_1.TabModule);
exports.ClientTabModule = ClientTabModule;
//# sourceMappingURL=tab-module.js.map