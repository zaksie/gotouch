import {Module} from '../../../public/app.common/modules/module';
declare var PubSub;


export abstract class UserManagerModule extends Module {
    getDefaultLocals() { }
    //TODO: put in support for caching tabs in localStorage
    users = {};
    name() { return 'UserManager' }
    init() {
        //this.subscribeToWorker({
        //    'Tab.approved': this.addTab.bind(this)
        //});
    }
    clearPreviousData() {
        this.users = {};
    }
    onFetchReceived(batch) {
        super.onFetchReceived(batch);
        _.forEach(batch, (user) => {
            this.users[user.id] = _.assign(this.users[user.id] || {}, user);
            this.users[user.id].locals = this.users[user.id].locals || this.getDefaultLocals();
            PubSub.publish('UserManager.received', user);
        });
    }

    onFetchEnd() {
        PubSub.publish('UserManager.end', null);
    }

    delete(user) {
        this.postMessage(['UserManager.delete', user]);
    }

    setActivationState(user, active) {
        this.postMessage(['UserManager.active', user, active]);
    }

    hash() {
        //TODO: WTF??
        return _.reduce(this.users, function (total, x) {
            return total + parseInt(x);
        });
    }

    get() {
        return _.values(this.users);
    }
}