var BusinessModule = function (socket) {
    const DEFAULT_LOCALS = {};
    var businesses = {};
    var businessesArray= [];
    var ready = false;
    var percent = 0;
    var step = 100 / 50;
    try {
        if (localStorage && localStorage.AdminModule_businesses)
            businesses = JSON.parse(localStorage.AdminModule_businesses);
    }
    catch (e) { }

    if (!window.Worker)
        throw new Exception('Web worker are required to use Shifafa Admins');
    var businessWorker = new Worker("/admins/business/webworker");

    PubSub.subscribe('User.logged.in', function () {
        requestBusinesses();
    });
    
    businessWorker.onmessage = function (e) {
        switch (e.data[0]) {
            case 'BusinessWorker.ready':
                businessWorker.postMessage(['cachedBusinesses', businesses]);
                return;
            case 'Loading.progress':
                return PubSub.publish('Loading.progress', e.data[1]);
            case 'businesses':
                businessesArray = e.data[1];
                businesses = e.data[2];
                localStorage.AdminModule_businesses = JSON.stringify(businesses);
                if (!ready) {
                    ready = true;
                    PubSub.publish('sBusiness.ready');
                }
                PubSub.publish('Business.cached');

                return;
            default:
                console.log(e.data[0]);
        }
    };
    
    businessWorker.onerror = function (e) {
        console.log(e);
    }


    function requestBusinesses() {
        businessWorker.postMessage(['requestBusinesses']);
    }
    
    function refresh(){
        requestBusinesses();
    }
    
    //////////// END ////////////////////
    return {
        requestBusinesses: requestBusinesses,
        location: function (){ return null; },
        refresh: refresh,
        all: function () { return businessesArray; },
        get: function (placeid) { return businesses[placeid]; }
    };
};
