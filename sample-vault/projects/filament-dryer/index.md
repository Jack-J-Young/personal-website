---
public: true
title: Filament dryer
summary: A sealed box that keeps four spools under 15% humidity, built from a food dehydrator and a printed manifold.
status: done
date: 2026-03-02
cover: images/assembled.png
---

PLA that has sat out for a fortnight prints visibly worse — stringing, poor layer adhesion, and
the occasional pop as trapped moisture flashes off at the nozzle. Commercial dryers hold one
spool and cost more than the printer did, so this holds four.

## How it works

A cheap food dehydrator element sits under a sealed crate. A printed manifold spreads the airflow
across all four spools instead of cooking whichever one sits nearest the fan, and a hygrometer
poking through the lid says when it's done.

- **Element** — 250W dehydrator base, thermostat bypassed
- **Enclosure** — 36L crate with a foam gasket
- **Manifold** — printed in PETG, because PLA deforms at the temperature the box runs at
- **Control** — bang-bang thermostat at 50°C

![The finished box with the lid on](images/assembled.png)

## What it cost

| Part | Source | Cost |
|---|---|---|
| Dehydrator base | Secondhand | £12 |
| Crate and gasket | Hardware shop | £9 |
| Hygrometer | Two of them, one wrong | £6 |
| Filament | ~400g PETG | £8 |

> The single biggest improvement was the gasket. Before it, the box would reach 20% humidity and
> stop; after it, 11% overnight.

Two iterations are written up separately: the [first print](first-print) was the one that taught
me PLA was the wrong material, and the [hinge revision](v2-hinge) fixed the lid.
