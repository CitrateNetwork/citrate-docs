// Network-economics term classifier (owner decision 2026-10-27: tokenomics are not yet determined).
//
// A docs page whose prose mentions SALT, rewards, emissions, staking or bonds, grants, supply, fees,
// economics, APY, or validator income must carry `tokenomics_notice: true` in its frontmatter, which makes
// the reader render the shared TokenomicsNotice at the top of the page. test/tokenomics-notice.test.ts runs
// this classifier over content/**/*.md so a new page that mentions these terms cannot skip the notice.
//
// Matching runs on prose only: frontmatter, fenced code, inline code, and link URLs are removed first, so a
// source path such as `core/economics/src/genesis.rs` or a route such as `/chain/economics` does not count.

/** Each entry: [label, pattern]. `SALT` is case-sensitive so a CREATE2 or password salt does not match. */
export const TOKENOMICS_TERMS = [
  ["SALT", /\bw?SALT\b/],
  ["reward", /\brewards?\b/i],
  ["emission", /\bemissions?\b/i],
  ["stake", /\bstak(?:e|es|ed|ing)\b/i],
  ["bond", /\bbond(?:s|ed)?\b/i],
  ["grant (economic)", /\b(?:staked|stake|SALT|compute|validator) grants?\b|\bgrant (?:lands|bonds)\b/i],
  ["supply", /\b(?:total|token|max(?:imum)?|circulating|fixed|initial|trillion|SALT) supply\b|\bsupply cap\b/i],
  ["fee", /\bfees?\b/i],
  ["economics", /\beconomics\b/i],
  ["APY", /\bAPY\b|\bAPR\b|\bannual (?:percentage )?(?:yield|return|rate)\b/],
  ["earn", /\bearn(?:s|ed|ing)?\b(?=[^.]{0,60}\b(?:SALT|rewards?|income)\b)|\bearning side\b/i],
  ["validator income", /\bvalidator (?:income|earnings|revenue|pay)\b/i],
  ["slashing", /\bslash(?:ed|es|ing)?\b/i],
  ["treasury", /\btreasury\b/i],
  ["halving", /\bhalving\b|\bhalves every\b/i],
  ["burn", /\bburn(?:s|ed)?\b/i],
  ["inflation", /\binflation(?:ary)?\b/i],
];

/** Body prose with frontmatter, code, and link URLs removed (link text is kept). */
export function tokenomicsProse(raw) {
  let t = raw.replace(/^﻿?---\n[\s\S]*?\n---\n/, "");
  t = t.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
  t = t.replace(/\]\([^)]*\)/g, "]");
  return t.replace(/\s+/g, " ");
}

/** Labels of every economics term the page's prose mentions (empty when none). */
export function tokenomicsTermsIn(raw) {
  const prose = tokenomicsProse(raw);
  return TOKENOMICS_TERMS.filter(([, re]) => re.test(prose)).map(([label]) => label);
}

/** True when the frontmatter opts the page into the notice (`tokenomics_notice: true`). */
export function hasTokenomicsNoticeFlag(raw) {
  const m = /^﻿?---\n([\s\S]*?)\n---\n/.exec(raw);
  return Boolean(m && /^tokenomics_notice:\s*true\s*$/m.test(m[1]));
}
