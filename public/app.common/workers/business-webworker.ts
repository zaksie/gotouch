import {WebWorker, Progress} from '../../../public/app.common/workers/webworker';
declare var importScripts, io, postMessage, onmessage;

export abstract class BusinessWorker extends WebWorker {
    businesses;
    transaction;
    name() { return 'Business'; }
    init() {
        super.init();
        this.businesses = {} as any;
    }
    clearPreviousData() {
        //TODO: somehow clear previous but keep locals...
    }

    onReceive(data) {
        // override default onReceive which calls postMessage(['Business.received', business]);
        // the super. version is called from forwardProcessedBusinessToModule
        this.processBusiness(data);
    }

    done() {
        super.done();
        this.transaction = null;
    }

    processBusiness(business_batch) {
        if (!_.isArray(business_batch))
            business_batch = [business_batch];
        _.forEach(business_batch, (business) =>{
            this.businesses[business.placeid] = this.businesses[business.placeid] || {};
            if (business.hash != this.businesses[business.placeid].hash
                //the next part makes sure that existing business is either partial, non-existent or both new and old record are complete
                && (this.businesses[business.placeid].partial || _.isUndefined(this.businesses[business.placeid].partial) || !business.partial)) {
                this.fixBug001(business);
                _.assign(this.businesses[business.placeid], business);
                this.forwardProcessedBusinessToModule(this.businesses[business.placeid]); //Here is the call to super.onReceive
            }
        });
    }

    forwardProcessedBusinessToModule(business) {
        super.onReceive(business);
    }

    request(data?) {
        this.transaction = new Transaction();
        super.request(data);
    }
    isReady() {
        return true;
    }

    // Bug 001: queries got to be part of the db entry 
    // TODO: remove queries from cloudstorage
    fixBug001(business) {
        _.forEach(business.webPhotos, (photo) => {
            if (_.includes(photo.image, '?'))
                photo.image = photo.image.substring(0, photo.image.indexOf('?'));
        });
    }
}

class Transaction {
    item_counter;
    inc() {
        this.item_counter++;
    }

    toObject() {
        return {
            count: this.item_counter
        }
    }
}
