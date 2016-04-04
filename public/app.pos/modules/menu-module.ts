import {MenuModule} from '../../../public/app.common/modules/menu-module';
import {Utils} from '../../../public/app.common/modules/utils';


export class POSMenuModule extends MenuModule { 
    current = {};

    refresh() { }
    getDefaultLocals() { }
    init() {
        this.subscribeToWorker({ 'Menu.getArticleData.done': this.getArticleDescriptionCallback.bind(this) });
        this.subscribeToWorker({ 'Menu.addSection.done': this.addSectionCallback.bind(this) });
        this.subscribeToWorker({ 'Menu.addArticle.done': this.addArticleCallback.bind(this) });
    }
    save() {
        
    }
    savePage(page) {
        this.postMessage(['Menu.page.save', page]);
    }

    ///////////////////
    getArticleDescription(menuEditorNode, selection) {
        this.postMessage(['Menu.getArticleData', menuEditorNode.page, menuEditorNode.section, selection]);
    }
    getArticleDescriptionCallback(data) {
        PubSub.publish('Menu.getArticleData', data);
    }
    //////////
    addSection(section, selection) {
        this.postMessage(['Menu.addSection', section, selection]);
    }
    addSectionCallback(data) {
        PubSub.publish('Menu.addSection', data);
    }
    ///////
    addArticle(section, selection, details) {
        this.postMessage(['Menu.addArticle', section, selection, details]);
    }
    addArticleCallback(data) {
        PubSub.publish('Menu.addArticle', data);
    }
}