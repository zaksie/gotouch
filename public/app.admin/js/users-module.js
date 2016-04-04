var POSUsersModule = function (socket) {
    var users = {};
    var ready = false;

    PubSub.publish('POSUsers.ready');
    PubSub.subscribe('User.logged.in', function () {
        requestPOSUsers();
    });
    socket.on('receive-pos-user-batch', function (posuser_batch) {
        onPOSUserBatchReceived(posuser_batch);
    });
    socket.on('receive-pos-user-batch-end', function () {
        if (!ready) {
            ready = true;
            PubSub.publish('POSUsers.ready');
        }
        PubSub.publish('POSUsers.received');
    });

    function onPOSUserBatchReceived(posuser_batch) {
    }
    function refresh(){
        requestPOSUsers();
    }
    function requestPOSUsers() {
        socket.emit('request-pos-users');
    }
    function deletePOSUser(user){
        socket.emit('delete-pos-user', user);
    }
    function toggleActivation(user, active) {
        socket.emit('deactivate-sms-code', user, active);
    }

    //////////// END ////////////////////
    return {
        requestPOSUsers: requestPOSUsers,
        users: function () { return _.map(Object.keys(users), function (u) { return users[u]; }); },
        hash: hash,
        refresh: refresh,
        deletePOSUser: deletePOSUser,
        toggleActivation: toggleActivation,
    };
};
