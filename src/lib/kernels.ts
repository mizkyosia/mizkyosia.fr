export function poly6(r2: number, h2: number): number {
    if (r2 >= h2) return 0;
    const v = h2 - r2;
    return v * v * v
        * 315 / (64 * Math.PI * Math.pow(h2, 4.5)); // Divide by volume for normalization
}

export function poly6Grad(r2: number, h2: number, r: number = Math.sqrt(r2)): number {
    if (r2 >= h2) return 0;
    const v = h2 - r2;
    return -v * v * r * 2
        * 315 / (64 * Math.PI * Math.pow(h2, 4.5)); // Divide by volume for normalization
}

export function spiky(r: number, h: number): number {
    if (r > h) return 0;
    const v = h - r;
    return v * v * v
        * 6 / (Math.PI * Math.pow(h, 4)); // Divide by volume for normalization
}

export function spikyGrad(r: number, h: number): number {
    if (r < 0 || r >= h) return 0;

    const v = (h-r);

    return v * v * 18 / (Math.PI * Math.pow(h, 4));
}


export function viscosity(r: number, h: number): number {
    if (r < 0 || r > h) return 0;

    const h3 = h * h * h;

    return (
        -(r * r * r) / (2 * h3)
        + (r * r) / (h * h)
        + h / (2 * r)
        + 1
    )
        * 15 / (2 * Math.PI * h3); // Divide by volume for normalization
}