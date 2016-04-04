import {TabModule} from '../../app.common/modules/tab-module';
import {Utils} from '../../app.common/modules/utils';
declare var PubSub;


export class ClientTabModule extends TabModule { 
    init() {
        super.init();
        PubSub.subscribe('Tab.article.add', this.addArticleToTab.bind(this));
        PubSub.subscribe('Tab.article.remove', this.removeArticleFromTab.bind(this));
    }

    addArticleToTab(msg, data) {
        let tab = this.findTab(data.tabid);
        var article = _.cloneDeep(data.article);
        article.clientid = article.clientid || Utils.createGuid();
        data.business = this.controller.modules.business.current.business();
        data.article = article;
        this.updateTabFromClient(data);
        this.socket.emit('tab-add-article', data);
    }

    removeArticleFromTab(msg, data) {
        let tab = this.findTab(data.tabid);
        _.remove(tab.articles, function (a) {
            return a.clientid == data.article.clientid;
        });
        this.socket.emit('tab-remove-article', data);
    }

    findTab(tabid) {
        return _.find(this.open, (t) => { return t.id == tabid });
    }

    updateTabFromClient(data) {
        if (isCurrentTab(data.business.placeid)) {
            current.tab.articles.push(data.article);
            updateTab(data.business, current.tab);
        }
        else {
            createCurrentTab(data.business, data.article);
            checkForExistingTabFor(data.business, current.tab);
        }

        this.publishNewTab();
    }

    publishNewTab() {
        PubSub.publish('Tab.received');
        PubSub.publish('Tab.article.count');
    }
}
