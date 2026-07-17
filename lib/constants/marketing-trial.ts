/**
 * Marketing trial sentences pulled from the live premade catalog
 * (`shared_premade_catalog` + `shared_sentence_translations` + ready R2 audio).
 */
export const marketingTrialSentences = [
  {
    id: "premade_sent_59cb92a885",
    english: "What time is it now?",
    japanese: "今何時ですか？",
    reading: "いまなんじですか？",
    romaji: "Ima nanji desu ka?",
    audioSrc: "/assets/marketing/trial-what-time.mp3",
  },
  {
    id: "premade_sent_644ab51443",
    english: "Excuse me, is this seat taken?",
    japanese: "すみません、この席、空いてますか？",
    reading: "すみません、このせき、あいてますか？",
    romaji: "sumimasen, kono seki, aitemasu ka?",
    audioSrc: "/assets/marketing/trial-seat-taken.mp3",
  },
] as const;

export type MarketingTrialSentence = (typeof marketingTrialSentences)[number];
