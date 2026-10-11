# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (installable PWA, phone-first)

## Stack

delegated: static HTML/CSS/JS, no framework, service worker for offline, data stored only on the device (IndexedDB + localStorage mirror, navigator.storage.persist, manual JSON backup export/import). GitHub Pages.

## Users

People training in a gym or at home who use their phone between sets. Beginners to intermediate lifters who want a plan picked for them, adjusted to their goal, the equipment they actually have and the body parts that hurt. Secondary audience: portfolio visitors judging the author's ability to build app UIs.

## Product Purpose

A personal training app: onboarding profile, goal, available equipment, pain map on a body model; it generates a plan from an exercise library, runs the workout with a set counter and rest timer, records weights/reps, shows progress charts and personal records, and has a PR-day mode that prepares the user for a record attempt (mobility, warm-up ramp from estimated 1RM, attempt selection, rest timing).

## Positioning

The plan reacts to the body and the gym: missing equipment swaps exercises, marked pain removes loading exercises and suggests stretches, PR day turns history into a concrete attempt plan.

## Capabilities and Constraints

- Data never leaves the device; no accounts. The user explicitly wants data not to get lost: request persistent storage and offer backup export/import.
- Health safety: pain features are guidance, not medical advice; show a clear note to see a physiotherapist.
- Exercise visuals are authored SVG figures (consistent, offline), not stock photos/videos.
- Polish language.

## Product Principles

1. One thumb, between sets: big targets, minimal typing.
2. The plan explains itself: why this exercise, why it was swapped.
3. Safety over bravado, especially on PR day.
4. Your data is yours and stays on this phone.
