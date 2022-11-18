import Texture from './texture';
import StencilMode from '../gl/stencil_mode';
import DepthMode from '../gl/depth_mode';
import CullFaceMode from '../gl/cull_face_mode';
import {
    avalancheUniformValues,
    avalancheUniformPrepareValues
} from './program/avalanche_program';

import type Painter from './painter';
import type SourceCache from '../source/source_cache';
import type AvalancheStyleLayer from '../style/style_layer/avalanche_style_layer';
import type {OverscaledTileID} from '../source/tile_id';
import Tile from "../source/tile";
import ColorMode from "../gl/color_mode";
import {RGBAImage} from "../util/image";
import {packFloatToColor, unpackColorToFloat} from "../shaders/encode_attribute";

export default drawAvalanche;

function drawAvalanche(painter: Painter, sourceCache: SourceCache, layer: AvalancheStyleLayer, tileIDs: Array<OverscaledTileID>) {
    if (painter.renderPass !== 'offscreen' && painter.renderPass !== 'translucent') return;

    const context = painter.context;

    const depthMode = painter.depthModeForSublayer(0, DepthMode.ReadOnly);
    const colorMode = painter.colorModeForRenderPass();

    const [stencilModes, coords] = painter.renderPass === 'translucent' ?
        painter.stencilConfigForOverlap(tileIDs) : [{}, tileIDs];

    // Get regions source property from layer
    const regionsSource = layer.regionsSource;

    for (const coord of coords) {
        const tile = sourceCache.getTile(coord);
        if (typeof tile.needsAvalanchePrepare !== 'undefined' && tile.needsAvalanchePrepare && painter.renderPass === 'offscreen') {
            prepareAvalanche(painter, tile, layer, depthMode, StencilMode.disabled, colorMode, regionsSource, coord);
        } else if (painter.renderPass === 'translucent') {
            renderAvalanche(painter, coord, tile, layer, depthMode, stencilModes[coord.overscaledZ], colorMode);
        }
    }

    context.viewport.set([0, 0, painter.width, painter.height]);
}

function renderAvalanche(
    painter: Painter,
    coord: OverscaledTileID,
    tile: Tile,
    layer: AvalancheStyleLayer,
    depthMode: Readonly<DepthMode>,
    stencilMode: Readonly<StencilMode>,
    colorMode: Readonly<ColorMode>) {
    const context = painter.context;
    const gl = context.gl;
    const fbo = tile.fbo;
    if (!fbo) return;

    const program = painter.useProgram('avalanche');
    const terrainData = painter.style.map.terrain && painter.style.map.terrain.getTerrainData(coord);

    context.activeTexture.set(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.colorAttachment.get());

    const terrainCoord = terrainData ? coord : null;
    program.draw(context, gl.TRIANGLES, depthMode, stencilMode, colorMode, CullFaceMode.disabled,
        avalancheUniformValues(painter, tile, layer, terrainCoord), terrainData, layer.id, painter.rasterBoundsBuffer,
        painter.quadTriangleIndexBuffer, painter.rasterBoundsSegments);

}

// avalanche risk rendering is done in two steps. the prepare step first calculates the slope of the terrain in the x and y
// directions for each pixel, and saves those values to a framebuffer texture in the r and g channels.
function prepareAvalanche(
    painter: Painter,
    tile: Tile,
    layer: AvalancheStyleLayer,
    depthMode: Readonly<DepthMode>,
    stencilMode: Readonly<StencilMode>,
    colorMode: Readonly<ColorMode>,
    secondaryData: string,
    coord: OverscaledTileID) {
    const context = painter.context;
    const gl = context.gl;
    const dem = tile.dem;

    if (dem && dem.data) {
        const tileSize = dem.dim;
        const textureStride = dem.stride;

        const pixelData = dem.getPixels();
        context.activeTexture.set(gl.TEXTURE1);

        context.pixelStoreUnpackPremultiplyAlpha.set(false);
        tile.demTexture = tile.demTexture || painter.getTileTexture(textureStride);
        if (tile.demTexture) {
            const demTexture = tile.demTexture;
            demTexture.update(pixelData, {premultiply: false});
            demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
        } else {
            tile.demTexture = new Texture(context, pixelData, gl.RGBA, {premultiply: false});
            tile.demTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
        }

        if (secondaryData && painter.style.sourceCaches[secondaryData]) {
            const regionTile = painter.style.sourceCaches[secondaryData].getTile(coord);
            if (regionTile && regionTile.texture) {
                context.activeTexture.set(gl.TEXTURE4);
                regionTile.texture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
            }
        } else {
            throw Error('No valid region data specified for avalanche layer. Make sure there is a visible raster source linked in the \'avalanche-secondary-data\' paint property.')
        }

        // Report Texture
        context.activeTexture.set(gl.TEXTURE5);
        let reportTexture = buildReportTexture(painter);
        reportTexture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);

        context.activeTexture.set(gl.TEXTURE0);

        let fbo = tile.fbo;

        if (!fbo) {
            const renderTexture = new Texture(context, {width: tileSize, height: tileSize, data: null}, gl.RGBA);
            renderTexture.bind(gl.LINEAR, gl.CLAMP_TO_EDGE);

            fbo = tile.fbo = context.createFramebuffer(tileSize, tileSize, true);
            fbo.colorAttachment.set(renderTexture.texture);
        }

        context.bindFramebuffer.set(fbo.framebuffer);
        context.viewport.set([0, 0, tileSize, tileSize]);

        painter.useProgram('avalanchePrepare').draw(context, gl.TRIANGLES,
            depthMode, stencilMode, colorMode, CullFaceMode.disabled,
            avalancheUniformPrepareValues(tile.tileID, dem, reportTexture.size, layer.getRatingColors()),
            null, layer.id, painter.rasterBoundsBuffer,
            painter.quadTriangleIndexBuffer, painter.rasterBoundsSegments);

        tile.needsAvalanchePrepare = false;
    }
}

// TODO: move this elsewhere

function buildReportTexture(painter: Painter) {
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
    // Get the closest power of 2 for texture size
    let paddedLength = reportLength - 1;
    paddedLength |= paddedLength >> 1;
    paddedLength |= paddedLength >> 2;
    paddedLength |= paddedLength >> 4;
    paddedLength |= paddedLength >> 8;
    paddedLength |= paddedLength >> 16;
    paddedLength++;


    colorData = colorData.flat();
    let textureData = new Uint8Array(paddedLength * paddedLength * 4);

    let stride = 0;
    let colorStride = 0;
    for (let i = 0; i < colorData.length / 20; i++) {
        for (let j = 0; j < 20; j++) {
            textureData[stride + j] = colorData[colorStride + j];
        }
        stride += paddedLength * 4;
        colorStride += 20;
    }

    const reportImage = new RGBAImage({width: 128, height: 128}, textureData)
    return new Texture(context, reportImage, gl.RGBA, {premultiply: false});
}

