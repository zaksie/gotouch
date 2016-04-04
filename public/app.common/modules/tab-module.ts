import {Module} from '../../../public/app.common/modules/module';
declare var PubSub;


export abstract class TabModule extends Module { 
    getDefaultLocals() { }
    //TODO: put in support for caching tabs in localStorage
    tabHashes = [];
    open = [];
    closed = [];
    name() { return 'Tab' }
    init() {
        this.subscribeToWorker({
            'Tab.approved': this.addTab.bind(this)
        });
    }
    clearPreviousData() {
        //TODO: see if its ok to override all previous data
        this.open = [];
        this.closed = [];
    }
    onFetchReceived(tab) {
        super.onFetchReceived(tab);
        this.addTab(tab, true);
    }
    
    addTab(tab, isFromDb?) {
        if (!_.includes(this.tabHashes, tab.hash)) {
            this.tabHashes.push(tab.hash);
            this.open.push(tab);
            if (!isFromDb) {
                console.log('New tab arrived');
                PubSub.publish('Tab.placed', tab);
            }
        }
    }
    abstract addArticle(article, placeid?);

    getOpen(placeid?, createIfNotFound = true) {
        if (placeid) {
            let relevantOpenOrders = _.filter(this.open, (o) => {
                return o.placeid == placeid;
            });

            if (relevantOpenOrders.length)
                return relevantOpenOrders[0];

            if (createIfNotFound) {
                let tab = this.createTab(this.controller.modules.business.current.get(), {});
                this.open.push(tab);
                return tab;
            }

            return null;
        }
        return this.open;
    }
    getCount() {
        return this.open.length;
    }
    save() {
        this.saveAux(this.open, 'id');
        this.saveAux(this.closed, 'id');
    }

    createTab(business, params) {
        var date = (function () {
            var now = new Date();
            return now.getDate() + '/' + (now.getMonth() + 1);
        })();
        return {
            date: date,
            table_number: params.table_number || -1,
            diner_count: params.diner_count || 1,
            server: params.server || '',
            mock_sn: Math.round(Math.random() * 10000),
            articles: params.articles || [],
            placeid: business.placeid,
            placeName: business.name
        };
    }

    computePrice(factor, articles) {
        var result = Math.round(_.sum(articles, (item)=>{
            return factor * item.price;
        }) * 10) / 10;
        if (!result)
            return 0;
        else
            return result;
    }

    abstract removeArticle(business, article);
}