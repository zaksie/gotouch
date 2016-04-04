import {BusinessModule} from '../../../public/app.common/modules/business-module';
declare var localStorage, PubSub;

export class AdminBusinessModule extends BusinessModule {
    current = {};

    getDefaultLocals() { }

    init() {
        super.init();
        this.subscribeToWorker({
            'Business.hash.ok': this.onBusinessesOK.bind(this),
            'Business.hash.bad': this.onBusinessesOutOfDate.bind(this),

        });
        try {
            if (localStorage && localStorage.AdminModule_businesses) {
                this.businesses = JSON.parse(localStorage.AdminModule_businesses);
                console.log('loading from businesses from cache [' + this.getAll().length + '] with hash: ' + this.businesses.hash);
                this.postMessage(['Business.cached', this.businesses]);
            }
        }
        catch (e) { }
    }

    refresh() {
        this.request();
    }

    onBusinessesOK() {
        console.log('onBusinessesOK...');
        this.onBusinessesLoaded();
    }
    onBusinessesOutOfDate() {
        console.log('onBusinessesOutOfDate...');
    }
    onFetchReceived(business) {
        // do nothing. process the complete array of businesses onFetchEnd
    }
    onFetchEnd(data) {
        super.onFetchEnd(data)
        this.businesses = data;
        console.log('');
        console.log('in admin onFetchEnd with ' + this.getAll().length + ' businesses and hash: ' + this.businesses.hash);
        localStorage.AdminModule_businesses = JSON.stringify(this.businesses);
        this.onBusinessesLoaded();
    }

    onBusinessesLoaded() {
        PubSub.publish('Business.ready');
    }
    //TODO:!!!!
    save() {
        this.saveAux(this.businesses, 'placeid');
    }
};
