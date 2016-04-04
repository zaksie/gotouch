import {AbstractForker, logging, _, async, PubSub, cp} from './abstract-forker';
import {Util} from '.../service/utils';
import {Business} from '../business';


export class BusinessFork extends AbstractForker {
    app = {
        business: new Business()
    };

    /* Override */
    init() {
        process.on('message', (msg, data) => {
            if (msg == 'fetchMatchingEntities') {
                let placeidsObjs = JSON.parse(data.placeidsObjs);
                let options = JSON.parse(data.options);
                this.app.business.fetchMatchingEntities(placeidsObjs, (item) => {
                    logging.info(item);
                }, (err) => {
                    if (err) logging.err(err);
                }, options);
            }
        });
    }

    fetchMatchingEntities(placeidsObj, yield_cb, final_cb) {

    }
}