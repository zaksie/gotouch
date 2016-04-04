var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var website_1 = require('./website');
var async = require('async');
var _ = require('lodash');
exports.MENU_DOCUMENT_KEY = 'MenuDocument';
exports.MENU_PAGE_KEY = 'MenuPage';
var MenuDocument = (function (_super) {
    __extends(MenuDocument, _super);
    function MenuDocument() {
        _super.apply(this, arguments);
    }
    MenuDocument.prototype.getKeyName = function () {
        return exports.MENU_DOCUMENT_KEY;
    };
    // NOT IN USE
    MenuDocument.prototype.constructKey = function (website) {
        return {
            path: [{ kind: website_1.WEBSITE_KEY, name: website }]
        };
    };
    return MenuDocument;
})(website_1.WebsiteDocument);
exports.MenuDocument = MenuDocument;
//# sourceMappingURL=menu-document.js.map