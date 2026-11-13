export const STEP_SLIDE = 8;

export const STEP_GRID = "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[680px_minmax(0,1fr)]";
export const STEP_COLUMN = "flex min-h-[calc(100dvh-3.5rem)] flex-col md:min-h-[calc(100dvh-4.5rem)] bg-paper";
export const STEP_CONTENT = "flex flex-1 justify-center px-5 py-8 md:px-10 lg:py-12";
const BAR = "bottom-0 z-10 border-t border-vellum-line bg-paper/90 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm md:px-10";
export const PINNED_BAR = `sticky ${BAR}`;
export const TALL_SCREEN_PINNED_BAR = `[@media(min-height:700px)]:sticky ${BAR}`;
export const ROAD_PANEL = "hidden bg-vellum p-8 lg:block xl:p-12";
export const SKELETON = "h-2 rounded bg-vellum";
