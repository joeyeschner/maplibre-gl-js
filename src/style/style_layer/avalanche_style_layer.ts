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
    reportTexture: Texture;
    snowCardTexture: Texture;
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
        const currentReport = [
            {
                "regionCode": "AT-02-01",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-02-02",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-02-03",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-02-04",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-05",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-06",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-07",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-08",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-09",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-02-10",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-11",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-12",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-13",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-14",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-15",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-16",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-17",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-18",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-02-19",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-03-01",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-03-02",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-03-03",
                "dangerBorder": 0,
                "dangerRatingHi": 0,
                "dangerRatingLo": 0,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-11-15T15:56:34.224Z",
                "endTime": "2022-11-15T15:56:34.224Z"
            },
            {
                "regionCode": "AT-03-04",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-03-05",
                "dangerBorder": 0,
                "dangerRatingHi": 0,
                "dangerRatingLo": 0,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-11-15T15:56:34.228Z",
                "endTime": "2022-11-15T15:56:34.228Z"
            },
            {
                "regionCode": "AT-03-06",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-04-01",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-02",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-03",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-04",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-05",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-06",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-07",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-08",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-04-09",
                "dangerBorder": 1800,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-01",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-05-02",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-03",
                "dangerBorder": 2600,
                "dangerRatingHi": 3,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-05-04",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-05",
                "dangerBorder": 2600,
                "dangerRatingHi": 3,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-05-06",
                "dangerBorder": 2600,
                "dangerRatingHi": 3,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-05-07",
                "dangerBorder": 2600,
                "dangerRatingHi": 3,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-05-08",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-09",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-10",
                "dangerBorder": 2600,
                "dangerRatingHi": 3,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-05-11",
                "dangerBorder": 2600,
                "dangerRatingHi": 3,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-05-12",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-13",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-14",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-15",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-16",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-17",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-18",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-19",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-20",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-05-21",
                "dangerBorder": 2000,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-01",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-02",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-03",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-04-01",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-04-02",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-05",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-06",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-07",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-08",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-09",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-10",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-11",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-12",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-06-13",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-06-14",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-06-15",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-06-16",
                "dangerBorder": 0,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T22:00:00.000Z"
            },
            {
                "regionCode": "AT-06-17",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-06-18",
                "dangerBorder": null,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-11T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-01",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-02-01",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-02-02",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-03",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-04-01",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-04-02",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-05",
                "dangerBorder": 2400,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-06",
                "dangerBorder": 2400,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-07",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-08",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-09",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-10",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-11",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-12",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-13",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-14-01",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-14-02",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-14-03",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-14-04",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-14-05",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-15",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-16",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-17-01",
                "dangerBorder": 2400,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-17-02",
                "dangerBorder": 2400,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-18",
                "dangerBorder": 2400,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-19",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-20",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-21",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-22",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-23",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-24",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-24",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-25",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-25",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-26",
                "dangerBorder": 2600,
                "dangerRatingHi": 2,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-27",
                "dangerBorder": 2600,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-28",
                "dangerBorder": 2600,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-07-29",
                "dangerBorder": 2600,
                "dangerRatingHi": 1,
                "dangerRatingLo": 1,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-10T22:00:00.000Z",
                "endTime": "2022-04-12T10:00:00.000Z"
            },
            {
                "regionCode": "AT-08-01",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            },
            {
                "regionCode": "AT-08-02",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            },
            {
                "regionCode": "AT-08-03-01",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            },
            {
                "regionCode": "AT-08-03-02",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            },
            {
                "regionCode": "AT-08-04",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            },
            {
                "regionCode": "AT-08-05-01",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            },
            {
                "regionCode": "AT-08-05-02",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            },
            {
                "regionCode": "AT-08-06",
                "dangerBorder": 0,
                "dangerRatingHi": 2,
                "dangerRatingLo": 2,
                "unfavorableStart": 0,
                "unfavorableEnd": 0,
                "startTime": "2022-04-11T05:27:16.000Z",
                "endTime": "2022-04-12T06:00:00.000Z"
            }
        ]
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

        const normalizedTexture = this.normalizeTexture(reportLength, colorData);
        const textureData = normalizedTexture.textureData;
        const sideLength = normalizedTexture.sideLength;

        const reportImage = new RGBAImage({width: sideLength, height: sideLength}, textureData)
        return new Texture(context, reportImage, gl.RGBA, {premultiply: false});
    }

    // Converts color data array to power of two sized texture data
    private normalizeTexture(rowLength: number, colorData: any[]) {
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
                    colorData.push(this.convertRatingToColor(favorable[i][j]));
                } else {
                    colorData.push(this.convertRatingToColor(unfavorable[i][j - favorable[i].length]));
                }
            }
        }

        const normalizedTexture = this.normalizeTexture(favorable.length, colorData);
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

}

export default AvalancheStyleLayer;
