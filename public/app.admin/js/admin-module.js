var CommonModule = function () {   
    const USER_ROUTE = '/admins';
    var socket = io(window.location.host + USER_ROUTE, { timeout: 1000 * 60 * 60 * 24 });
    var user = UserModule(socket);
    var posusers = POSUsersModule(socket);
    var business = BusinessModule(socket);
    socket.emit('handshake');
    
    var awaitingModules = ['Business', 'POSUsers'];
    PubSub.subscribe('Business.ready', onModuleReady);
    PubSub.subscribe('POSUsers.ready', onModuleReady);
    
    function onModuleReady(msg){
        var module = msg.split('.')[0];
        awaitingModules = _.filter(awaitingModules, function (m) { return module != m; });
        if (!awaitingModules.length) {
            console.log('App.ready');
            PubSub.publish('App.ready');
        }
    }
    function refresh(){
        business.refresh();
        posusers.refresh();
    }
    return {
        user: user,
        posusers: posusers,
        current: function () { return _.merge({}, user.current) },
        socket: socket,
        business: business,
        refresh: refresh,
        route: USER_ROUTE
    };
}();
var CommonModule = CommonModule;

function createGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}