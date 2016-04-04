import {Controller} from '../../../public/app.common/modules/controller';
import {UserWorker} from '../../../public/app.common/workers/user-webworker';
declare var io, _, postMessage;
export abstract class WorkerController extends Controller {
    protected socket;
    parentSubscribers = {
        'onUserLinked': this.onUserAuthenticatedInApp.bind(this)
    }

    init() {
        this.socket = io(location.host + this.ROUTE(), { timeout: 1000 * 60 * 60 * 24 });
        console.log('socket connected to ' + this.ROUTE());
        this.modules = _.assign({}, this.modules, {
            user: new UserWorker(this),
        });
        onmessage = (e) => {
            let allConcernedParties = _.assign({ this: this }, this.modules);
            _.forEach(allConcernedParties, (party) => {
                _.forEach(party.parentSubscribers, (subscriber, name) => {
                    if (e.data[0] == name)
                        subscriber(e.data[1], e.data[2], e.data[3]);
                });
            });
        }
        this.socket.on('user-linked', this.onUserLinkedInWorker.bind(this));
    }

    getSocket() { return this.socket; }

    onUserAuthenticatedInApp() {
        this.socket.emit('link-me');
    }

    onUserLinkedInWorker() {
        postMessage(['Worker.linked']);
    }
}

