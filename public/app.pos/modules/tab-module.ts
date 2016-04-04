import {TabModule} from '../../../public/app.common/modules/tab-module';
declare var PubSub;


export class POSTabModule extends TabModule { 
    current = {};

    //TODO: put in support for caching tabs in localStorage
    requestOpenOrder() {
        if (!this.controller.modules.user.current.linked) return console.log('Cannot request open orders as user is not linked');
        console.log('Requesting open tabs');
        this.request();
    }

    removeArticle() { }
    addArticle() { }
}