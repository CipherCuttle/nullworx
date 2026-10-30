/**
 * Shared ASCII-cell language, borrowed from the approved UI Flower ASCII
 * Waves treatment: a 16 px cell, the same monospaced face and the same ordered
 * density ramp. The stencil and Terminal Rain both use this grid, so a visible
 * cell is always one whole character.
 */
export const ASCII_CELL_SIZE = 16;
export const ASCII_RAIN_CELL_SIZE = 12;
export const ASCII_RAMP = ' .:-+*=%@#';
export const ASCII_GLYPHS = ASCII_RAMP.replace(' ', '');
export const ASCII_FONT_STACK = '"DejaVu Sans Mono", "Liberation Mono", "Nimbus Mono PS", monospace';
export const ASCII_FONT = `700 15px ${ASCII_FONT_STACK}`;
