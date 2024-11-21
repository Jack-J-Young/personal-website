import { Tool } from "./Tool";
import transform_icon from "$lib/ImageEditor/icons/transform.svg";
import type { GestureCustomEvent } from "svelte-gestures";
import type { ViewerProperties } from "../viewer/ViewerProperties";

function calculateAngleFromReference(
    p: { x: number; y: number },
    cx: number,
    cy: number): number {
    // Calculate angle from reference point (cx, cy) to point p
    return Math.atan2(p.y - cy, p.x - cx);
}

function sortQuadPointsClockwiseFromTopLeft(
    quadPoints: { x: number, y: number }[]):
        { x: number, y: number }[] {
    // Find centroid as reference point
    let cx = 0,
        cy = 0;
    for (let point of quadPoints) {
        cx += point.x;
        cy += point.y;
    }
    cx /= quadPoints.length;
    cy /= quadPoints.length;

    // Calculate angles from centroid to each point
    let angles: { point: { x: number, y: number }; angle: number }[] =
        quadPoints.map(
            (point) => {
                let angle = calculateAngleFromReference(point, cx, cy);
                return { point, angle };
            },
        );

    // Sort points based on angle from reference point (centroid)
    angles.sort((a, b) => a.angle - b.angle);

    // Extract sorted points
    let sortedQuadPoints = angles.map((item) => item.point);

    return sortedQuadPoints;
}

export class Transform extends Tool {
    constructor() {
        super({
            icon: transform_icon,
            name: "Transform",
            hoverText: "Perspective transform: Click to add 4 corners, drag to move corners.",
            selectable: true
        });
    }

    panOn(event: GestureCustomEvent): void {
        if (!this.vps) return;
        console.log(event);

        if (!event.detail.event) return;
        console.log(event.detail.event);
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

        let vp: ViewerProperties = this.vps.get();
        let transformPoints = vp.transformPoints;

        if (transformPoints.length < 4) {
            transformPoints = [
                ...transformPoints,
                {x: event.offsetX, y: event.offsetY}
            ]
        } else {
            // find nearest point and set it
            let nearest = transformPoints.reduce((prev, curr) => {
                let prevDiff = {
                    x: prev.x - event.offsetX,
                    y: prev.y - event.offsetY
                };
                let currDiff = {
                    x: curr.x - event.offsetX,
                    y: curr.y - event.offsetY
                };

                let prevDist = Math.sqrt(prevDiff.x ** 2 + prevDiff.y ** 2);
                let currDist = Math.sqrt(currDiff.x ** 2 + currDiff.y ** 2);

                return prevDist < currDist ? prev : curr;
            });

            nearest.x = event.offsetX;
            nearest.y = event.offsetY;

            transformPoints = [...transformPoints];
        }

        if (transformPoints.length == 4) {
            transformPoints = sortQuadPointsClockwiseFromTopLeft(transformPoints);
        }

        this.vps.set({ transformPoints });
    }
}