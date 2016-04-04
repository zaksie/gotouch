import {TabModule} from '../../../public/app.common/modules/tab-module';
import {Utils} from '../../../public/app.common/modules/utils';
declare var PubSub;

export class ClientTabModule extends TabModule { 
    current = {
        get: () => {
            let placeid = this.controller.modules.business.current.placeid;
            return placeid ? this.getOpen(placeid, true) : null;
        },
        count: () => {
            let tab = this.current.get();
            return tab ? tab.articles.length : 0;
        }
    }

    addArticle(article) {
        let tab = this.getOpen(article.placeid, true);
        article = _.cloneDeep(article);
        article.uuid = Utils.createUUID();
        tab.articles.push(article);
        PubSub.publish('Tab.article.add', { article: article });
    }

    removeArticle(business, article) {
        let tab = _.find(this.open, (o) => { return o.placeid == business.placeid });
        _.remove(tab.articles, (a) => { return a.uuid == article.uuid });
        PubSub.publish('Tab.article.remove', { business: business, article: article });
    }
}