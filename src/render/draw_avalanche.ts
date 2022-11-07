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

    // Get secondary data property from paint properties
    const secondaryData = layer.paint.get('avalanche-secondary-data');

    for (const coord of coords) {
        const tile = sourceCache.getTile(coord);
        if (typeof tile.needsAvalanchePrepare !== 'undefined' && tile.needsAvalanchePrepare && painter.renderPass === 'offscreen') {
            prepareAvalanche(painter, tile, layer, depthMode, StencilMode.disabled, colorMode, secondaryData, coord);
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

        if (secondaryData && painter.style.sourceCaches[secondaryData]){
            const regionTile = painter.style.sourceCaches[secondaryData].getTile(coord);
            if (regionTile && regionTile.texture) {
                context.activeTexture.set(gl.TEXTURE4);
                regionTile.texture.bind(gl.NEAREST, gl.CLAMP_TO_EDGE);
            }
        } else {
            throw Error('No valid region data specified for avalanche layer. Make sure there is a visible raster source linked in the \'avalanche-secondary-data\' paint property.')
        }

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
            avalancheUniformPrepareValues(tile.tileID, dem, reportTexture.size),
            null, layer.id, painter.rasterBoundsBuffer,
            painter.quadTriangleIndexBuffer, painter.rasterBoundsSegments);

        tile.needsAvalanchePrepare = false;
    }
}

// TODO: move this elsewhere

function buildReportTexture(painter: Painter) {
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
    return  new Texture(context, reportImage, gl.RGBA, {premultiply: false});
}

