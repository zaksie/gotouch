module.exports = function () {
    const MENU_SECTION_IMAGE_WIDTH = 120;

    const MAX_MENU_WIDTH = 95;
    const MAX_MENU_WIDTH_PX = 800;
    const MAX_MENU_WIDTH_FINAL_SECTION_PX = 450;

    var getPictureStyle = function (section, page, containerWidth) {
        var containerSize = getSize(section, page, containerWidth);
        var zoom = getBackgroundSizeProportions(section);
        xfactor = 100 / zoom.width;
        yfactor = 100 / zoom.height;
        var position = getBackgroundPosition(section, zoom);
        var val = "width: " + containerSize.width + "height: " + containerSize.height;
        val += "max-width: " + containerSize.maxWidth + "max-height: " + containerSize.maxHeight;
        var bgSize = "background-size: " + xfactor + "% " + yfactor + "%;";
        var bgPos = "background-position: left " + position.left + "% " + "top " + position.top + "%;";
        var bgImage = "background-image: url('" + page.jpg + "');";

        return {
            size: { text: val, height: containerSize.heightpx, width: containerSize.widthpx },
            bg: bgSize + bgPos + bgImage
        }
    }
    
    var getSubsectionRelativePositionAndSize = function (section) {
        if (!section.final)
            return _.map(section.sections, function (sub) {
                return {
                    left: sub.start[0] - section.start[0],
                    top: sub.start[1] - section.start[1],
                    width: (sub.end[0] - sub.start[0]) / (section.end[0] - section.start[0]),
                    height: (sub.end[1] - sub.start[1]) / (section.end[1] - section.start[1])
                }
            });
        else
            return [];
    }
    var getBackgroundPosition = function (section, zoom) {
        var left, top;
        if (zoom.width == 1)
            left = 0;
        else
            left = section.start[0] / (1 - zoom.width) * 100;
        if (zoom.height == 1)
            top = 0;
        else
            top = section.start[1] / (1 - zoom.height) * 100;
        
        return {
            left: left,
            top: top
        }
    }
    var getBackgroundSizeProportions = function (section) {
        var width = section.end[0] - section.start[0];
        var height = section.end[1] - section.start[1];
        return { width: width, height: height };
    }
    var getSize = function (section, page, containingDivWidth) {
        var proportions = getBackgroundSizeProportions(section);
        var whratio = page.width * proportions.width / (page.height * proportions.height);
        if (section.final) {
            var maxWidth = MAX_MENU_WIDTH_FINAL_SECTION_PX + "px;";
            var maxHeight = MAX_MENU_WIDTH_FINAL_SECTION_PX / whratio + "px;"
        }
        else {
            var maxWidth = MAX_MENU_WIDTH_PX + "px;";
            var maxHeight = MAX_MENU_WIDTH_PX / whratio + "px;"
        }
        var width = MAX_MENU_WIDTH + "%;";
        var height_numeric = containingDivWidth * MAX_MENU_WIDTH / 100 / whratio;
        var height = height_numeric + "px;"
        return {
            widthpx: Math.min(parseInt(maxWidth), containingDivWidth * MAX_MENU_WIDTH / 100), 
            heightpx: Math.min(parseInt(maxHeight), height_numeric), 
            width: width, 
            height: height, 
            maxWidth: maxWidth,
            maxHeight: maxHeight
        };
    }
    var getClickSectionPosition = function (pX, pY, mainSection) {
        pX = pX * (mainSection.end[0] - mainSection.start[0]);
        pY = pY * (mainSection.end[1] - mainSection.start[1]);
        return _.find(mainSection.sections, function (section) {
            return pX >= (section.start[0] - mainSection.start[0]) 
                && pX <= (section.end[0] - mainSection.start[0]) 
                && pY >= (section.start[1] - mainSection.start[1]) 
                && pY <= (section.end[1] - mainSection.start[1]);
        });
    }
    
    function getMenuSectionItemPosition(parentWidth, itemCount, index){
        var math = parentWidth / (itemCount + 1) * (index + 1);
        return "left: " + ((math - MENU_SECTION_IMAGE_WIDTH/2)/ parentWidth*100)+ "% !important;";
    }
    return {
        getPictureStyle: getPictureStyle, 
        getClickSectionPosition: getClickSectionPosition,
        getMenuSectionItemPosition: getMenuSectionItemPosition,
    }
};