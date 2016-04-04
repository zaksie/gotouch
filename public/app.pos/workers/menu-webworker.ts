declare var postMessage;

import {MenuWorker} from '../../../public/app.common/workers/menu-webworker';

export class POSMenuWorker extends MenuWorker {
    REQUEST_MESSAGE() {
        return 'request-menu';
    }


    init() {
        super.init();
        this.subscribeToModule({ 'Menu.page.save': this.savePage.bind(this) });
        this.subscribeToModule({ 'Menu.getArticleData': this.getArticleDescription.bind(this) });
        this.subscribeToModule({ 'Menu.addSection': this.addSection.bind(this) });
        this.subscribeToModule({ 'Menu.addArticle': this.addArticle.bind(this) });
    }

    savePage(page) {
        this.socket.emit('menu-page-save', page);
    }
    isReady() {
        return true;
    }

    // CPU INTENSIVE OPERATIONS
    ///////////////////
    getArticleDescription(page, section, selection) {
        let new_section = this.createSection(section, selection);
        let texts = this.filterContainedTexts(page, new_section);
        if (!texts.length) {
            console.log('no text found in selection');
            return;
        }
        let description = this.stitchTexts(texts);

        let maxFontSize = _.max(texts, (text) => { return text.R[0].TS[1]; }).R[0].TS[1];
        let nameTexts = _.filter(texts, (text) => {
            return text.R[0].TS[1] == maxFontSize;
        });
        let name = this.stitchTexts(nameTexts);

        var price = (description
            .match(/\d+\.\d+|\d+\b|\d+(?=\w)/g) || [])
            .map(function (v) { return +v; }).pop();

        postMessage(['Menu.getArticleData.done', { description: description, name: name, price: price }]);
    }
    private filterContainedTexts(page, section) {
        return _.filter(page.texts, (t) => {
            return t.x > page.pdf.width * section.start[0]
                && t.x < page.pdf.width * section.end[0]
                && t.y > page.pdf.height * section.start[1]
                && t.y < page.pdf.height * section.end[1];
        });
    }
    private stitchTexts(texts) {
        let groups = _.values(_.groupBy(texts, (t) => {
            return t.y;
        }));
        let compareValues = (v1, v2) => {
            return v1 - v2 == 0 ? 0 : (v1 - v2) / Math.abs(v1 - v2);
        };

        return groups.sort((a, b) => {
            return compareValues(a[0].y, b[0].y);
        }).map((g) => {
            return g.sort((a, b) => {
                return compareValues(a.x, b.x);
            }).map((t) => {
                return decodeURIComponent(t.R[0].T);
            }).join('');
        }).join('\n');
    }

    //////////////////

    addSection(section, selection) {
        let new_section = this.createSection(section, selection);
        postMessage(['Menu.addSection.done', new_section]);

    }

    addArticle(section, selection, details) {
        let new_section = this.createSection(section, selection);
        new_section.final = true;
        _.assign(new_section, details);
        postMessage(['Menu.addArticle.done', new_section]);
    }

    private createSection(section, selection) {
        let new_section = {
            start: [
                section.start[0] + selection.l / section.zoom.x,
                section.start[1] + selection.t / section.zoom.y
            ],
            end: [
                section.start[0] + (selection.l + selection.w) / section.zoom.x,
                section.start[1] + (selection.t + selection.h) / section.zoom.y
            ]
        } as any;

        // keep original page w/h in an accessible place
        let rwidth = new_section.end[0] - new_section.start[0];
        let rheight = new_section.end[1] - new_section.start[1];

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
    }
}

