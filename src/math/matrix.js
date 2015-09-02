var fillArray = require('./../utils').fillArray;

exports.Matrix = class Matrix {
    constructor(rows, columns, element) {
        this.contents = [];
        for(var i = 0; i < rows; i++) {
            this.contents.push(fillArray(element, columns));
        }
    }

    get(row, column) {
        //console.log(row, column);
        return this.contents[row][column];
    }

    set(row, column, value) {
        return this.contents[row][column] = value;
    }

    atRow(rowId) {
        return this.contents[rowId];
    }

    atColumn(columnId) {
        return this.contents.map(row => row[columnId]);
    }

    static rowsColumnsElement(rows, columns, element) {
        return new Matrix(rows, columns, element);
    }
};
