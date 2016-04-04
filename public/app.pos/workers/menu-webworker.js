var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var menu_webworker_1 = require('../../../public/app.common/workers/menu-webworker');
var POSMenuWorker = (function (_super) {
    __extends(POSMenuWorker, _super);
    function POSMenuWorker() {
        _super.apply(this, arguments);
    }
    POSMenuWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-menu';
    };
    POSMenuWorker.prototype.init = function () {
        _super.prototype.init.call(this);
        this.subscribeToModule({ 'Menu.page.save': this.savePage.bind(this) });
        this.subscribeToModule({ 'Menu.getArticleData': this.getArticleDescription.bind(this) });
        this.subscribeToModule({ 'Menu.addSection': this.addSection.bind(this) });
        this.subscribeToModule({ 'Menu.addArticle': this.addArticle.bind(this) });
    };
    POSMenuWorker.prototype.savePage = function (page) {
        this.socket.emit('menu-page-save', page);
    };
    POSMenuWorker.prototype.isReady = function () {
        return true;
    };
    // CPU INTENSIVE OPERATIONS
    ///////////////////
    POSMenuWorker.prototype.getArticleDescription = function (page, section, selection) {
        var new_section = this.createSection(section, selection);
        var texts = this.filterContainedTexts(page, new_section);
        if (!texts.length) {
            console.log('no text found in selection');
            return;
        }
        var description = this.stitchTexts(texts);
        var maxFontSize = _.max(texts, function (text) { return text.R[0].TS[1]; }).R[0].TS[1];
        var nameTexts = _.filter(texts, function (text) {
            return text.R[0].TS[1] == maxFontSize;
        });
        var name = this.stitchTexts(nameTexts);
        var price = (description
            .match(/\d+\.\d+|\d+\b|\d+(?=\w)/g) || [])
            .map(function (v) { return +v; }).pop();
        postMessage(['Menu.getArticleData.done', { description: description, name: name, price: price }]);
    };
    POSMenuWorker.prototype.filterContainedTexts = function (page, section) {
        return _.filter(page.texts, function (t) {
            return t.x > page.pdf.width * section.start[0]
                && t.x < page.pdf.width * section.end[0]
                && t.y > page.pdf.height * section.start[1]
                && t.y < page.pdf.height * section.end[1];
        });
    };
    POSMenuWorker.prototype.stitchTexts = function (texts) {
        var groups = _.values(_.groupBy(texts, function (t) {
            return t.y;
        }));
        var compareValues = function (v1, v2) {
            return v1 - v2 == 0 ? 0 : (v1 - v2) / Math.abs(v1 - v2);
        };
        return groups.sort(function (a, b) {
            return compareValues(a[0].y, b[0].y);
        }).map(function (g) {
            return g.sort(function (a, b) {
                return compareValues(a.x, b.x);
            }).map(function (t) {
                return decodeURIComponent(t.R[0].T);
            }).join('');
        }).join('\n');
    };
    //////////////////
    POSMenuWorker.prototype.addSection = function (section, selection) {
        var new_section = this.createSection(section, selection);
        postMessage(['Menu.addSection.done', new_section]);
    };
    POSMenuWorker.prototype.addArticle = function (section, selection, details) {
        var new_section = this.createSection(section, selection);
        new_section.final = true;
        _.assign(new_section, details);
        postMessage(['Menu.addArticle.done', new_section]);
    };
    POSMenuWorker.prototype.createSection = function (section, selection) {
        var new_section = {
            start: [
                section.start[0] + selection.l / section.zoom.x,
                section.start[1] + selection.t / section.zoom.y
            ],
            end: [
                section.start[0] + (selection.l + selection.w) / section.zoom.x,
                section.start[1] + (selection.t + selection.h) / section.zoom.y
            ]
        };
        // keep original page w/h in an accessible place
        var rwidth = new_section.end[0] - new_section.start[0];
        var rheight = new_section.end[1] - new_section.start[1];
        new_section.width = rwidth / (section.end[0] - section.start[0]);
        new_section.height = rheight / (section.end[1] - section.start[1]);
        new_section.zoom = {
            x: 1 / rwidth,
            y: 1 / rheight,
        };
        new_section.sections = [];
        new_section.parent_id = section.id;
        new_section.id = section.id + '->' + ~~(Math.random() * 1000);
        return new_section;
    };
    return POSMenuWorker;
})(menu_webworker_1.MenuWorker);
exports.POSMenuWorker = POSMenuWorker;
//# sourceMappingURL=menu-webworker.js.map