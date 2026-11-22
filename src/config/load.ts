/**
 * How the calendar shades each day. A task's estimate is spread evenly over the days from its start to its due
 * date, and the planned minutes of all open tasks on a day decide its step.
 */

/** Upper edge, in minutes, of steps 1 to 3. Anything above the last edge is step 4. Step 0 means nothing planned. */
export const LOAD_STEPS_MINUTES = [60, 120, 180] as const;

/** Names for steps 0 to 4, used in the calendar's accessible labels. */
export const LOAD_LABELS = ["None", "Light", "Moderate", "Busy", "Heavy"] as const;

/** Most task lines drawn in a day's corner before the cell shows "+n". */
export const MAX_STACK_LINES = 4;
