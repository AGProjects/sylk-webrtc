'use strict';

const { colors } = require('@material-ui/core');
const murmur = require('murmurhash-js');

// Available material design colors
const availableColors = [
    colors.red,         colors.pink,    colors.purple,      colors.deepPurple,
    colors.indigo,      colors.blue,    colors.lightBlue,   colors.cyan,
    colors.teal,        colors.green,   colors.lightGreen,  colors.lime,
    colors.yellow,      colors.amber,   colors.orange,      colors.deepOrange,
    colors.brown,       colors.grey,    colors.blueGrey
];

function generateColor(text) {
    return availableColors[(murmur.murmur3(text) % availableColors.length)];
}

exports.generateColor = generateColor;
