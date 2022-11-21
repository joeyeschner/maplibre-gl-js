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
        let reportTexture;
        if (!layer.reportTexture) {
            reportTexture = layer.buildReportTexture(painter);
        } else {
            reportTexture = layer.reportTexture;
        }
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

