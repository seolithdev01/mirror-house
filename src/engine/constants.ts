// SPDX-License-Identifier: Apache-2.0
export const CELL_SIZE = 4; // meters
export const WALL_THICKNESS = 0.2; // meters
export const WALL_HEIGHT = 3.2; // meters — uniform, Wolfenstein constraint
export const EYE_HEIGHT = 1.7; // meters
export const PLAYER_RADIUS = 0.4; // meters
export const WALK_SPEED = 3.5; // m/s
export const SPRINT_SPEED = 6; // m/s
export const MAX_STEP_DT = 1 / 30; // seconds — clamps tunneling
export const TURN_SENSITIVITY = 0.003; // radians per mouse pixel
export const KEY_TURN_PER_STEP = 0.045; // radians per fixed step in keyboard mode
export const MOUSE_TURN_PER_STEP = 0.06; // radians per fixed step in mouse-only mode
export const FIXED_STEP = 1 / 120; // seconds
