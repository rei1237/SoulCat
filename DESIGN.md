---
name: "사주보는 고양이 영냥이"
description: "A white cat welcomes visitors into a violet, candle-gold moonlit room."
colors:
  night: "#211432"
  deep: "#18132b"
  violet: "#7541ad"
  gold: "#e9c78d"
  ivory: "#fff3e2"
  muted: "#c7b5ce"
  paper: "#f7f0e8"
typography:
  display:
    fontFamily: '"Nanum Myeongjo", serif'
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-1px"
  headline:
    fontFamily: '"Noto Sans KR Variable", sans-serif'
    fontSize: "21px"
    fontWeight: 600
    letterSpacing: "-0.65px"
  title:
    fontFamily: '"Nanum Myeongjo", serif'
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: '"Noto Sans KR Variable", sans-serif'
    fontSize: "14px"
    lineHeight: 1.65
  label:
    fontFamily: '"Noto Sans KR Variable", sans-serif'
    fontSize: "10px"
    letterSpacing: "0.3px"
rounded:
  outlined: "9px"
  inset: "12px"
  card: "13px"
  feature: "16px"
  pill: "23px"
  dialog-desktop: "22px"
spacing:
  compact: "8px"
  control-gap: "12px"
  mobile-gutter: "22px"
  panel-gutter: "24px"
  wide-gutter: "40px"
components:
  button-primary:
    textColor: "#fff4e2"
    rounded: "{rounded.card}"
    width: "100%"
  button-primary-hover:
    backgroundColor: "#7645a1"
  button-outlined:
    backgroundColor: "#22132e8c"
    textColor: "{colors.gold}"
    rounded: "{rounded.outlined}"
    width: "100%"
  button-outlined-hover:
    backgroundColor: "#4d315c"
  button-icon:
    rounded: "50%"
  button-login:
    rounded: "20px"
    padding: "3px 14px"
  button-text:
    textColor: "{colors.gold}"
    padding: "0"
  concern-chip:
    backgroundColor: "#342243"
    textColor: "{colors.ivory}"
    rounded: "{rounded.pill}"
    padding: "8px 13px"
  concern-chip-selected:
    backgroundColor: "#573657"
  service-card:
    backgroundColor: "#2b1a3d"
    rounded: "{rounded.card}"
    padding: "0"
  availability-note:
    backgroundColor: "#392647"
    textColor: "#d4bddc"
    rounded: "{rounded.outlined}"
    padding: "14px"
---

# Design System: 사주보는 고양이 영냥이

## Overview

**Creative North Star: "영냥이의 달빛 점술방"**

The supplied white cat and painted violet room are the visual authority. Candle-gold edges, ivory Korean lettering and restrained purple surfaces make the interface feel like entering the cat's own room. The character is proud but caring; UI language remains short, direct and free of the “~냥” suffix.

Keep the painted illustrations distinct and recognizable. New surfaces should inherit the room's materials and hierarchy without copying the home page's exact composition. This scan documents the finished implementation in `src/app/globals.css`, `src/components/FortuneHome.tsx` and `src/data/home.ts`; the home-specific sequence remains in `docs/home-brief.md`. Qualitative direction comes from the already confirmed world in that brief and `PRODUCT.md`.

**Key Characteristics:**

- White cat identity, violet night surfaces and candle-gold edges.
- Korean serif for narrative emphasis; Korean sans for navigation and explanatory copy.
- Framed illustration cards, short paragraphs and touch-first controls.
- Brief, user-triggered reactions with a static reduced-motion alternative.

## Colors

A deep violet night supports warm gold emphasis and ivory reading surfaces.

### Primary

- **Violet:** the declared brand accent; the primary action uses a related purple gradient documented in the sidecar.
- **Candle Gold:** highlighted title words, actions, selected controls and focus indicators. Decorative frame strokes use quieter local brown-gold values.

### Secondary

- **Ivory Paper:** the light stage beneath supplied white-background poses, expression frames and the relevant service illustration.

### Neutral

- **Night:** the main page surface and illustration fade destination.
- **Deep:** the outer canvas and scrollbar track.
- **Ivory:** primary text.
- **Muted:** secondary explanations.

The frontmatter preserves the source color notation. Do not treat every decorative border shade as a new brand accent. Unused declared surface/border variables are deliberately not promoted into this inventory.

**The White Fur Rule.** White-background artwork belongs on an ivory stage with the implemented multiply treatment where appropriate. Never remove white pixels indiscriminately: the character's white fur is part of the identity.

## Typography

**Display Font:** Nanum Myeongjo, with serif fallback.  
**Body Font:** Noto Sans KR Variable, with sans-serif fallback.

The serif gives the character's narrative weight without making routine controls ornate. Sans-serif labels and body copy keep the dense mobile surface readable. There is no separate mono font or mathematical type scale.

### Hierarchy

- **Display:** frontmatter values describe the base mobile hero. It becomes 30px below 375px, 35px at 410–699px, 39px at 700–999px and 49px at 1000px and above. Desktop line-height is 1.45 and tracking is -1.5px.
- **Headline:** base section heading; 20px on the smallest screens and 25px from 700px.
- **Title:** service names; 26px from 700px and 28px from 1000px.
- **Body:** base reading style. Panel prose uses 13px with 1.9 line-height; story prose uses 1.95. Mobile service descriptions and their action labels finish at 12px through the final narrow-screen override.
- **Label:** small contextual label. Treat the tiny English brand subtitle as ornament, not a pattern for actionable text.

Headings use balanced wrapping and Korean word preservation. The hero's descriptive line is below the h1 with a 10px top margin. The fusion feature has no SPECIAL badge; unused styling for an old label does not establish a component.

## Layout

The shell is centered with a 1440px maximum width. The base content gutter is 22px; it becomes 20px below 375px, 24px at 410–699px, 40px from 700px, and 36px from 1000px inside a 1120px maximum content container.

The base header is 64px high, 60px below 375px and 76px from 700px. Mobile hero title, cat and action occupy explicit grid rows rather than a scaled desktop screenshot. The base hero is 605px high, with 579px on the smallest screens, 646px at 410–699px and 680px at 700–999px. At 1000px it becomes a 637px composition with copy/action on the left and a 490px cat on the right. Preserve the first-view primary action above the fixed navigation.

Service cards use two equal columns with 15px vertical and 12px horizontal gaps. At 700px the grid becomes three columns with 20px gaps. Recommendations are a scroll-snapping horizontal list: 238px cards by default, 255px from 700px, and four equal cards from 1000px. Section separations generally fall around 33–38px on mobile and 42–60px on desktop; this is an observed rhythm, not an invented universal scale.

Five-item bottom navigation remains present at every width. It is at least 72px high with safe-area bottom padding, becomes a centered 540px dock from 700px and 520px from 1000px. Desktop header navigation appears at 1000px. The footer reserves 123px below its content for the dock.

Dialogs are bottom sheets up to 480px wide and 92dvh high on mobile. From 700px they are centered, rounded windows limited to 90dvh. Their sticky header and independent vertical scrolling keep the close control reachable.

## Elevation & Depth

Depth comes mainly from painted rooms, directional dark fades, inset gold hairlines and tone changes. Shadows support speech, action and modal hierarchy rather than lifting every card. There is no backdrop blur or glass material.

### Shadow Vocabulary

- **Primary action:** `0 4px 18px #13092b55, inset 0 0 0 3px #b686c21a`.
- **Speech bubble:** `0 4px 18px #1b0e3a33`.
- **Navigation dock:** `0 -4px 18px #180e2429`.
- **Dialog:** `0 -8px 45px #0f071f80`, with `#0d0718b8` backdrop.
- **Concern recommendation:** `0 0 0 2px #ddb0693b` beside a brighter border; this is selection feedback, not a sales badge.

## Shapes

Cards and the main CTA share gently rounded corners. Feature framing is slightly rounder, pills are fully softened and icon controls are circular. The speech bubble has one short corner (20px 20px 20px 4px) with a 4-degree tilt. The ivory character stage uses an arch (70px 70px 12px 12px). Mobile sheets have 24px top corners; desktop dialogs use the frontmatter's dialog radius.

Service frames have a second 1px inset line, 4px inside the outer border. Fusion frames inset their line by 5px. These quiet nested edges carry the illustrated-room identity.

## Components

### Buttons

The primary action is full-width, at least 60px high, with an ivory label, gold border and purple gradient. Hover replaces the gradient with the documented solid color; active presses down 1px. Its account-panel variant is at least 52px high with 14px text.

Outlined actions are at least 47px high with gold text and a translucent dark fill. Icon buttons are at least 44px square. The header login pill is at least 36px high. Text links are compact inline actions, with dedicated story-next controls at least 44px high.

All keyboard-focusable buttons, links and explicit tab stops receive a 2px gold outline offset by 5px. Disabled controls use opacity 0.45 and a not-allowed cursor. Keep real button semantics and descriptive accessible labels for icon-only actions.

### Concern Chips

Compact pills wrap across the available width. The chosen concern uses `aria-pressed`, a gold border and the selected fill; hover uses the same visual treatment. Selecting a concern reveals a short live-region response and emphasizes the related service cards. This is editorial guidance, not an inferred personal prediction.

### Cards / Containers

Service cards combine illustration, serif service name, short subtitle and explicit action. Resting cards use tonal depth and inset borders; hover moves them up 2px over 0.2 seconds. Desktop image hover scales to 1.025 over 0.25 seconds. The ivory service variant contains its image on paper with multiply instead of cropping it like the painted cards.

The fusion introduction uses a muted illustration, dark directional overlay and inset frame. Recommendation tiles keep the title narrow against the shaded left side of an image. Do not infer rankings, availability or payment benefits from these compositions.

### Navigation

The dock has five icon-and-label controls, a raised cat-avatar center and gold active treatment. Non-center active items also have a short underline. Selection follows explicit navigation; closing a panel reconciles home/readings, and the requested destination is applied after closing. Preserve that ordering when extending panel navigation.

### Native Dialogs and Notices

One native dialog hosts daily advice, the four-scene prologue, service/fusion introductions, account entrance, report-library preparation, concerns and notifications. It uses a sticky title/close row, native modal behavior, Escape dismissal, body scroll locking and focus return to the opener.

Availability notes are softly bordered purple blocks. They clearly state when detailed reports, authentication or live consultation are still being prepared. There are no implemented input fields or credentials forms to document.

The daily panel is an editorial message selected by KST date, with a copy action only. Daily-message bookmarking and browser storage were removed at the user's request. The library is a preparation panel for future fortune reports. Preserve these distinctions from calculated reports or server accounts.

### Character and Story

The hero tap cycles three speech lines and triggers a 650ms nuzzle/heart response. The room-stage control cycles three expressions and triggers a six-frame walk: a 0.6-second stepped strip played twice, ending after 1.2 seconds. Neither is an autoplay loop. The room uses day artwork at KST 07:00–18:59 and night artwork otherwise when initialized.

The four-scene story advances explicitly, with progress segments and previous/next/exit controls. It uses the study, forbidden revelation, mirror and reopened room scenes. Under reduced motion, animations/transitions and smooth scrolling stop; expression changes remain, the resting cat stays visible and walking does not start.

## Do's and Don'ts

### Do:

- **Do** reuse the supplied white-cat identity and existing art; retain original files and derivative provenance.
- **Do** use ivory stages to preserve white-background illustrations and white fur.
- **Do** keep Korean reading hierarchy, short mobile paragraphs, visible focus and safe-area clearance.
- **Do** keep short character reactions user-triggered and provide a static reduced-motion experience.
- **Do** describe absent services truthfully while offering the working daily-message and story experiences.

### Don't:

- **Don't** replace the supplied white cat with the gray-cat description from an older character document.
- **Don't** reintroduce the two rejected human-back-view recollection scenes into this delivery.
- **Don't** put the removed eyebrow above the hero headline or restore the removed SPECIAL label.
- **Don't** invent inputs, live AI, authentication, payment functionality, unlimited access, fish currency or example pricing from roadmap material.
- **Don't** turn the home page's specific section order into a mandatory layout for every future screen.

