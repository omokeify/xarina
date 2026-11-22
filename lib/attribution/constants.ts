/** First-touch ad attribution (PRD "UTM capture"). */
export const UTM_COOKIE = "xarina_utm";

/** Keep the first campaign for 30 days; a later tagged visit never replaces it. */
export const UTM_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
