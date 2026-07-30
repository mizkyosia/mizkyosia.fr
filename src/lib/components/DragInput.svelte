<script lang="ts">
    let prevX = 0;

    interface Props {
        value: number;
        multiplier?: number;
        step?: number;
        isDragging?: boolean;
        cssClass?: string;
        min?: number;
        max?: number;
    }

    let {
        value = $bindable(),
        isDragging = $bindable(false),
        multiplier = 0.1,
        step = multiplier,
        cssClass = "",
        min = -1000,
        max = 1000,
    }: Props = $props();

    let precision = $derived(Math.floor(Math.log10(1 / Math.min(1, step))));
    let sigDigits = $derived(
        Math.max(0, (Math.floor(Math.log10(Math.abs(value))) || 0) + 1),
    );
    let preciseValue = $derived(value.toPrecision(precision + sigDigits));

    function handleMouseDown(e: MouseEvent) {
        isDragging = true;
        prevX = e.clientX;
    }

    function handleMouseMove(e: MouseEvent) {
        if (!isDragging) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

        const delta = e.clientX - prevX;

        value +=
            Math.round((delta * multiplier + Number.EPSILON) / step) * step;

        if (value < min) value = min;
        else if (value > max) value = max;

        prevX = e.clientX;
    }

    function handleMouseUp() {
        isDragging = false;
    }
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<input
    type="number"
    value={preciseValue}
    onmousedown={handleMouseDown}
    {step}
    class="cursor-ew-resize appearance-none select-none {cssClass}"
    {min}
    {max}
/>

<style>
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    input[type="number"] {
        -moz-appearance: textfield;
    }
</style>
