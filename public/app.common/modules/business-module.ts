import {Module} from '../../../public/app.common/modules/module';
import {Utils} from '../../../public/app.common/modules/utils';
const MAX_ITERATIONS = 10;
declare var PubSub;

export abstract class BusinessModule extends Module {
    businesses;
    location;
    name() { return 'Business'; }
    init() {
        this.businesses = {} as any;
    }
    processBusiness(business) {
        let locals = {} as any;
        if (localStorage && localStorage[business.placeid])
            locals = JSON.parse(localStorage[business.placeid]);
        locals.route = '/businesses/' + business.placeid;
        let defaultLocals = this.getDefaultLocals();
        business.locals = _.merge(defaultLocals, locals);
        if (this.businesses[business.placeid])
            _.merge(this.businesses[business.placeid], business);
    }
   
    onFetchReceived(business) {
        super.onFetchReceived(business);
        this.processBusiness(business);
        this.businesses[business.placeid] = business;
        console.log('Business received');
        PubSub.publish('Business.received', business);
    }

    onFetchEnd(business) {
        super.onFetchEnd(business);
        console.log('Business receive end');
        PubSub.publish('Business.fetch.end', business);
    }

    
    isReady(params = {} as any) {
        console.log('checking if placeid ' + params.placeid + ' is ready...');
        if (!params.placeid)
            return this.ready;
        return !!this.businesses[params.placeid];
    }

    hasData() {
        return !!Object.keys(this.businesses).length;
    }
    getLocation(callback) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.location = new Object();
                this.location.lat = position.coords.latitude;
                this.location.lon = position.coords.longitude;
                this.location.accuracy = position.coords.accuracy;
                callback(null, this.location);
            }, (err) => {
                callback(err);
                }, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 1000 * 30
                });
        }
        else
            callback('Geolocation not supported');
    }

    set(business, params) {
        this.businesses[business.placeid].locals = _.merge({}, this.businesses[business.placeid].locals, params);
        this.save();
        PubSub.publish('Locals.change', business.placeid);
    }

    get(placeid/*, callback, iterationNo*/) {
        /*
        if (!iterationNo) iterationNo = 0;
        else if (iterationNo > MAX_ITERATIONS) return callback('Operation timed out');

        if (!this.businesses[placeid])
            return setTimeout(this.get.bind(this), 1000, placeid, callback, iterationNo++);
        callback(null, this.businesses[placeid]);
        */
        return this.businesses[placeid];
    }
    getAll() { return _.values(this.businesses); }

    clearPreviousData() {
        //TODO: somehow clear previous but keep locals...
    }

    ////////////////// aux computational functions ///////////////
    setupMissingFieldsInFloormap(floormap) {
        _.forEach(floormap.layers, (layer) => {
            layer.center = Utils.getCenterOfCoords(layer.coords);
            layer.number = /\d+/.exec(layer.name)[0];
            layer.hide = true;
        });
    }

    recalcCenter(coords) {
        return Utils.getCenterOfCoords(coords);
    }
}