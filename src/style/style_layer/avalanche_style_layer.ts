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
    ratingColors: Array<Array<number>>;

    constructor(layer: LayerSpecification) {
        super(layer, properties);
        this.regionsSource = layer.layout['avalanche-regions-data'];
    }

    hasOffscreenPass() {
        return this.paint.get('avalanche-exaggeration') !== 0 && this.visibility !== 'none';
    }

    getRatingColors() {
        if (!this.ratingColors) {
            this.parseRatingColors();
            return this.ratingColors;
        } else {
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

    buildReportTexture(painter: Painter) {
        const context = painter.context;
        const gl = context.gl;
        const currentReport = [{"regionCode":"AT-05-01","dangerBorder":0,"dangerRatingHi":1,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T22:00:00.000Z"},{"regionCode":"AT-05-02","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-03","dangerBorder":2600,"dangerRatingHi":3,"dangerRatingLo":2,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T22:00:00.000Z"},{"regionCode":"AT-05-04","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-05","dangerBorder":2600,"dangerRatingHi":3,"dangerRatingLo":2,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T22:00:00.000Z"},{"regionCode":"AT-05-06","dangerBorder":2600,"dangerRatingHi":3,"dangerRatingLo":2,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T22:00:00.000Z"},{"regionCode":"AT-05-07","dangerBorder":2600,"dangerRatingHi":3,"dangerRatingLo":2,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T22:00:00.000Z"},{"regionCode":"AT-05-08","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-09","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-10","dangerBorder":2600,"dangerRatingHi":3,"dangerRatingLo":2,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T22:00:00.000Z"},{"regionCode":"AT-05-11","dangerBorder":2600,"dangerRatingHi":3,"dangerRatingLo":2,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T22:00:00.000Z"},{"regionCode":"AT-05-12","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-13","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-14","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-15","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-16","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-17","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-18","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-19","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-20","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"},{"regionCode":"AT-05-21","dangerBorder":2000,"dangerRatingHi":2,"dangerRatingLo":1,"unfavorableStart":0,"unfavorableEnd":0,"startTime":"2022-04-10T22:00:00.000Z","endTime":"2022-04-11T10:00:00.000Z"}]
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
        colorData = colorData.flat();
        let textureData = new Uint8Array(colorData.length);
        for (let i = 0; i < colorData.length; i++) {
            textureData[i] = colorData[i];
        }

        const reportImage = new RGBAImage({width: 5, height: reportLength}, textureData)
        return new Texture(context, reportImage, gl.RGBA, {premultiply: false});
    }
}

export default AvalancheStyleLayer;
