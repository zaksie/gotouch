var app;
(function (document) {
    
    
    // Grab a reference to our auto-binding template
    // and give it some initial binding values
    // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
    app = document.querySelector('#app');
    app.route = '/places';
    app.displayInstalledToast = function () {
        // Check to make sure caching is actually enabled—it won't be in the dev environment.
        if (!document.querySelector('platinum-sw-cache').disabled) {
            document.querySelector('#caching-complete').show();
        }
    };
    
    // Listen for template bound event to know when bindings
    // have resolved and content has been stamped to the page
    app.addEventListener('dom-change', function () {
    });
    
    // See https://github.com/Polymer/polymer/issues/1381
    PubSub.subscribe('App.ready', function () {
        // imports are loaded and elements have been registered
        updateLoginState();
    });
    app.placeName = null;
    app.placeOptions = [];
    app.isBusinessSelected = function (placeName) {
        return !!placeName;
    };
    // Close drawer after menu item is selected if drawerPanel is narrow
    app.onDataRouteClick = function (event) {
        var drawerPanel = document.querySelector('#paperDrawerPanel');
        if (drawerPanel.narrow) {
            drawerPanel.closeDrawer();
        }
    };
    
    // Scroll page to top and expand header
    app.scrollPageToTop = function () {
        var headerPanel = document.querySelector('paper-header-panel[main]');
        if (headerPanel) {
            headerPanel.$.mainContainer.scrollTop = 0;
        }
    };
    
    app.onCheckClick = function (event) {
        page('/checkout');
    };
    
    app.onRouteClick = function (event) {
        var route
        if (event.model)
            route = (event.model.item || event.model.submenu).route;
        else
            route = event.currentTarget.attributes['data-route'].nodeValue;
        onRouteClickAux(route);
    }
    
    function onRouteClickAux(route) {
        app.onDataRouteClick();
        page(route);
    }

    app.onGetLocation = function () {
        CommonModule.modules.business.getLocation();
    };
    
    app.showGuestCheck = true;
    
    PubSub.subscribe('app.scrollToTop', function () {
        if (app)
        app.scrollPageToTop();
    });
    
    PubSub.subscribe('app.showGuestCheck', function (msg, show) {
        app.showGuestCheck = show;
    });
    
    PubSub.subscribe('User.logged', updateLoginState);
    PubSub.subscribe('Drawer', function (msg) {
        var elem = document.querySelector('#paperDrawerPanel');
        var forceClose = _.includes(msg, 'close');
        elem.forceNarrow = forceClose;
        if (forceClose) {
            elem.closeDrawer();
        }
        else
            elem.openDrawer();
    }.bind(this));
    function updateLoginState() {
        var color = CommonModule.modules.user.current.is() ? 'green' : 'white';
        app.$.accountButton.style.color = color;
    }

})(document);
