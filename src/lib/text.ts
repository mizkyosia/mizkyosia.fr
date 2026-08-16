import { pointInTriangle } from "$lib";
import { FontLoader, type FontData } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import defaultFont from "$lib/fonts/EnvyCodeR Nerd Font_Bold_restricted.json";
import { Vector2 } from "three";

export function getPointsEvenly(spacing: number, text: string, fontData?: FontData): number[] {
    const accepted: number[] = [];

    const dx = spacing,
        dy = (spacing * Math.sqrt(3)) / 2;

    const font = new FontLoader().parse(fontData ?? defaultFont);

    //
    // Create the text geometry
    //
    const textGeometry = new TextGeometry(text, {
        font,
        size: 2,
        depth: 0,
        curveSegments: 12,
        bevelEnabled: false,
        steps: 1,
    });

    textGeometry.center();
    textGeometry.computeBoundingBox();

    //
    // Sample points
    //
    const textMin = textGeometry.boundingBox!.min,
        textMax = textGeometry.boundingBox!.max;

    const __p = new Vector2(),
        __a = new Vector2(),
        __b = new Vector2(),
        __c = new Vector2();

    const textPoints = textGeometry.getAttribute("position");

    for (let y = textMin.y; y <= textMax.y; y += dy) {
        const offset = (Math.floor(y / dy) % 2) * dx * 0.5;

        for (let x = textMin.x + offset; x <= textMax.x; x += dx) {
            __p.set(x, y);

            let valid = false;

            for (let i = 0; i < textPoints.count / 3; i++) {
                if (
                    pointInTriangle(
                        __p,
                        __a.set(
                            textPoints.getX(3 * i),
                            textPoints.getY(3 * i),
                        ),
                        __b.set(
                            textPoints.getX(3 * i + 1),
                            textPoints.getY(3 * i + 1),
                        ),
                        __c.set(
                            textPoints.getX(3 * i + 2),
                            textPoints.getY(3 * i + 2),
                        ),
                    )
                ) {
                    valid = true;
                    break;
                }
            }

            if (valid) accepted.push(x, y, 0);
        }
    }

    // DON'T FORGET TO FREE MEMORY !!!
    textGeometry.dispose();

    return accepted;
}