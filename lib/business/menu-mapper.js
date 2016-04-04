var async = require('async');
var _ = require('lodash'), fs = require('fs');
var ClosestPoint = (function () {
    function ClosestPoint() {
        this.distance = Number.MAX_VALUE;
        this.node = null;
    }
    return ClosestPoint;
})();
var Rectangle = (function () {
    function Rectangle(base_node) {
        this.neighbors = [new ClosestPoint(), new ClosestPoint(), new ClosestPoint()];
        this.base_node = base_node;
    }
    Rectangle.prototype.sort = function () {
        this.neighbors.sort(function (a, b) {
            // now sort so that the furthest neighbor is always first - that way we don't have to worry about removing a neighbor that is > than b but < c
            var c = b.distance - a.distance;
            return c > 0 ? 1 : (c < 0 ? -1 : 0);
        });
    };
    Rectangle.prototype.isValid = function () {
        return _.findIndex(this.neighbors, function (neighbor) {
            return _.isNull(neighbor.node);
        }) < 0;
    };
    Rectangle.prototype.print = function () {
        return _.map(this.neighbors, function (neighbor) {
            return neighbor.distance.toFixed(2).toString();
        });
    };
    Rectangle.prototype.toString = function () {
        return '[' + this.base_node.x + ', ' + this.base_node.y + ']';
    };
    return Rectangle;
})();
var Canvas = (function () {
    function Canvas(mapper, image) {
        this.rects = [];
        this.mapper = mapper;
        this.image = image;
    }
    Canvas.prototype.add = function (rect) {
        rect.width = function () {
            return this.end.x - this.start.x;
        };
        rect.height = function () {
            return this.end.y - this.start.y;
        };
        this.rects.push(rect);
        this.redivide();
        if (rect.width() < 0 || rect.height() < 0)
            console.error('problems...');
    };
    Canvas.prototype.redivide = function () {
        var _this = this;
        _.forEach(this.rects, function (r) {
            r.start = r.start || { x: 0, y: 0 };
            r.end = _this.findClosestToAndCorrectStart(r);
        });
    };
    Canvas.prototype.findClosestToAndCorrectStart = function (rect) {
        var x_candidates = this.positionedAfterInX(rect);
        var y_candidates = this.positionedAfterInY(rect);
        var x_node = _.min(x_candidates, function (r) {
            return r.base_node.x;
        });
        if (x_node == Infinity)
            var x_middle = 1;
        else {
            x_middle = (x_node.base_node.x + rect.base_node.x) / 2 / this.image.width;
            x_node.start = x_node.start || { x: 0, y: 0 };
            x_node.start.x = x_middle;
        }
        var y_node = _.min(y_candidates, function (r) {
            return r.base_node.y;
        });
        if (y_node == Infinity)
            var y = 1;
        else {
            y = y_node.base_node.y / this.image.height;
            y_node.start = y_node.start || { x: 0, y: 0 };
            y_node.start.y = y;
        }
        return {
            x: x_middle,
            y: y
        };
    };
    Canvas.prototype.positionedAfterInX = function (rect) {
        var _this = this;
        return _.filter(this.rects, function (r) {
            return r !== rect && _this.mapper.isPositionedAfterInX(r.base_node, rect.base_node, _this.image);
        });
    };
    Canvas.prototype.positionedAfterInY = function (rect) {
        var _this = this;
        return _.filter(this.rects, function (r) {
            return r !== rect && _this.mapper.isPositionedAfterInY(r.base_node, rect.base_node, _this.image);
        });
    };
    return Canvas;
})();
var MIN_ANGLE_FOR_DIFF_DIRS = Math.PI / 36; //5 degs
var MenuMapper = (function () {
    function MenuMapper() {
    }
    MenuMapper.prototype.constructRects = function (arr, image) {
        var _this = this;
        var rectangles = [];
        var invalid_rectangles = [];
        for (var i = 0; i < arr.length; i++) {
            var a = arr[i];
            var rectangle = new Rectangle(a);
            for (var j = 1; j < arr.length; j++) {
                var b = arr[j];
                if (a !== b && this.isPositionedAfter(b, a, image)) {
                    var d = this.lineDistance(a, b);
                    var index = _.findIndex(rectangle.neighbors, function (neighbor) {
                        return d < neighbor.distance
                            && (_.isNull(neighbor.node) || _this.sameDirection(a, neighbor, { node: b, distance: d }));
                    });
                    if (index > -1) {
                        rectangle.neighbors[index].distance = d;
                        rectangle.neighbors[index].node = b;
                        rectangle.sort();
                    }
                }
            }
            if (rectangle.isValid())
                rectangles.push(rectangle);
            else
                invalid_rectangles.push(rectangle);
        }
        //sortRectangleCollection(rectangles, { by: 'font' });
        //writeToFile(rectangles);
        return rectangles;
    };
    MenuMapper.prototype.sortRectangleCollection = function (rectangles, options) {
        var _this = this;
        options = options || {};
        rectangles.sort(function (a, b) {
            switch (options.by) {
                case 'font':
                    return _this.compareFonts(a, b);
                default:
                    return a.base_node.y > b.base_node.y ? 1 : -1;
            }
        });
    };
    MenuMapper.prototype.writeToFile = function (data) {
        var clone = _.cloneDeep(data, function (property) {
            if (typeof property === 'function')
                return null;
        });
        clone = JSON.stringify(clone, null, 2);
        var name = 'data ' + (new Date()).toISOString().replace(':', '-').substring(0, 16) + '.json';
        try {
            fs.writeFile(name, clone, function (err) {
                if (err)
                    return console.error('Error saving locations to local file: ' + err);
                console.log('Data file saved successfully');
            });
        }
        catch (e) {
            console.error(e);
        }
    };
    MenuMapper.prototype.sameDirection = function (origin, a, b) {
        if (origin.y - a.node.y > origin.y - b.node.y)
            var d = a.distance;
        else
            d = b.distance;
        // using sin alpha = (y1 - y0)/d1
        var alpha = Math.asin(Math.abs(a.node.y - b.node.y) / d);
        return alpha < MIN_ANGLE_FOR_DIFF_DIRS;
    };
    MenuMapper.prototype.lineDistance = function (point1, point2) {
        var xs = 0;
        var ys = 0;
        xs = point2.x - point1.x;
        xs = xs * xs;
        ys = point2.y - point1.y;
        ys = ys * ys;
        return Math.sqrt(xs + ys);
    };
    MenuMapper.prototype.convertToShifafaFormat = function (rectangles, width, height) {
    };
    MenuMapper.prototype.start = function (page, menu, callback) {
        var image = {
            width: menu.Width,
            height: page.Height,
            levels: 1
        };
        var rects = this.constructRects(page.Texts, image);
        // important to find out if ever R has more than one elemnent
        var index = _.findIndex(rects, function (r) {
            return r.base_node.R.length > 1;
        });
        if (index > -1)
            console.error('oh no, R does have more than one entry sometimes...');
        var name = "what's in a name? " + Math.round(Math.random() * 10);
        var coverPhoto = '/public/images/menu/alpha/cover.jpg';
        var format = 'jpg';
        try {
            this.calculateSections(rects, image);
        }
        catch (e) {
            console.error(e);
        }
        var pages = {
            number: 1,
            name: 'UNKNOWN',
            source: '/public/images/menu/alpha/1.png',
            format: 'png',
            start: [0, 0],
            end: [1, 1],
            sections: rects
        };
        this.writeToFile(pages);
        callback(null, pages);
    };
    MenuMapper.prototype.calculateSections = function (rects, image) {
        var _this = this;
        var partition = this.partitionByFont(rects, image);
        if (!partition.children.length)
            return partition.children;
        if (this.containsOneFontSize(partition.children))
            var immediateChildren = partition.children;
        else {
            image.levels++;
            if (image.levels == 500)
                console.log('Probably stuck in a loop...');
            immediateChildren = process.nextTick(this.calculateSections.bind(this, partition.children, image));
        }
        var canvas = new Canvas(this, image);
        _.forEach(partition.parents, function (parent) {
            //console.log('Processing node ' + parent.toString());
            canvas.add(parent);
            parent.subsections = _this.findSubsections(parent, immediateChildren).subsections;
        });
        return partition.parents;
    };
    MenuMapper.prototype.partitionByFont = function (rects, image) {
        var _this = this;
        var max = _.max(rects, function (r) {
            return r.base_node.R[0].TS[1];
        });
        var partition = _.partition(rects, function (r) {
            return _this.compareFonts(r, max) == 0;
        });
        return {
            parents: partition[0],
            children: partition[1]
        };
    };
    MenuMapper.prototype.containsOneFontSize = function (rects) {
        return Object.keys(_.groupBy(rects, function (r) {
            return r.base_node.R[0].TS[1];
        })).length == 1;
    };
    MenuMapper.prototype.findSubsections = function (parent, rects) {
        var _this = this;
        var partition = _.partition(rects, function (r) {
            return _this.isContainedInside(r, parent);
        });
        return {
            subsections: partition[0],
            not: partition[1]
        };
    };
    MenuMapper.prototype.isContainedInside = function (sub, parent) {
        var x_sub = sub.base_node.x;
        var y_sub = sub.base_node.y;
        var x_par = parent.base_node.x;
        var y_par = parent.base_node.y;
        var condition = x_sub >= x_par && x_sub <= x_par + parent.width()
            && y_sub >= y_par && y_sub <= y_par + parent.height();
        if (condition)
            console.log('a subsection found');
        return condition;
    };
    MenuMapper.prototype.compareFonts = function (a, b) {
        var afs = a.base_node.R[0].TS[1];
        var afw = a.base_node.R[0].TS[2];
        var bfs = b.base_node.R[0].TS[1];
        var bfw = a.base_node.R[0].TS[2];
        return afs - bfs < 0 ? 1 : (afs - bfs > 0 ? -1 : (afw - bfw < 0 ? 1 : (afw - bfw > 0 ? -1 : 0)));
    };
    MenuMapper.prototype.findNextUnchecked = function (rects) {
        return _.find(rects, function (r) {
            return !r.checked;
        });
    };
    MenuMapper.prototype.findComparableElement = function (rect, rects, image) {
        var _this = this;
        var fittingRects = [];
        _.forEach(rects, function (r) {
            if (!r.checked && _this.isComparableFontTo(rect, r)) {
                console.log('Found fitting rect for size ' + r.base_node.R[0].TS[1] + ': ' + r.toString());
                fittingRects.push(r);
            }
        });
        return fittingRects;
    };
    MenuMapper.prototype.isComparableFontTo = function (original, rect) {
        var fontSize = original.base_node.R[0].TS[1];
        return rect.base_node.R[0].TS[1] == fontSize;
    };
    MenuMapper.prototype.isPositionedAfter = function (elem, anchor, image) {
        var DELTA_X = 0.01 * image.width * 0;
        var DELTA_Y = 0.01 * image.height * 0;
        return elem.x >= anchor.x - DELTA_X && elem.y >= anchor.y - DELTA_Y;
    };
    MenuMapper.prototype.isPositionedAfterInX = function (elem, anchor, image) {
        var DELTA_X = 0.01 * image.width * 0;
        return elem.x >= anchor.x - DELTA_X;
    };
    MenuMapper.prototype.isPositionedAfterInY = function (elem, anchor, image) {
        var DELTA_Y = 0.01 * image.height * 0;
        return elem.y >= anchor.y - DELTA_Y;
    };
    return MenuMapper;
})();
exports.MenuMapper = MenuMapper;
//# sourceMappingURL=menu-mapper.js.map