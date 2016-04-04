var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var website_1 = require('./website');
var async = require('async');
var _ = require('lodash');
exports.IMAGE_DOCUMENT_KEY = 'ImageDocument';
var ImageDocument = (function (_super) {
    __extends(ImageDocument, _super);
    function ImageDocument() {
        _super.apply(this, arguments);
    }
    ImageDocument.prototype.getKeyName = function () {
        return exports.IMAGE_DOCUMENT_KEY;
    };
    // NOT IN USE
    ImageDocument.prototype.constructKey = function (website) {
        return {
            path: [{ kind: website_1.WEBSITE_KEY, name: website }]
        };
    };
    return ImageDocument;
})(website_1.WebsiteDocument);
exports.ImageDocument = ImageDocument;
//# sourceMappingURL=image-document.js.map