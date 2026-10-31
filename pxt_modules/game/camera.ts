
namespace scene {


    export class Camera 
	{
	
		// coordinate used for all physics computation
        protected _offsetX: number;
        protected _offsetY: number;

        // coordinate used for draw sprites, may including shaking
        drawOffsetX: number;
        drawOffsetY: number;
        sprite: Sprite;
        protected _lastUpdatedSpriteX: number;
        protected _lastUpdatedSpriteY: number;

        protected shakeStartTime: number;
        protected shakeDuration: number;
        protected shakeAmplitude: number;
		
		
        /*	Sistema de seguimiento CRC Game Egine
			con mcfx = mcfy = 0; funciona igual que por defecto en Arcade Makecode
		*/
			/*	Margen en pixeles desde el borde de pantalla. 0 = sprite siempre centrado.
					rango X min 30 - 80 max ( IMPORTANTE multiplo de 2 )
					rango Y min 20 - 60 max ( IMPORTANTE multiplo de 2 )
			*/
        mcfx: number = 54;
        mcfy: number = 44;
			// Pixeles maximos por frame (0 = sin suavizado, movimiento instantaneo)
        smoothX: number = 4;
        smoothY: number = 6;
			// Desactivar temporalmente el seguimiento por eje
        cnfx: boolean = true;
        cnfy: boolean = true;
			// En Y, dentro de la zona de margen el sprite se lleva al margen inferior
        anchorBottomY: boolean = true;
			// indica si el bakcground se ha desplazado en este fotograma (true)
        bgmove: boolean = false;
		
		
        constructor() {
            this._offsetX = 0;
            this._offsetY = 0;

            this.drawOffsetX = 0;
            this.drawOffsetY = 0;
        }

        get offsetX() {
            return this._offsetX;
        }
        set offsetX(v: number) {
            const scene = game.currentScene();
            if (scene.tileMap && scene.tileMap.enabled) {
                this._offsetX = Math.floor(scene.tileMap.offsetX(v));
            } else {
                this._offsetX = Math.floor(v);
            }
        }
        get offsetY() {
            return this._offsetY;
        }
        set offsetY(v: number) {
            const scene = game.currentScene();
            if (scene.tileMap && scene.tileMap.enabled) {
                this._offsetY = Math.floor(scene.tileMap.offsetY(v));
            } else {
                this._offsetY = Math.floor(v);
            }
        }

        get x() {
            return this.offsetX + (screen.width >> 1);
        }
        get y() {
            return this.offsetY + (screen.height >> 1);
        }
        get left() {
            return this.offsetX;
        }
        get right() {
            return this.offsetX + screen.width;
        }
        get top() {
            return this.offsetY;
        }
        get bottom() {
            return this.offsetY + screen.height;
        }

        shake(amplitude: number = 4, duration: number = 1000) {
            if (amplitude <= 0 || duration <= 0) {
                this.shakeStartTime = undefined;
            } else {
                // this overrides any existing shake operation
                this.shakeStartTime = control.millis();
                this.shakeAmplitude = amplitude;
                this.shakeDuration = duration;
                // don't reset offset, will be recomputed in update
            }
        }

        protected clampX(v: number): number {
            const s = game.currentScene();
            return Math.floor(s.tileMap && s.tileMap.enabled ? s.tileMap.offsetX(v) : v);
        }

        protected clampY(v: number): number {
            const s = game.currentScene();
            return Math.floor(s.tileMap && s.tileMap.enabled ? s.tileMap.offsetY(v) : v);
        }

        // Si la distancia es > step y < range avanza 'step'; si no, salta al destino
        protected approach(cur: number, target: number, step: number, range: number): number {
            const d = target - cur;
            if (step > 0 && Math.abs(d) > step && Math.abs(d) < range)
                return cur + (d > 0 ? step : -step);
            return target;
        }

        // RIC
        isUpdated() {
            return !this.sprite || (this.sprite.x === this._lastUpdatedSpriteX && this.sprite.y === this._lastUpdatedSpriteY);
        }

        // RIC
        update()
		{
			// 1. Guardamos la posición previa antes de actualizar
            const prevX = this.drawOffsetX;
            const prevY = this.drawOffsetY;
			
			// if sprite, follow sprite
            if (this.sprite)
				{
                
				this._lastUpdatedSpriteX = this.sprite.x;
                this._lastUpdatedSpriteY = this.sprite.y;

                const sw = screen.width;
                const sh = screen.height;
                const sx = this.sprite.x;   // centro del sprite
                const sy = this.sprite.y;

				// movimiento camara en EJE X
                if (this.cnfx)
					{
                    
					const m = Math.min(this.mcfx, (sw >> 1) - 1);
                    let target: number;
                    if (m > 0) {
                        if (sx - this._offsetX < m) target = sx - m;
                        else if (sx > this._offsetX + sw - m) target = sx + m - sw;
                        else target = this._offsetX;
                    } else {
                        target = sx - (sw >> 1);
                    }
                    target = this.clampX(target);
                    this.offsetX = this.approach(this._offsetX, target, this.smoothX, sw >> 2);
					
					}

				// movimiento camara en EJE Y
                if (this.cnfy)
					{
                    
					const m = Math.min(this.mcfy, (sh >> 1) - 1);
					
                    let target: number;
					
                    if (m > 0)
						{
						
                        if (sy - this._offsetY < m)				target = sy - m;
                        else if (sy > this._offsetY + sh - m)	target = sy + m - sh;
                        else
							{
							// estamos en la zona de NO mover la camara ...
					
							// si tenemos el anclado por abajo, intenta mantener siempre el SPRITE abajo, para ver mas parte de juego por arriba
							if (this.anchorBottomY)
								{
								
								// posicion de camara que dejaria al sprite exactamente anclado abajo
								const anchorTarget = sy + m - sh;
								
								if (anchorTarget >= this._offsetY)
									{
									// el sprite ha bajado: la camara baja para mantener el ancla
									target = anchorTarget;
									}
								else if (anchorTarget >= this._offsetY - this.smoothY)
									{
									// sube pocos píxeles (escalón): la camara NO se mueve
									target = this._offsetY;
									}
								else
									{
									// sube más que la tolerancia: la camara sigue, manteniendo "tol" de margen
									target = anchorTarget + this.smoothY;
									}
								
								}
							else
								{
								target = this._offsetY;
								}
							
							}
						}
					else
						{
                        target = sy - (sh >> 1);
						}
					
                    target = this.clampY(target);
					
                    this.offsetY = this.approach(this._offsetY, target, this.smoothY, sh >> 2);
					
					}
				
				}

            this.drawOffsetX = this.offsetX;
            this.drawOffsetY = this.offsetY;

            // apply shake if needed
            if (this.shakeStartTime !== undefined)
				{
                
				const elapsed = control.millis() - this.shakeStartTime;
                if (elapsed >= this.shakeDuration) {
                    // we are done!
                    this.shakeStartTime = undefined;
                } else {
                    // compute new shake
                    const percentComplete = elapsed / this.shakeDuration;
                    const dampStart = 0.75;
                    let damp = 1;
                    if (percentComplete >= dampStart)
                        damp = Math.max(0, 1 - percentComplete);
                    const f = this.shakeAmplitude * damp;
                    const x = (Math.random() * f) >> 0;
                    const y = (Math.random() * f) >> 0;
                    // apply to offset
                    this.drawOffsetX += x;
                    this.drawOffsetY += y;
					}
				
				}
			
			// 2. Actualizamos la propiedad booleana comparando la posición previa con la nueva
            this.bgmove = (prevX !== this.drawOffsetX || prevY !== this.drawOffsetY);
			
			// RIC DEBUG
			//if (this.bgmove) control.EventContext.onStats( "VM : Scroll BG");
			
        }
	
	
	}


}

