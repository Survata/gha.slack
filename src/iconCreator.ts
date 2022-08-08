// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { createCanvas, registerFont } from 'canvas';
import { s3Client } from './s3Client';

export namespace iconCreator {
    export async function conditionallyCreate(name: string) {
        console.log('checking image', name)
        const imageExists = await s3Client.checkIfExists(name);
        if (!imageExists) {
            console.log('creating image', name)
            await create(name);
        }
    }

    export async function create(name: string) {
        registerFont('src/Inter-Medium.ttf', { family: 'Inter' });

        const shortName = getAbbreviatedName(name);

        // hash the full name and then mod it to select the background color
        const nameHash = getNameHash(name);
        const hiIndex = nameHash % backgroundColors.length;
        const backgroundColor = backgroundColors[hiIndex][1];

        // Create the canvas and get the context
        const size = 192; // it's a square so x == y
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        // Draw the background as a square with rounded corners
        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.moveTo(size, size);
        ctx.arcTo(0, size, 0, 0, 30);
        ctx.arcTo(0, 0, size, 0, 30);
        ctx.arcTo(size, 0, size, size, 30);
        ctx.arcTo(size, size, 0, size, 30);
        ctx.fill();

        // Draw the abbreviated name
        ctx.font = '160px Inter';
        ctx.fillStyle = 'midnightblue';
        ctx.fillText(shortName, 5, 155, 185); // setting maxWidth condenses the text to fit

        // Save the canvas as a png
        try {
            const canvasData = await canvas.toBuffer('image/png');
            await s3Client.save(name, canvasData);
        } catch (e) {
            console.log(e);
            return 'Could not create png image this time.';
        }
    }
}

/**
 * Get the abbreviated name from the full name.
 *
 * Abbreviated name is always the first character and then
 * - the character after the first hyphen, or
 * - the first upper case character
 *
 * If the full name is namespaces (i.e. has periods) then use the last namespace value.
 *
 * example:
 *      athena-agent == AA
 *      athenaAgent.impressionLoader == IL
 *
 * @param name
 */
function getAbbreviatedName(name: string): string {
    // use the last namespace value if present
    const nameSplits = name.split('.');
    if (nameSplits.length > 0) {
        name = nameSplits[nameSplits.length - 1];
    }

    let abbreviatedName = '';
    let hyphenFound = false;

    // walk the characters to build the abbreviated name
    for (let i = 0; i < name.length; i++) {
        let char = name.charAt(i);
        if (i === 0) {
            abbreviatedName = abbreviatedName.concat(char);
            continue; // always use the first char
        }

        if (char === '-') {
            hyphenFound = true;
            continue; // next char will be used
        }

        if (hyphenFound) {
            abbreviatedName = abbreviatedName.concat(char);
            break; // done looking
        }

        if (char === char.toUpperCase()) {
            abbreviatedName = abbreviatedName.concat(char);
            break; // done looking
        }
    }

    return abbreviatedName.toUpperCase();
}

/**
 * Computes a hash of the name.
 *
 * @param name
 */
function getNameHash(name: string): number {
    if (name.length === 0) {
        return 0;
    }

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }

    //
    return Math.abs(hash);
}

// commented out lines are colors that do not render well with the midnightblue text
const backgroundColors = [
    ['aliceblue', '#f0f8ff'],
    ['antiquewhite', '#faebd7'],
    ['aqua', '#00ffff'],
    ['aquamarine', '#7fffd4'],
    ['azure', '#f0ffff'],
    ['beige', '#f5f5dc'],
    ['bisque', '#ffe4c4'],
    // ['black','#000000'],
    ['blanchedalmond', '#ffebcd'],
    // ['blue','#0000ff'],
    ['blueviolet', '#8a2be2'],
    ['brown', '#a52a2a'],
    ['burlywood', '#deb887'],
    ['cadetblue', '#5f9ea0'],
    ['chartreuse', '#7fff00'],
    ['chocolate', '#d2691e'],
    ['coral', '#ff7f50'],
    ['cornflowerblue', '#6495ed'],
    ['cornsilk', '#fff8dc'],
    ['crimson', '#dc143c'],
    // ['darkblue','#00008b'],
    ['darkcyan', '#008b8b'],
    ['darkgoldenrod', '#b8860b'],
    ['darkgray', '#a9a9a9'],
    ['darkgreen', '#006400'],
    ['darkkhaki', '#bdb76b'],
    ['darkmagenta', '#8b008b'],
    ['darkolivegreen', '#556b2f'],
    ['darkorange', '#ff8c00'],
    ['darkorchid', '#9932cc'],
    ['darkred', '#8b0000'],
    ['darksalmon', '#e9967a'],
    ['darkseagreen', '#8fbc8f'],
    // ['darkslateblue','#483d8b'],
    // ['darkslategray','#2f4f4f'],
    ['darkturquoise', '#00ced1'],
    // ['darkviolet','#9400d3'],
    ['deeppink', '#ff1493'],
    ['deepskyblue', '#00bfff'],
    ['dimgray', '#696969'],
    ['dodgerblue', '#1e90ff'],
    ['firebrick', '#b22222'],
    ['floralwhite', '#fffaf0'],
    ['forestgreen', '#228b22'],
    ['fuchsia', '#ff00ff'],
    ['gainsboro', '#dcdcdc'],
    ['ghostwhite', '#f8f8ff'],
    ['gold', '#ffd700'],
    ['goldenrod', '#daa520'],
    ['gray', '#808080'],
    ['green', '#008000'],
    ['greenyellow', '#adff2f'],
    ['honeydew', '#f0fff0'],
    ['hotpink', '#ff69b4'],
    ['indianred', '#cd5c5c'],
    // ['indigo','#4b0082'],
    ['ivory', '#fffff0'],
    ['khaki', '#f0e68c'],
    ['lavender', '#e6e6fa'],
    ['lavenderblush', '#fff0f5'],
    // ['lawngreen','#7cfc00'],
    ['lemonchiffon', '#fffacd'],
    ['lightblue', '#add8e6'],
    ['lightcoral', '#f08080'],
    ['lightcyan', '#e0ffff'],
    ['lightgoldenrodyellow', '#fafad2'],
    ['lightgray', '#d3d3d3'],
    ['lightgreen', '#90ee90'],
    ['lightpink', '#ffb6c1'],
    ['lightsalmon', '#ffa07a'],
    ['lightseagreen', '#20b2aa'],
    ['lightskyblue', '#87cefa'],
    ['lightslategray', '#778899'],
    ['lightsteelblue', '#b0c4de'],
    ['lightyellow', '#ffffe0'],
    ['lime', '#00ff00'],
    ['limegreen', '#32cd32'],
    ['linen', '#faf0e6'],
    // ['maroon','#800000'],
    ['mediumaquamarine', '#66cdaa'],
    // ['mediumblue','#0000cd'],
    ['mediumorchid', '#ba55d3'],
    ['mediumpurple', '#9370db'],
    ['mediumseagreen', '#3cb371'],
    ['mediumslateblue', '#7b68ee'],
    ['mediumspringgreen', '#00fa9a'],
    ['mediumturquoise', '#48d1cc'],
    ['mediumvioletred', '#c71585'],
    // ['midnightblue','#191970'],
    ['mintcream', '#f5fffa'],
    ['mistyrose', '#ffe4e1'],
    ['moccasin', '#ffe4b5'],
    ['navajowhite', '#ffdead'],
    // ['navy','#000080'],
    ['oldlace', '#fdf5e6'],
    ['olive', '#808000'],
    ['olivedrab', '#6b8e23'],
    ['orange', '#ffa500'],
    ['orangered', '#ff4500'],
    ['orchid', '#da70d6'],
    ['palegoldenrod', '#eee8aa'],
    ['palegreen', '#98fb98'],
    ['paleturquoise', '#afeeee'],
    ['palevioletred', '#db7093'],
    ['papayawhip', '#ffefd5'],
    ['peachpuff', '#ffdab9'],
    ['peru', '#cd853f'],
    ['pink', '#ffc0cb'],
    ['plum', '#dda0dd'],
    ['powderblue', '#b0e0e6'],
    // ['purple','#800080'],
    // ['rebeccapurple','#663399'],
    ['red', '#ff0000'],
    ['rosybrown', '#bc8f8f'],
    ['royalblue', '#4169e1'],
    ['saddlebrown', '#8b4513'],
    ['salmon', '#fa8072'],
    ['sandybrown', '#f4a460'],
    ['seagreen', '#2e8b57'],
    ['seashell', '#fff5ee'],
    ['sienna', '#a0522d'],
    ['silver', '#c0c0c0'],
    ['skyblue', '#87ceeb'],
    // ['slateblue','#6a5acd'],
    ['slategray', '#708090'],
    ['snow', '#fffafa'],
    ['springgreen', '#00ff7f'],
    ['steelblue', '#4682b4'],
    ['tan', '#d2b48c'],
    ['teal', '#008080'],
    ['thistle', '#d8bfd8'],
    ['tomato', '#ff6347'],
    // ['turquoise','#40e0d0'],
    ['violet', '#ee82ee'],
    ['wheat', '#f5deb3'],
    ['white', '#ffffff'],
    ['whitesmoke', '#f5f5f5'],
    // ['yellow','#ffff00'],
    ['yellowgreen', '#9acd32'],
];
