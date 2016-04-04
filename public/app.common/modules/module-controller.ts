import {Controller} from '../../../public/app.common/modules/controller';
declare var io;
declare var _;
export const AUTO_SAVE_INTERVAL = 1000 * 60 * 5;
export abstract class ModuleController extends Controller{
    protected workerSubscribers = {
        'onWorkerReady': this.onReady.bind(this),
        'onWorkerAwaitingLinking': this.onWorkerAwaitingLinking.bind(this)
    }
    protected workerReady = false;

    abstract workerUrl();
    init() {
        setInterval(this.automaticSave, AUTO_SAVE_INTERVAL);
        if (!(window as any).Worker)
            throw new Error('Web worker are required to use yummlet');
        this.worker = new Worker(this.workerUrl());
        this.worker.onmessage = (e) => {
            let allConcernedParties = _.assign({ this: this }, this.modules);
            _.forEach(allConcernedParties, (party) => {
                _.forEach(party.workerSubscribers, (subscriber, name) => {
                    if (e.data[0] == name)
                        subscriber(e.data[1], e.data[2], e.data[3]);
                });
            });
        }
    }
    onWorkerAwaitingLinking(e) {
        console.log('Business web worker is awaiting linking');
        this.postMessage('onUserLinked');
    }

    automaticSave() {
        _.forEach(this.modules, (module) => {
            module.save();
        });
    }
}

