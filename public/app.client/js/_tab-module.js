var TabModule = function (socket) {
    var current = {};
    function isBelongToCurrentBusiness() {
        return !current.tab // tab doesnt yet exist
            || !current.tab.articles.length // or is empty
            || current.tab.business.placeid == CommonModule.current().placeid;  // or if tab belongs to current business
    }
    
    PubSub.subscribe('Request.tab', function () {
        socket.emit('order-request');
    });
    PubSub.subscribe('Order.tip.change', function (msg, tip) {
        current.tab.tipObject = tip;
        updateTab(current.tab.business, current.tab);
    });
    
    function checkForExistingTabFor(business, tab) {
        socket.emit('order-open-create', { business: business, tab: tab });
    }
    
    function updateTab(business, tab) {
        socket.emit('order-update', { business: business, tab: tab });
    }
    
    socket.on('order-receive', function (data) {
        data.tab.business = data.business; //make format compatible with client
        updateTabFromServer(data);
    });
    
    function updateTabFromServer(data) {
        var isNull = isCurrentTabNull();
        if (isCurrentTab(data.placeid) || isNull) {
            if (isNull)
                createCurrentTab(data.business);
            var articles_to_add = [];
            _.forEach(data.tab.articles, function (article) {
                var index = _.findIndex(current.tab.articles, function (a) {
                    return a && a.clientid == article.clientid;
                });
                if (index < 0) articles_to_add.push(article);
            });
            current.tab.articles = articles_to_add.concat(current.tab.articles || []);
            
            for (var key in data.tab) { if (key != 'articles') current.tab[key] = data.tab[key]; }
            
            publishNewTab();
        }
    }
};
