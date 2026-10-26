export interface CropArea { x: number; y: number; width: number; height: number }

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Cannot load image'));
    img.src = src;
});

export async function cropToAvatar(src: string, area: CropArea, size = 256, quality = 0.85) {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
    return { data: canvas.toDataURL('image/jpeg', quality).split(',')[1], contentType: 'image/jpeg' };
}
