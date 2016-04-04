function showLoadingPage(params) { //params = {color, events, text}
    var image = new Image(200, 163)
    image.src = "../public/images/logo v3.png";
    window.loading_screen = window.pleaseWait({
        logo: image.src,
        backgroundColor: params.color,
        loadingHtml: '<p class="loading-message">' + params.text + '</p><br/>' 
                                 + '<div class="sk-wandering-cubes">' 
                                 + '<div class="sk-cube sk-cube1"></div>' 
                                 + '<div class="sk-cube sk-cube2"></div></div>'
    });
    params.events.forEach(function (event) {
        console.log('Add event listener for ' + event);
        window.addEventListener(event, function () {
            console.log('Finished loading ' + event);
            var index = params.events.indexOf(event);
            params.events.splice(index, 1);
            if (!params.events.length) {
                window.loading_screen.finish();
                $(function () {
                    $(".pg-loading-screen").remove();
                    $("#pageloader").remove();
                    image = null;
                    window.loading_screen = null;
                });
            }
        });
    });
}