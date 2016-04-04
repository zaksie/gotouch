
//import {logging, gapis, config, duid, app} from '../../app';
//import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
//import {BUSINESS_KEY} from './business';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash'),
    fs = require('fs');

class ClosestPoint {
    distance = Number.MAX_VALUE;
    node = null;
}
class Rectangle {
    constructor(base_node) {
        this.base_node = base_node;
    }
    base_node;
    neighbors = [new ClosestPoint(), new ClosestPoint(), new ClosestPoint()];
    sort() {
        this.neighbors.sort((a, b) => {
            // now sort so that the furthest neighbor is always first - that way we don't have to worry about removing a neighbor that is > than b but < c
            let c = b.distance - a.distance;
            return c > 0 ? 1 : (c < 0 ? -1 : 0);
        });
    }
    isValid() {
        return _.findIndex(this.neighbors, (neighbor) => {
            return _.isNull(neighbor.node);
        }) < 0;
    }
    print() {
        return _.map(this.neighbors, (neighbor) => {
            return neighbor.distance.toFixed(2).toString();
        });
    }
    toString() {
        return '[' + this.base_node.x + ', ' + this.base_node.y + ']';
    }
}
class Canvas {
    rects = [];
    image;
    mapper: MenuMapper;
    constructor(mapper, image) {
        this.mapper = mapper;
        this.image = image;
    }

    add(rect) {
        rect.width = function() {
            return this.end.x - this.start.x;
        };
        rect.height = function() {
            return this.end.y - this.start.y;
        };
        this.rects.push(rect);
        this.redivide();

        if (rect.width() < 0 || rect.height() < 0)
            console.error('problems...');
    }

    redivide() {
        _.forEach(this.rects, (r) => {
            r.start = r.start || { x: 0, y: 0 };
            r.end = this.findClosestToAndCorrectStart(r);
        });
    }

    findClosestToAndCorrectStart(rect) {
        let x_candidates = this.positionedAfterInX(rect);
        let y_candidates = this.positionedAfterInY(rect);
        let x_node = _.min(x_candidates, (r) => {
            return r.base_node.x;
        });
        if (x_node == Infinity)
            var x_middle = 1;
        else {
            x_middle = (x_node.base_node.x + rect.base_node.x) / 2 / this.image.width;
            x_node.start = x_node.start || { x: 0, y: 0 };
            x_node.start.x = x_middle;
        }
        let y_node = _.min(y_candidates, (r) => {
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
    }

    positionedAfterInX(rect) {
        return _.filter(this.rects, (r) => {
            return r !== rect && this.mapper.isPositionedAfterInX(r.base_node, rect.base_node, this.image);
        });
    }

    positionedAfterInY(rect) {
        return _.filter(this.rects, (r) => {
            return r !== rect && this.mapper.isPositionedAfterInY(r.base_node, rect.base_node, this.image);
        });
    }

}

const MIN_ANGLE_FOR_DIFF_DIRS = Math.PI / 36; //5 degs
export class MenuMapper {

    constructRects(arr, image) {
        let rectangles = [];
        let invalid_rectangles = [];
        for (let i = 0; i < arr.length; i++) {
            var a = arr[i];
            var rectangle = new Rectangle(a);
            for (let j = 1; j < arr.length; j++) {
                var b = arr[j];
                if (a !== b && this.isPositionedAfter(b, a, image)) {
                    var d = this.lineDistance(a, b);
                    let index = _.findIndex(rectangle.neighbors, (neighbor) => {
                        return d < neighbor.distance
                            && (_.isNull(neighbor.node) || this.sameDirection(a, neighbor, { node: b, distance: d }));
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
    }

    sortRectangleCollection(rectangles, options?) {
        options = options || {};
        rectangles.sort((a, b) => {
            switch (options.by) {
                case 'font':
                    return this.compareFonts(a, b);
                default:
                    return a.base_node.y > b.base_node.y ? 1 : -1;
            }
        });
    }
    writeToFile(data) {
        let clone = _.cloneDeep(data, (property) => {
            if (typeof property === 'function')
                return null;
        });
        clone = JSON.stringify(clone, null, 2);
        let name = 'data ' + (new Date()).toISOString().replace(':', '-').substring(0, 16) + '.json';
        try {
            fs.writeFile(name, clone, (err) => {
                if (err) return console.error('Error saving locations to local file: ' + err)
                console.log('Data file saved successfully');
            });
        }
        catch (e) {
            console.error(e);
        }
    }

    sameDirection(origin, a, b) {
        if (origin.y - a.node.y > origin.y - b.node.y)
            var d = a.distance;
        else
            d = b.distance;
        // using sin alpha = (y1 - y0)/d1
        let alpha = Math.asin(Math.abs(a.node.y - b.node.y) / d);
        return alpha < MIN_ANGLE_FOR_DIFF_DIRS;
    }
    lineDistance(point1, point2) {
        var xs = 0;
        var ys = 0;

        xs = point2.x - point1.x;
        xs = xs * xs;

        ys = point2.y - point1.y;
        ys = ys * ys;

        return Math.sqrt(xs + ys);
    }

    convertToShifafaFormat(rectangles, width, height) {

    }

    start(page, menu, callback) {
        let image = {
            width: menu.Width,
            height: page.Height,
            levels: 1
        };
        let rects = this.constructRects(page.Texts, image);
        // important to find out if ever R has more than one elemnent
        let index = _.findIndex(rects, (r) => {
            return r.base_node.R.length > 1;
        });
        if (index > -1)
            console.error('oh no, R does have more than one entry sometimes...');
        let name = "what's in a name? " + Math.round(Math.random() * 10);
        let coverPhoto = '/public/images/menu/alpha/cover.jpg';
        let format = 'jpg';
        try {
            this.calculateSections(rects, image);
        } catch (e) {
            console.error(e);
        }
        let pages = {
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
    }

    calculateSections(rects, image) {
        let partition = this.partitionByFont(rects, image);
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
        let canvas = new Canvas(this, image);
        _.forEach(partition.parents, (parent) => {
            //console.log('Processing node ' + parent.toString());
            canvas.add(parent);

            parent.subsections = this.findSubsections(parent, immediateChildren).subsections;
        });

        return partition.parents;
    }

    partitionByFont(rects, image) {
        let max = _.max(rects, (r) => {
            return r.base_node.R[0].TS[1];
        });
        let partition = _.partition(rects, (r) => {
            return this.compareFonts(r, max) == 0;
        });

        return {
            parents: partition[0],
            children: partition[1]
        }
    }
    containsOneFontSize(rects) {
        return Object.keys(_.groupBy(rects, (r) => {
            return r.base_node.R[0].TS[1];
        })).length == 1;
    }
    findSubsections(parent, rects) {
        let partition = _.partition(rects, (r) => {
            return this.isContainedInside(r, parent);
        });

        return {
            subsections: partition[0],
            not: partition[1]
        };
    }
    isContainedInside(sub, parent) {
        let x_sub = sub.base_node.x;
        let y_sub = sub.base_node.y;
        let x_par = parent.base_node.x;
        let y_par = parent.base_node.y;

        let condition = x_sub >= x_par && x_sub <= x_par + parent.width()
            && y_sub >= y_par && y_sub <= y_par + parent.height();
        if (condition)
            console.log('a subsection found');
        return condition;
    }

    compareFonts(a, b) {
        let afs = a.base_node.R[0].TS[1];
        let afw = a.base_node.R[0].TS[2];
        let bfs = b.base_node.R[0].TS[1];
        let bfw = a.base_node.R[0].TS[2];

        return afs - bfs < 0 ? 1 : (afs - bfs > 0 ? -1 : (afw - bfw < 0 ? 1 : (afw - bfw > 0 ? -1 : 0)));
    }

    findNextUnchecked(rects) {
        return _.find(rects, (r) => {
            return !r.checked;
        });
    }

    findComparableElement(rect, rects, image) {
        let fittingRects = [];
        _.forEach(rects, (r) => {
            if (!r.checked && this.isComparableFontTo(rect, r)) {
                console.log('Found fitting rect for size ' + r.base_node.R[0].TS[1] + ': ' + r.toString());
                fittingRects.push(r);
            }
        });

        return fittingRects;
    }
    isComparableFontTo(original, rect) {
        let fontSize = original.base_node.R[0].TS[1];
        return rect.base_node.R[0].TS[1] == fontSize;
    }
    isPositionedAfter(elem, anchor, image) {
        const DELTA_X = 0.01 * image.width * 0;
        const DELTA_Y = 0.01 * image.height * 0;
        return elem.x >= anchor.x - DELTA_X && elem.y >= anchor.y - DELTA_Y;
    }

    isPositionedAfterInX(elem, anchor, image) {
        const DELTA_X = 0.01 * image.width * 0;
        return elem.x >= anchor.x - DELTA_X;
    }


    isPositionedAfterInY(elem, anchor, image) {
        const DELTA_Y = 0.01 * image.height * 0;
        return elem.y >= anchor.y - DELTA_Y;
    }
}