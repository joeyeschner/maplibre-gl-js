import StyleLayer from '../style_layer';

import properties, {AvalanchePaintPropsPossiblyEvaluated} from './avalanche_style_layer_properties.g';
import {Transitionable, Transitioning, PossiblyEvaluated} from '../properties';

import type {AvalanchePaintProps} from './avalanche_style_layer_properties.g';
import type {LayerSpecification} from '../../style-spec/types.g';

class AvalancheStyleLayer extends StyleLayer {
    _transitionablePaint: Transitionable<AvalanchePaintProps>;
    _transitioningPaint: Transitioning<AvalanchePaintProps>;
    paint: PossiblyEvaluated<AvalanchePaintProps, AvalanchePaintPropsPossiblyEvaluated>;

    constructor(layer: LayerSpecification) {
        super(layer, properties);
    }

    hasOffscreenPass() {
        return this.paint.get('avalanche-exaggeration') !== 0 && this.visibility !== 'none';
    }
}

export default AvalancheStyleLayer;
