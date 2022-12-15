import StyleLayer from '../style_layer';

import type {AvalanchePaintProps} from './avalanche_style_layer_properties.g';
import properties, {AvalanchePaintPropsPossiblyEvaluated} from './avalanche_style_layer_properties.g';
import {PossiblyEvaluated, Transitionable, Transitioning} from '../properties';
import type {LayerSpecification} from '../../style-spec/types.g';
import Painter from "../../render/painter";
import {packFloatToColor} from "../../shaders/encode_attribute";
import {RGBAImage} from "../../util/image";
import Texture from "../../render/texture";
import Color from "../../style-spec/util/color";

class AvalancheStyleLayer extends StyleLayer {
    _transitionablePaint: Transitionable<AvalanchePaintProps>;
    _transitioningPaint: Transitioning<AvalanchePaintProps>;
    paint: PossiblyEvaluated<AvalanchePaintProps, AvalanchePaintPropsPossiblyEvaluated>;
    regionsSource: string;
    visualizationType: string;
    reportTexture: Texture;
    avalancheReport: string;
    snowCardTexture: Texture;
    ratingColors: Array<Array<number>>;

    constructor(layer: LayerSpecification) {
        super(layer, properties);
        this.regionsSource = layer.layout['avalanche-regions-data'];
        this.visualizationType = layer.layout['avalanche-visualization-type'];
        this.avalancheReport = layer.layout['avalanche-report'];
        this.getRatingColors();
    }

    hasOffscreenPass() {
        return this.paint.get('avalanche-exaggeration') !== 0 && this.visibility !== 'none';
    }

    getRatingColors() {
        if (!this.ratingColors) {
            this.parseRatingColors();
            return this.ratingColors;
        } else {
            this.parseRatingColors();
            return this.ratingColors;
        }
    }

    parseRatingColors() {
        const colorSource = this.paint.get('avalanche-rating-color')
        this.ratingColors = colorSource.map(function (col) {
            let color = Color.parse(col) as Color;
            return [color.r, color.g, color.b, color.a]
        });
    }

    // Convert avalanche report into texture to pass into avalanche shader
    buildReportTexture(painter: Painter) {
        const context = painter.context;
        const gl = context.gl;
        const self = this;

        if (this.avalancheReport) {
            const currentReport = JSON.parse(this.avalancheReport);
            const reportLength = currentReport.length;
            let colorData = [];
            for (let i = 0; i < reportLength; i++) {
                const regionReport = currentReport[i];
                colorData.push(packFloatToColor(regionReport.dangerBorder));
                colorData.push(packFloatToColor(regionReport.dangerRatingHi));
                colorData.push(packFloatToColor(regionReport.dangerRatingLo));
                colorData.push(packFloatToColor(regionReport.unfavorableStart));
                colorData.push(packFloatToColor(regionReport.unfavorableEnd));
            }

            const normalizedTexture = AvalancheStyleLayer.normalizeTexture(reportLength, colorData);
            const textureData = normalizedTexture.textureData;
            const sideLength = normalizedTexture.sideLength;

            const reportImage = new RGBAImage({width: sideLength, height: sideLength}, textureData)
            self.reportTexture = new Texture(context, reportImage, gl.RGBA, {premultiply: false});
        } else {
            console.log("Could not display load requested avalanche report. No valid report provided");
        }
    }

    // Converts color data array to power of two sized texture data
    private static normalizeTexture(rowLength: number, colorData: any[]) {
        // Get the closest power of 2 for texture size
        let paddedLength = rowLength - 1;
        paddedLength |= paddedLength >> 1;
        paddedLength |= paddedLength >> 2;
        paddedLength |= paddedLength >> 4;
        paddedLength |= paddedLength >> 8;
        paddedLength |= paddedLength >> 16;
        paddedLength++;

        // Length of one entry in the colorData array is number of values per row * number of color channels (e.g. 5 * 4)
        const entryLength = (colorData.length / rowLength) * 4;

        colorData = colorData.flat();
        let textureData = new Uint8Array(paddedLength * paddedLength * 4);

        let stride = 0;
        let colorStride = 0;
        for (let i = 0; i < colorData.length / entryLength; i++) {
            for (let j = 0; j < entryLength; j++) {
                textureData[stride + j] = colorData[colorStride + j];
            }
            // Add one line offset -> number of pixels * number of channels
            stride += paddedLength * 4;
            colorStride += entryLength;
        }

        return {textureData: textureData, sideLength: paddedLength};
    }

    buildSnowCardTexture(painter: Painter) {
        const favorable = [
            [1, 1, 1, 2, 5],
            [1, 1, 1, 3, 5],
            [1, 1, 1, 4, 5],
            [1, 1, 2, 4, 5],
            [1, 1, 2, 5, 5],
            [1, 2, 3, 5, 5],
            [1, 2, 3, 5, 5],
            [1, 2, 3, 5, 5],
            [2, 2, 3, 5, 5],
            [2, 2, 3, 5, 5],
            [2, 2, 4, 5, 5],
            [2, 3, 4, 5, 5],
            [2, 3, 4, 5, 5],
            [2, 3, 5, 5, 5],
            [2, 3, 5, 5, 5],
            [2, 3, 5, 5, 5]
        ];

        const unfavorable = [
            [1, 1, 1, 2, 5],
            [1, 1, 1, 3, 5],
            [1, 1, 1, 4, 5],
            [2, 2, 2, 5, 5],
            [2, 2, 3, 5, 5],
            [2, 2, 4, 5, 5],
            [2, 3, 4, 5, 5],
            [2, 3, 4, 5, 5],
            [3, 4, 5, 5, 5],
            [3, 4, 5, 5, 5],
            [3, 4, 5, 5, 5],
            [3, 4, 5, 5, 5],
            [3, 5, 5, 5, 5],
            [4, 5, 5, 5, 5],
            [4, 5, 5, 5, 5],
            [4, 5, 5, 5, 5]
        ];

        const context = painter.context;
        const gl = context.gl;

        let colorData = [];
        for (let i = 0; i < favorable.length; i++) {
            for (let j = 0; j < favorable[i].length * 2; j++) {
                if (j < favorable[i].length) {
                    colorData.push(this.convertRatingToPaintColor(favorable[i][j]));
                } else {
                    colorData.push(this.convertRatingToPaintColor(unfavorable[i][j - favorable[i].length]));
                }
            }
        }

        const normalizedTexture = AvalancheStyleLayer.normalizeTexture(favorable.length, colorData);
        const textureData = normalizedTexture.textureData;
        const sideLength = normalizedTexture.sideLength;

        const reportImage = new RGBAImage({width: sideLength, height: sideLength}, textureData)
        return new Texture(context, reportImage, gl.RGBA, {premultiply: false});
    }

    convertRatingToColor(rating: number) {
        switch (rating) {
            case 1:
                return [0, 255, 0, 255];
            case 2:
                return [255, 255, 0, 255];
            case 3:
                return [255, 136, 0, 255];
            case 4:
                return [255, 0, 0, 255];
            case 5:
                return [136, 0, 0, 255];
            default:
                return [255, 255, 255, 255];
        }
    }

    convertRatingToPaintColor(rating: number) {
        this.getRatingColors();
        return this.ratingColors[rating - 1].map((component) => {
            return component * 255
        });
    }

}

export default AvalancheStyleLayer;
