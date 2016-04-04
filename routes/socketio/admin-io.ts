import {admin, pos, logging, config, cookie, app} from '../../app';
import {ADMIN_USER_ROUTE} from '../../lib/user/admin/user-admin';
import {SocketIOModule} from './abstract-io';
import PubSub = require('pubsub-js');

export class AdminIO extends SocketIOModule {
    //userModule() { return admin }; // unfortunately this cannot be done yet in TS
    USER_ROUTE = ADMIN_USER_ROUTE;
    constructor() {
        super();
        this.USER_MODULE = () => { return admin };
    }
    initSocket(socket) {
        this.handshake(socket, null);
        socket.on('request-users', () => { this.ensure(socket,'emitPOSUsers', this.emitPOSUsers) });
        socket.on('request-businesses', () => { this.ensure(socket, 'emitBusinesses', this.emitBusinesses) });
        socket.on('request-business-hash', () => { this.ensure(socket, 'emitBusinessHash', this.emitBusinessHash) });
        socket.on('delete-user', (user) => { this.ensure(socket, 'deletePOSUser', this.deletePOSUser, user) });
        socket.on('deactivate-sms-code', (user, value) => { this.ensure(socket, 'deactivatePOSUser', this.deactivatePOSUser, user, value) });
    }

    deletePOSUser(socket, user) {
        admin.deletePOSUser(user, (err) => {
            if (err) logging.error(err);
        });
    }
    deactivatePOSUser(socket, user, value) {
        admin.deactivatePOSUser(user, value, (err) => {
            if (err) logging.error(err);
        });
    }
    emitPOSUsers(socket) {
        admin.getPOSUsers((batch) => {
            socket.emit('receive-user-batch', batch);
        }, (err) => {
            socket.emit('receive-user-batch-end');
            if (err) return logging.error(err);
        });
    }

    emitBusinesses(socket) {
        console.time('fetch all businesses');
        admin.getBusinesses((batch) => {
            socket.emit('receive-business-batch', batch);
        }, (err) => {
            console.timeEnd('fetch all businesses');
            if (err) return logging.error(err);
            socket.emit('receive-business-batch-end');
        });
    }

    emitBusinessHash(socket) {
        console.time('get hash of all businesses');
        admin.getBusinessHash((percent) => {
            socket.emit('receive-business-hash', percent);
        }, (err, hash) => {
            console.timeEnd('get hash of all businesses');
            if (err) return logging.error(err);
            socket.emit('receive-business-hash-end', hash);
        });
    }
}