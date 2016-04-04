declare var postMessage;

import {BusinessWorker} from '../../../public/app.common/workers/business-webworker';

export class AdminBusinessWorker extends BusinessWorker {
    
    REQUEST_MESSAGE() {
        return 'request-businesses';
    }
    RECEIVE_MESSAGE() {
        return 'receive-business-batch';
    }

    init() {
        super.init();
        this.subscribeToModule({
            'Business.cached': this.onReceiveCachedBusinesses.bind(this),
        });

        this.socket.on('receive-business-hash', this.onReceiveHash.bind(this));
        this.socket.on('receive-business-hash-end', this.onReceiveHashEnd.bind(this));
        this.socket.on('receive-business-hash-error', this.onReceiveHashError.bind(this));
    }

    request() {
        this.socket.emit('request-business-hash');
    }
    onReceiveEnd(data) {
        this.businesses.hash = this.businesses.tmp_hash;
        super.onReceiveEnd(this.businesses); //send all businesses at once when done. consider changing this
    }
    onReceiveCachedBusinesses(businesses) {
        this.businesses = businesses;
    }

    onReceiveHash(percent) {
        console.log('Receiving business hash....');
    }
    onReceiveHashEnd(hash) {
        if (this.businesses.hash != hash) {
            this.businesses.tmp_hash = hash;
            super.request();
            postMessage(['Business.hash.bad']);
        }
        else {
            postMessage(['Business.hash.ok']);
        }
    }
    onReceiveHashError(err) {
        console.error(err);
    }
}


