import { Tool } from "../Tool";
import TransformIcon from "../icons/TransformIcon.svelte";
import type { GestureCustomEvent } from "svelte-gestures";

function calculateAngleFromReference(
    p: { x: number; y: number },
    cx: number,
    cy: number): number {
    return Math.atan2(p.y - cy, p.x - cx);
}

// Squared distance is enough to rank candidates, so no square root is needed.
function indexOfNearestPoint(
    points: { x: number, y: number }[],
    target: { x: number, y: number }): number {
    let squaredDistanceTo = (point: { x: number, y: number }) =>
        (point.x - target.x) ** 2 + (point.y - target.y) ** 2;

    let best = 0;
    for (let i = 1; i < points.length; i++) {
        if (squaredDistanceTo(points[i]) < squaredDistanceTo(points[best])) best = i;
    }
    return best;
}

function indexOfTopLeftPoint(points: { x: number, y: number }[]): number {
    let best = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].x + points[i].y < points[best].x + points[best].y) best = i;
    }
    return best;
}

function rotateToStartAt<T>(items: T[], startIndex: number): T[] {
    return [...items.slice(startIndex), ...items.slice(0, startIndex)];
}

// The starting corner matters, not just the winding: TransformRegion renders
// assuming [top-left, top-right, bottom-right, bottom-left], and this order is
// what the API receives as quad_points.
function sortQuadPointsClockwiseFromTopLeft(
    quadPoints: { x: number, y: number }[]):
        { x: number, y: number }[] {
    let cx = 0,
        cy = 0;
    for (let point of quadPoints) {
        cx += point.x;
        cy += point.y;
    }
    cx /= quadPoints.length;
    cy /= quadPoints.length;

    let angles: { point: { x: number, y: number }; angle: number }[] =
        quadPoints.map(
            (point) => {
                let angle = calculateAngleFromReference(point, cx, cy);
                return { point, angle };
            },
        );

    angles.sort((a, b) => a.angle - b.angle);

    let clockwise = angles.map((item) => item.point);

    return rotateToStartAt(clockwise, indexOfTopLeftPoint(clockwise));
}

export class Transform extends Tool {
    constructor() {
        super({
            icon: TransformIcon,
            name: "Transform",
            hoverText: "Perspective transform: Click to add 4 corners, drag to move corners.",
            selectable: true
        });
    }

    panOn(event: GestureCustomEvent): void {
        if (!this.vps) return;

        if (!event.detail.event) return;
        let pointerEvent = event.detail.event;

        if (pointerEvent.buttons == 1 && event.detail.event.pointerType == "mouse") return;
        super.panOn(event);
    }

    panOff(event: GestureCustomEvent): void {
        if (!this.vps) return;

        if (!event.detail.event) return;
        let pointerEvent = event.detail.event;

        if (pointerEvent.buttons == 1 && event.detail.event.pointerType == "mouse") return;
        super.panOff(event);
    }

    pan(event: GestureCustomEvent): void {
        if (!this.vps) return;

        if (!event.detail.event) return;
        let pointerEvent = event.detail.event;

        if (pointerEvent.buttons == 1 && event.detail.event.pointerType == "mouse") return;
        super.pan(event);
    }

    onClick(event: MouseEvent): void {
        if (!this.vps) return;

        let vp = this.vps.get();
        let transformPoints = vp.transformPoints;

        let click = { x: event.offsetX, y: event.offsetY };

        if (transformPoints.length < 4) {
            transformPoints = [...transformPoints, click];
        } else {
            let nearest = indexOfNearestPoint(transformPoints, click);
            transformPoints = transformPoints.map(
                (point, i) => i === nearest ? click : point);
        }

        if (transformPoints.length == 4) {
            transformPoints = sortQuadPointsClockwiseFromTopLeft(transformPoints);
        }

        this.vps.set({ transformPoints });
    }
}