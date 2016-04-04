import {BusinessModule} from '../../../public/app.common/modules/business-module';
declare var PubSub;

const SHOW_MORE_COUNT = 10;
export class ClientBusinessModule extends BusinessModule {
    current = {
        pending: '',
        placeid: '',
        get: () => { return this.current.placeid ? this.businesses[this.current.placeid] : undefined; },
        set: (placeid?) => {
            // this is used in the callback from the server with placeid = null
            if (!placeid && !this.businesses[this.current.pending])
                return 'error';
            if (!placeid) placeid = this.current.pending;
            if (placeid == this.current.placeid) return;

            else {
                this.current.pending = placeid;
                this.current.placeid = '';
            }
            ///////////////////
            var business = this.businesses[placeid];
            if (!business) {
                this.requestBusiness(placeid);
            }
            else {
                if (business.partial)
                    this.requestBusiness(placeid);
                else {
                    console.log('Received complete record for ' + business.name);
                    this.current.pending = '';
                    this.current.placeid = business.placeid;
                    PubSub.publish('Business.current', business);
                }
            }
        }
    }

    init() {
        super.init();
        PubSub.subscribe('Business.request.moreResult', this.onRequestMoreResults.bind(this));
    }

    getDefaultLocals() { }
    onFetchReceived(business) {
        super.onFetchReceived(business);
        if (this.current.pending == business.placeid)
            this.current.set();
    }
    requestBusiness(placeid) {
        console.log('Requesting business ' + placeid);
        this.requestBusinesses({ placeid: placeid, partial: false });
    }
    requestBusinesses(data?) {
        if (!data)
            data = {};
        this.getLocation((err, location) =>{
            if (err)
                return PubSub.publish('Geolocation.notAvailable');
            data.location = location;
            if (!data.placeid)
                console.log('Requesting nearby businesses');
            super.request(data);
        });
    }

    refresh() {
        this.requestBusinesses();
    }
    save() {
        // TODO: see if anything needs doing here
    }

    onRequestMoreResults() {
        let search = {
            count: SHOW_MORE_COUNT,
            iteration: ~~(_.values(this.businesses).length / SHOW_MORE_COUNT) ,
            placeids: _.map(this.businesses, (b) => { return b.placeid }),
        }
        this.requestBusinesses(search);
    }

    getBusinessUrl(callback) {
        if (!this.current.placeid && this.current.pending)
            return setTimeout(this.getBusinessUrl.bind(this), 500, callback);
        
        if (this.current.placeid)
            return callback('/places/' + this.current.placeid);

        callback();
    }
};
