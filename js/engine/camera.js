// Camera / viewport system for isometric world and combat views
// Manages panning, zooming, and coordinate transforms.

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.offsetX = 0;
    this.offsetY = 0;
    this._zoom = 1.0;
    this.minZoom = 0.5;
    this.maxZoom = 2.0;
  }

  // Move camera by delta pixels (in screen space)
  pan(dx, dy) {
    this.offsetX += dx;
    this.offsetY += dy;
  }

  // Center the camera so the given screen coordinate is at the canvas center
  centerOn(screenX, screenY) {
    this.offsetX = screenX - this.canvas.width / (2 * this._zoom);
    this.offsetY = screenY - this.canvas.height / (2 * this._zoom);
  }

  // Zoom by factor, keeping the canvas point (centerX, centerY) fixed
  zoom(factor, centerX = null, centerY = null) {
    const cx = centerX !== null ? centerX : this.canvas.width / 2;
    const cy = centerY !== null ? centerY : this.canvas.height / 2;

    // World position under the zoom center before zoom
    const worldX = cx / this._zoom + this.offsetX;
    const worldY = cy / this._zoom + this.offsetY;

    // Apply new zoom
    this._zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this._zoom * factor));

    // Recompute offset so worldX/worldY stays under (cx, cy)
    this.offsetX = worldX - cx / this._zoom;
    this.offsetY = worldY - cy / this._zoom;
  }

  // Reset camera to default state
  reset() {
    this.offsetX = 0;
    this.offsetY = 0;
    this._zoom = 1.0;
  }

  // Apply camera transform to a canvas 2D context
  apply(ctx) {
    ctx.save();
    ctx.setTransform(this._zoom, 0, 0, this._zoom, -this.offsetX * this._zoom, -this.offsetY * this._zoom);
  }

  // Restore context saved by apply()
  restore(ctx) {
    ctx.restore();
  }

  // Convert world (isometric screen) coordinates to actual canvas pixel coordinates
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.offsetX) * this._zoom,
      y: (wy - this.offsetY) * this._zoom,
    };
  }

  // Convert canvas pixel coordinates to world (isometric screen) coordinates
  screenToWorld(sx, sy) {
    return {
      x: sx / this._zoom + this.offsetX,
      y: sy / this._zoom + this.offsetY,
    };
  }

  // Expose zoom value as read-only property via getter
  get zoomLevel() {
    return this._zoom;
  }

  // Allow direct set with clamping
  setZoom(z) {
    this._zoom = Math.min(this.maxZoom, Math.max(this.minZoom, z));
  }
}

// Factory function
export function initCamera(canvas) {
  return new Camera(canvas);
}

export default Camera;
