export const MAX_COLLABORATION_CARDS = 3;
export const MAX_REASON_TAGS = 2;

// Topic overlap only nudges the ranking; the exchange of offering and seeking decides.
export const TOPIC_WEIGHT = 0.25;
export const MUTUAL_BONUS = 1;
// One shared tag held by almost everyone (idf close to 1) is not worth a card.
export const MIN_SCORE = 1.5;
export const STRONG_SCORE = 4;
