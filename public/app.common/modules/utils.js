var MAX_ALLOWED_UPLOAD_SIZE = 20 * 1024 * 1024;
var UtilClass = (function () {
    function UtilClass() {
    }
    UtilClass.prototype.createUUID = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    UtilClass.prototype.getCenterOfCoords = function (coords) {
        coords = coords.split(',');
        var polygon = [];
        for (var i = 0; i < coords.length; i += 2)
            polygon.push({ x: parseInt(coords[i]), y: parseInt(coords[i + 1]) });
        return new Region(polygon).centroid();
    };
    UtilClass.prototype.checkSize = function (files) {
        var size = 0;
        _.forEach(files, function (file) {
            size += file.size;
        });
        var condition = size < MAX_ALLOWED_UPLOAD_SIZE;
        if (!condition)
            alert('Maximum upload size is ' + MAX_ALLOWED_UPLOAD_SIZE);
        return condition;
    };
    UtilClass.prototype.validateFiles = function (files) {
        if (files.length < 1)
            window.writeToScreen('No menus were selected.');
        else if (!this.checkSize(files))
            window.writeToScreen('Total size is over the allowed limit of ' + MAX_ALLOWED_UPLOAD_SIZE / 1024 / 1024 + 'MB');
        else {
            return true;
        }
        return false;
    };
    return UtilClass;
})();
exports.UtilClass = UtilClass;
exports.Utils = new UtilClass();
var Region = (function () {
    function Region(points) {
        this.points = points || [];
        this.length = this.points.length;
    }
    Region.prototype.area = function () {
        var area = 0, i, j, point1, point2;
        for (i = 0, j = this.length - 1; i < this.length; j = i, i++) {
            point1 = this.points[i];
            point2 = this.points[j];
            area += point1.x * point2.y;
            area -= point1.y * point2.x;
        }
        area /= 2;
        return area;
    };
    Region.prototype.centroid = function () {
        var x = 0, y = 0, i, j, f, point1, point2;
        for (i = 0, j = this.length - 1; i < this.length; j = i, i++) {
            point1 = this.points[i];
            point2 = this.points[j];
            f = point1.x * point2.y - point2.x * point1.y;
            x += (point1.x + point2.x) * f;
            y += (point1.y + point2.y) * f;
        }
        f = this.area() * 6;
        return { x: (x / f).toFixed(2), y: (y / f).toFixed(2) };
    };
    return Region;
})();
exports.Region = Region;
//# sourceMappingURL=utils.js.map