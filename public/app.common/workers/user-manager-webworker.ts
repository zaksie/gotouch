import {WebWorker, Progress} from '../../../public/app.common/workers/webworker';
declare var importScripts, io, postMessage, onmessage, _;

export abstract class UserManagerWorker extends WebWorker {
    users = {};
    REQUEST_MESSAGE() {
        return 'request-users';
    }
    RECEIVE_MESSAGE() {
        return 'receive-user-batch';
    }

    init() {
        super.init();
        this.subscribeToModule({
            'UserManager.delete': this.onDelete.bind(this),
            'UserManager.active': this.onSetActiveState.bind(this),
        });
    }
    clearPreviousData() {
        this.users = {};
    }
    onReceive(batch) {
        super.onReceive(batch);
        _.forEach(batch, (user)=> {
            this.users[user.id] = _.assign(this.users[user.id] || {}, user);
        });
    }

    onDelete(user) {
        this.socket.emit('delete-pos-user', user);
    }
    onSetActiveState(user, active) {
        this.socket.emit('deactivate-sms-code', user, active);
    }

    name() {
        return 'UserManager';
    }
}
