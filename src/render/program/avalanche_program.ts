import {mat4} from 'gl-matrix';

import {
    Uniform1i,
    Uniform1f,
    Uniform2f,
    UniformColor,
    UniformMatrix4f,
    Uniform4f,
    UniformVector4f
} from '../uniform_binding';
import EXTENT from '../../data/extent';
import MercatorCoordinate from '../../geo/mercator_coordinate';

import type Context from '../../gl/context';
import type {UniformValues, UniformLocations} from '../uniform_binding';
import type Tile from '../../source/tile';
import type Painter from '../painter';
import type AvalancheStyleLayer from '../../style/style_layer/avalanche_style_layer';
import type DEMData from '../../data/dem_data';
import type {OverscaledTileID} from '../../source/tile_id';
import Color from "../../style-spec/util/color";

export type AvalancheUniformsType = {
    'u_matrix': UniformMatrix4f;
    'u_image': Uniform1i;
    'u_latrange': Uniform2f;
    'u_light': Uniform2f;
    'u_shadow': UniformColor;
    'u_highlight': UniformColor;
    'u_accent': UniformColor;
};

export type AvalanchePrepareUniformsType = {
    'u_matrix': UniformMatrix4f;
    'u_image': Uniform1i;
    'u_regions': Uniform1i;
    'u_snow_card': Uniform1i;
    'u_report': Uniform1i;
    'u_report_dimension': Uniform2f;
    'u_ratings': UniformVector4f;
    'u_dimension': Uniform2f;
    'u_zoom': Uniform1f;
    'u_unpack': Uniform4f;
};

const avalancheUniforms = (context: Context, locations: UniformLocations): AvalancheUniformsType => ({
    'u_matrix': new UniformMatrix4f(context, locations.u_matrix),
    'u_image': new Uniform1i(context, locations.u_image),
    'u_latrange': new Uniform2f(context, locations.u_latrange),
    'u_light': new Uniform2f(context, locations.u_light),
    'u_shadow': new UniformColor(context, locations.u_shadow),
    'u_highlight': new UniformColor(context, locations.u_highlight),
    'u_accent': new UniformColor(context, locations.u_accent)
});

const avalanchePrepareUniforms = (context: Context, locations: UniformLocations): AvalanchePrepareUniformsType => ({
    'u_matrix': new UniformMatrix4f(context, locations.u_matrix),
    'u_image': new Uniform1i(context, locations.u_image),
    'u_regions': new Uniform1i(context, locations.u_regions),
    'u_snow_card': new Uniform1i(context, locations.u_snow_card),
    'u_report': new Uniform1i(context, locations.u_report),
    'u_report_dimension': new Uniform2f(context, locations.u_report_dimension),
    'u_ratings': new UniformVector4f(context, locations.u_ratings),
    'u_dimension': new Uniform2f(context, locations.u_dimension),
    'u_zoom': new Uniform1f(context, locations.u_zoom),
    'u_unpack': new Uniform4f(context, locations.u_unpack)
});

const avalancheUniformValues = (
    painter: Painter,
    tile: Tile,
    layer: AvalancheStyleLayer,
    coord: OverscaledTileID
): UniformValues<AvalancheUniformsType> => {
    const shadow = layer.paint.get('avalanche-shadow-color');
    const highlight = layer.paint.get('avalanche-highlight-color');
    const accent = layer.paint.get('avalanche-accent-color');

    let azimuthal = layer.paint.get('avalanche-illumination-direction') * (Math.PI / 180);
    // modify azimuthal angle by map rotation if light is anchored at the viewport
    if (layer.paint.get('avalanche-illumination-anchor') === 'viewport') {
        azimuthal -= painter.transform.angle;
    }
    const align = !painter.options.moving;
    return {
        'u_matrix': coord ? coord.posMatrix : painter.transform.calculatePosMatrix(tile.tileID.toUnwrapped(), align),
        'u_image': 0,
        'u_latrange': getTileLatRange(painter, tile.tileID),
        'u_light': [layer.paint.get('avalanche-exaggeration'), azimuthal],
        'u_shadow': shadow,
        'u_highlight': highlight,
        'u_accent': accent
    };
};

const avalancheUniformPrepareValues = (tileID: OverscaledTileID, dem: DEMData, reportSize: [number, number], ratingColors: Array<Array<number>>): UniformValues<AvalanchePrepareUniformsType> => {

    const stride = dem.stride;
    const matrix = mat4.create();
    // Flip rendering at y axis.
    mat4.ortho(matrix, 0, EXTENT, -EXTENT, 0, 0, 1);
    mat4.translate(matrix, matrix, [0, -EXTENT, 0]);

    return {
        'u_matrix': matrix,
        'u_image': 1,
        'u_regions': 4,
        'u_snow_card': 6,
        'u_report': 5,
        'u_report_dimension': reportSize,
        'u_ratings': ratingColors,
        'u_dimension': [stride, stride],
        'u_zoom': tileID.overscaledZ,
        'u_unpack': dem.getUnpackVector()
    };
};

function getTileLatRange(painter: Painter, tileID: OverscaledTileID) {
    // for scaling the magnitude of a points slope by its latitude
    const tilesAtZoom = Math.pow(2, tileID.canonical.z);
    const y = tileID.canonical.y;
    return [
        new MercatorCoordinate(0, y / tilesAtZoom).toLngLat().lat,
        new MercatorCoordinate(0, (y + 1) / tilesAtZoom).toLngLat().lat];
}

export {
    avalancheUniforms,
    avalanchePrepareUniforms,
    avalancheUniformValues,
    avalancheUniformPrepareValues
};
