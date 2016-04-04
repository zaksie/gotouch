import {WebWorker, Progress} from '../../../public/app.common/workers/webworker';
declare var importScripts, io, postMessage, onmessage;

export class UserWorker extends WebWorker {
    RECEIVE_MESSAGE() { return ''; }
    REQUEST_MESSAGE() { return ''; }

    name() {
        return 'User';
    }

    init() {
        this.socket.on('logout', (callback) => {
            callback(200);
            postMessage(['User.logout']);
        });
        this.socket.on('user-authenticated', (profile) => {
            postMessage(['User.authenticated', profile]);
        });
        this.socket.on('user-linked', () => {
            postMessage(['User.linked']);
        });

        this.subscribeToModule({
            'User.handshake': this.handshake.bind(this),
            'User.linkme': this.linkMe.bind(this)
        });
    }

    clearPreviousData() { }

    handshake(data) {
        this.socket.emit('handshake');
    }
    linkMe(data) {
        this.socket.emit('link-me');
    }

    isReady() {
        return true;
    }

}
