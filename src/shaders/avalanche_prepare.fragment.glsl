#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D u_image;
uniform sampler2D u_regions;
uniform sampler2D u_report;
uniform sampler2D u_snow_card;
uniform vec4 u_ratings[9];
varying vec2 v_pos;
uniform vec2 u_report_dimension;
uniform vec2 u_dimension;
uniform float u_zoom;
uniform vec4 u_unpack;
uniform float u_visualization_type;

#define PI 3.141592653589793

float getElevation(vec2 coord, float bias) {
    // Convert encoded elevation value to meters
    vec4 data = texture2D(u_image, coord) * 255.0;
    data.a = -1.0;
    return dot(data, u_unpack);
}

float modI(float a, float b) {
    float m=a-floor((a+0.5)/b)*b;
    return floor(m+0.5);
}

vec4 arrayIndexToVec4(int index) {
    vec4 result = vec4(0);
    if (index == 0) {result.r = 1.0;} else
    if (index == 1) {result.g = 1.0;} else
    if (index == 2) {result.b = 1.0;} else
    if (index == 3) {result.a = 1.0;}

    return result;
}

bool isUnfavorable(float aspect, vec4 unfavorableStart, vec4 unfavorableEnd) {
    // Convert angle in one of 8 directions (+22.5 to shift from [337.5,337.5] to [0,360] for easier calculation)
    float range = 360.0 / 8.0;
    int index = int((modI(aspect + 22.5, 360.0)) / range);
    bool unfavorable = false;

    // Check with corresponding binary vec4 via dot product to see if current angle is unfavorable
    if (index < 4) {
        if (dot(arrayIndexToVec4(index),unfavorableStart) == 1.0) {
            unfavorable = true;
        }
    } else {
        index -= 4;
        if (dot(arrayIndexToVec4(index),unfavorableEnd) == 1.0) {
            unfavorable = true;
        }
    }
    return unfavorable;
}

float getPackedTextureValue(float index, int column) {
    vec2 offset = 1.0 / u_report_dimension;
    vec4 bitShifts = vec4(256. * 256. * 256., 256. * 256., 256., 1.);
    return dot(texture2D(u_report, vec2(float(column) * offset.x, index * offset.y)) * 255.0, bitShifts);
}

float getSlopeAngle(vec2 deriv) {
    float maxGradientSlope = sqrt(deriv.x * deriv.x + deriv.y * deriv.y);

    return atan(maxGradientSlope) * (180.0 / PI) + 9.0;
}

float getAspectAngle(vec2 deriv) {
    float aspectAngle = 180.0/PI * atan(deriv.y, -deriv.x);


    if (aspectAngle < 0.0)
    aspectAngle = 90.0 - aspectAngle;
    else if (aspectAngle > 90.0)
    aspectAngle = 360.0 - aspectAngle + 90.0;
    else
    aspectAngle = 90.0 - aspectAngle;

    return aspectAngle;
}

vec4 ratingToColor(float rating) {
    if (rating == 1.0) return u_ratings[0];
    if (rating == 2.0) return u_ratings[1];
    if (rating == 3.0) return u_ratings[2];
    if (rating == 4.0) return u_ratings[3];
    if (rating == 5.0) return u_ratings[4];
    // if no valid rating don't show on map
    return vec4(0, 0, 0, 0);//u_ratings[0];
}

float getDangerBorder(float index) {
    return getPackedTextureValue(index, 0);
}

float getDangerRatingHi(float index) {
    return getPackedTextureValue(index, 1);
}

float getDangerRatingLo(float index) {
    return getPackedTextureValue(index, 2);
}

vec4 getUnfavorableStart(float index) {
    vec2 offset = 1.0 / u_report_dimension;
    return texture2D(u_report, vec2(float(3) * offset.x, index * offset.y)) * 255.0;
}

vec4 getUnfavorableEnd(float index) {
    vec2 offset = 1.0 / u_report_dimension;
    return texture2D(u_report, vec2(float(4) * offset.x, index * offset.y) * 255.0);
}

float getIndex(vec4 neighbors, float index) {
    if (neighbors.r == index && neighbors.g == index && neighbors.b == index && neighbors.a == index) {
        return index;
    } else {
        float values[5];
        values[0] = neighbors.r;
        values[1] = neighbors.g;
        values[2] = neighbors.b;
        values[3] = neighbors.a;
        values[4] = index;

        int maxFrequency = 0;
        int maxFrequencyIndex;
        int frequency = 0;
        for (int i = 0; i < 5; i++) {
            frequency = 0;
            for (int j = 0; j < 5; j++) {
                if (values[i] == values[j]) {
                    frequency++;
                }
                if (frequency > maxFrequency) {
                    maxFrequency = frequency;
                    maxFrequencyIndex = i;
                }
            }
        }
        for (int i = 0; i < 5; i++) {
            if (i == maxFrequencyIndex) {
                return values[i];
            }
        }
        return values[4];
    }
}

void main() {
    vec2 epsilon = 1.0 / u_dimension;

    // queried pixels:
    // +-----------+
    // |   |   |   |
    // | a | b | c |
    // |   |   |   |
    // +-----------+
    // |   |   |   |
    // | d | e | f |
    // |   |   |   |
    // +-----------+
    // |   |   |   |
    // | g | h | i |
    // |   |   |   |
    // +-----------+

    float a = getElevation(v_pos + vec2(-epsilon.x, -epsilon.y), 0.0);
    float b = getElevation(v_pos + vec2(0, -epsilon.y), 0.0);
    float c = getElevation(v_pos + vec2(epsilon.x, -epsilon.y), 0.0);
    float d = getElevation(v_pos + vec2(-epsilon.x, 0), 0.0);
    float e = getElevation(v_pos, 0.0);
    float f = getElevation(v_pos + vec2(epsilon.x, 0), 0.0);
    float g = getElevation(v_pos + vec2(-epsilon.x, epsilon.y), 0.0);
    float h = getElevation(v_pos + vec2(0, epsilon.y), 0.0);
    float i = getElevation(v_pos + vec2(epsilon.x, epsilon.y), 0.0);

    // Here we divide the x and y slopes by 8 * pixel size
    // where pixel size (aka meters/pixel) is:
    // circumference of the world / (pixels per tile * number of tiles)
    // which is equivalent to: 8 * 40075016.6855785 / (512 * pow(2, u_zoom))
    // which can be reduced to: pow(2, 19.25619978527 - u_zoom).
    // We want to vertically exaggerate the hillshading because otherwise
    // it is barely noticeable at low zooms. To do this, we multiply this by
    // a scale factor that is a function of zooms below 15, which is an arbitrary
    // that corresponds to the max zoom level of Mapbox terrain-RGB tiles.
    // See nickidlugash's awesome breakdown for more info:
    // https://github.com/mapbox/mapbox-gl-js/pull/5286#discussion_r148419556


    // Get values from texture
    vec4 regionPixel = texture2D(u_regions, v_pos);
    vec4 top = texture2D(u_regions, v_pos + vec2(0, -epsilon.y));
    vec4 right = texture2D(u_regions, v_pos + vec2(epsilon.x, 0));
    vec4 bottom = texture2D(u_regions, v_pos + vec2(0, epsilon.y));
    vec4 left = texture2D(u_regions, v_pos + vec2(-epsilon.x, 0));
    float filteredIndex = getIndex(vec4(top.b, right.b, bottom.b, left.b), regionPixel.b);
    float index = filteredIndex * 255.0;

    // Report values
    float dangerBorder = getDangerBorder(index);
    float dangerRatingHi = getDangerRatingHi(index);
    float dangerRatingLo = getDangerRatingLo(index);
    vec4 unfavorableStart = getUnfavorableStart(index);
    vec4 unfavorableEnd = getUnfavorableEnd(index);


    vec2 deriv = vec2(
    (c + f + f + i) - (a + d + d + g),
    (g + h + h + i) - (a + b + b + c)
    ) / ((8.0 * 40075016.6855785) / (256.0 * pow(2.0, u_zoom)));



    float dangerBorderWidth = 200.0;
    vec4 dangerColorHi = ratingToColor(dangerRatingHi);
    vec4 dangerColorLo = ratingToColor(dangerRatingLo);

    float aspect = getAspectAngle(deriv);
    float snowCardOffset = 0.0;

    // Choose snowcard version based on exposition
    if (isUnfavorable(aspect, unfavorableStart, unfavorableEnd)) {
        snowCardOffset = 5.0/16.0;
    }

    float interpolant = clamp((e - (dangerBorder - dangerBorderWidth)) / dangerBorderWidth, 0.0, 1.0);

    if (regionPixel.a != 0.0) {
        if (u_visualization_type < 0.5) {
            // Show plain avalanche risk
            gl_FragColor = mix(dangerColorLo, dangerColorHi, interpolant) * vec4(0.5,0.5,0.5,1.0);
        } else if (u_visualization_type < 1.5){
            // Show terrain based avalanche risk

            // Calculate rating and angle to lookup in snowcard texture
            float interpolatedRating = (mix(dangerRatingLo, dangerRatingHi, interpolant) - 1.0)/ 16.0;
            float angle = clamp((getSlopeAngle(deriv) - 27.0) / 16.0, 0.0, 1.0);


            vec2 snowCardPos = vec2(interpolatedRating + snowCardOffset, angle) + 1.0 / 32.0;

            gl_FragColor = texture2D(u_snow_card, snowCardPos) * vec4(vec3(0.5),1.0);

            // Draw slope over 45 degrees grey
            if (getSlopeAngle(deriv) > 45.0) {
                gl_FragColor = vec4(0.1,0.1,0.1,1.0);
            }
        } else if (u_visualization_type < 2.5) {
            float slopeAngle = getSlopeAngle(deriv);

            if (slopeAngle - 9.0 < 9.0) { gl_FragColor = u_ratings[0]; } else
            if (slopeAngle < 29.0) { gl_FragColor = u_ratings[1]; } else
            if (slopeAngle < 34.0) { gl_FragColor = u_ratings[2]; } else
            if (slopeAngle < 39.0) { gl_FragColor = u_ratings[3]; } else
            if (slopeAngle < 42.0) { gl_FragColor = u_ratings[4]; } else
            if (slopeAngle < 45.0) { gl_FragColor = u_ratings[5]; } else
            if (slopeAngle < 49.0) { gl_FragColor = u_ratings[6]; } else
            if (slopeAngle < 54.0) { gl_FragColor = u_ratings[7]; }
            else { gl_FragColor = gl_FragColor = u_ratings[8]; }
        }

        //gl_FragColor = texture2D(u_snow_card, v_pos);

    }

        #ifdef OVERDRAW_INSPECTOR
    gl_FragColor = vec4(1.0);
    #endif
}
