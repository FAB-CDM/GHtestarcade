class PhysicsEngine {
    constructor() {
    }

    /**
     * Adds sprite to the physics
     * @param sprite
     */
    addSprite(sprite: Sprite) { }

    removeSprite(sprite: Sprite) { }

    /** move a single sprite **/
    moveSprite(s: Sprite, dx: Fx8, dy: Fx8) { }

    draw() { }

    /** Apply physics and collisions to all sprites **/
    move(dt: number) { }

    setMaxSpeed(speed: number) { }

    overlaps(sprite: Sprite): Sprite[] { return []; }
}

const MAX_TIME_STEP = 100; // milliseconds
const MIN_MOVE_GAP = Fx8(0.1);

const SPRITE_NO_TILE_OVERLAPS = SpriteFlag.GhostThroughTiles | sprites.Flag.Destroyed | SpriteFlag.RelativeToCamera;
const SPRITE_NO_WALL_COLLISION = SpriteFlag.GhostThroughWalls | sprites.Flag.IsClipping | sprites.Flag.Destroyed | SpriteFlag.RelativeToCamera;
const SPRITE_NO_SPRITE_OVERLAPS = SpriteFlag.GhostThroughSprites | sprites.Flag.Destroyed | SpriteFlag.RelativeToCamera;
const SPRITE_NO_GMA = SpriteFlag.Ghost | SpriteFlag.GhostThroughWalls | sprites.Flag.Destroyed | SpriteFlag.RelativeToCamera;

class MovingSprite {
    constructor(
        public sprite: Sprite,
        // vx and vy when last updated
        public cachedVx: Fx8,
        public cachedVy: Fx8,
        // remaining x
        public dx: Fx8,
        public dy: Fx8,
        // how much to move per step
        public xStep: Fx8,
        public yStep: Fx8
    ) { }
}

/**
 * A physics engine that does simple AABB bounding box check
 */
class ArcadePhysicsEngine extends PhysicsEngine {
    protected sprites: Sprite[];
    protected map: sprites.SpriteMap;
    protected maxVelocity: Fx8;
    protected maxNegativeVelocity: Fx8;
    protected minSingleStep: Fx8;
    protected maxSingleStep: Fx8;

    constructor(maxVelocity = 500, minSingleStep = 2, maxSingleStep = 4) {
        super();
        this.sprites = [];
        this.map = new sprites.SpriteMap();
        this.maxSpeed = maxVelocity;
        this.maxStep = maxSingleStep;
        this.minStep = minSingleStep;
    }

    get maxSpeed(): number {
        return Fx.toInt(this.maxVelocity);
    }

    set maxSpeed(v: number) {
        this.maxVelocity = Fx8(v);
        this.maxNegativeVelocity = Fx.neg(this.maxVelocity);
    }

    get minStep(): number {
        return Fx.toInt(this.minSingleStep);
    }

    set minStep(v: number) {
        this.minSingleStep = Fx8(v);
    }

    get maxStep(): number {
        return Fx.toInt(this.maxSingleStep);
    }

    set maxStep(v: number) {
        this.maxSingleStep = Fx8(v);
    }

    setMaxSpeed(v: number) {
        this.maxSpeed = v;
    }

    addSprite(sprite: Sprite) {
        this.sprites.push(sprite);
        const tm = game.currentScene().tileMap;
        if (tm && tm.isOnWall(sprite)) {
            sprite.flags |= sprites.Flag.IsClipping;
        }
    }

    removeSprite(sprite: Sprite) {
        this.sprites.removeElement(sprite);
    }

    draw() {
        this.map.draw();
    }

	// RIC
    move(dt: number) {
        // Sprite movement logic is done in milliseconds to avoid rounding errors with Fx8 numbers
        const dtMs = Math.min(MAX_TIME_STEP, dt * 1000);
        const dt2 = Math.idiv(dtMs, 2);

        const scene = game.currentScene();

        const tileMap = scene.tileMap;
        const movingSprites = this.sprites
            .map(sprite => this.createMovingSprite(sprite, dtMs, dt2));

        // clear obstacles if moving on that axis
        this.sprites.forEach(s => {
            if (s.vx || s.vy) s.clearObstacles();
        });

        this.map.clear();
        this.map.resizeBuckets(this.sprites);

        const MAX_STEP_COUNT = Fx.toInt(
            Fx.idiv(
                Fx.imul(
                    Fx.div(
                        this.maxVelocity,
                        this.minSingleStep
                    ),
                    dtMs
                ),
                1000
            )
        );
        const overlapHandlers = scene.overlapHandlers.slice();

        // buffers store the moving sprites on each step; switch back and forth between the two
        let selected = 0;
        let buffers = [movingSprites, []];
        for (let count = 0; count < MAX_STEP_COUNT && buffers[selected].length !== 0; ++count)
			{
            
			// intercambia buffers
			const currMovers = buffers[selected];
            selected ^= 1;
            const remainingMovers = buffers[selected];
			
			// va SPRITE por SPRITE
            for (let ms of currMovers)
				{
				
                const s = ms.sprite;
				
                // if still moving and speed has changed from a collision or overlap;
                // reverse direction if speed has reversed
                if (ms.cachedVx !== s._vx)
					{
                    
					if (s._vx == Fx.zeroFx8)
						{
                        ms.dx = Fx.zeroFx8;
						}
					else if (s._vx < Fx.zeroFx8 && ms.cachedVx > Fx.zeroFx8
                        || s._vx > Fx.zeroFx8 && ms.cachedVx < Fx.zeroFx8)
						{
                        ms.dx = Fx.neg(ms.dx);
                        ms.xStep = Fx.neg(ms.xStep);
						}

                    ms.cachedVx = s._vx;
					
					}
                if (ms.cachedVy !== s._vy)
					{
					
                    if (s._vy == Fx.zeroFx8)
						{
                        ms.dy = Fx.zeroFx8;
						}
					else if (s._vy < Fx.zeroFx8 && ms.cachedVy > Fx.zeroFx8
                        || s._vy > Fx.zeroFx8 && ms.cachedVy < Fx.zeroFx8)
						{
                        ms.dy = Fx.neg(ms.dy);
                        ms.yStep = Fx.neg(ms.yStep);
						}

                    ms.cachedVy = s._vy;
					
					}

                // identify how much to move in this step
                const stepX = Fx.abs(ms.xStep) > Fx.abs(ms.dx) ? ms.dx : ms.xStep;
                const stepY = Fx.abs(ms.yStep) > Fx.abs(ms.dy) ? ms.dy : ms.yStep;
                ms.dx = Fx.sub(ms.dx, stepX);
                ms.dy = Fx.sub(ms.dy, stepY);

                s._lastX = s._x;
                s._lastY = s._y;
                s._x = Fx.add(s._x, stepX);
                s._y = Fx.add(s._y, stepY);

                if (!(s.flags & SPRITE_NO_SPRITE_OVERLAPS) && s._kindsOverlappedWith.length)
					{
                    this.map.insertAABB(s);
					}
				
				/*	RIC aqui es donde para un SPRITE se mira si colisiona con el TileMap
				
					- si toca algun WALL lo coloca tanto en X o Y que se pega sin sobrepasar
						- registra eventos por si tenemos callbaks -> s.registerObstacle(dirección, tile, tm)
					- si ya no hay que comprobar se pone dx=0 y dy=0
					
					- Como X se resuelve y se corrige antes que Y, el sprite puede deslizarse
						por una pared en vez de quedarse pegado en las esquinas.
						
					- por ultimo cuando sabe la posicion final, mira todos los tiles que pisa, y si tiene
					  callback de esos y los va ejecutando los callbacks
						-> tilemapOverlaps(s, overlappedTiles);
				*/
                if (tileMap && tileMap.enabled)
					{
                    this.tilemapCollisions(ms, tileMap);
					}

                // check for screen edge collisions
                const bounce = s.flags & sprites.Flag.BounceOnWall;
                if (s.flags & sprites.Flag.StayInScreen || (bounce && !tileMap))
					{
                    this.screenEdgeCollisions(ms, bounce, scene.camera);
					}

                // if sprite still needs to move, add it to the next step of movements
                if (Fx.abs(ms.dx) > MIN_MOVE_GAP || Fx.abs(ms.dy) > MIN_MOVE_GAP)
					{
					// aqui los que aun hemos de comprobar los vamos llenando
                    remainingMovers.push(ms);
					}
				
				}

            // this step is done; check collisions between sprites
            this.spriteCollisions(currMovers, overlapHandlers);
			
            // vacia la lista para rellenarla de nuevo (cada vez van quedando menos al rellenar)
            while (currMovers.length) currMovers.pop();
        
			}
		
    }

    protected createMovingSprite(sprite: Sprite, dtMs: number, dt2: number): MovingSprite {
        const ovx = this.constrain(sprite._vx);
        const ovy = this.constrain(sprite._vy);
        sprite._lastX = sprite._x;
        sprite._lastY = sprite._y;

        if (sprite._ax) {
            sprite._vx = Fx.add(
                sprite._vx,
                Fx.idiv(
                    Fx.imul(
                        sprite._ax,
                        dtMs
                    ),
                    1000
                )
            );
        } else if (sprite._fx) {
            const fx = Fx.idiv(
                Fx.imul(
                    sprite._fx,
                    dtMs
                ),
                1000
            );
            const c = Fx.compare(sprite._vx, fx);
            if (c < 0) // v < f, v += f
                sprite._vx = Fx.min(Fx.zeroFx8, Fx.add(sprite._vx, fx));
            else if (c > 0) // v > f, v -= f
                sprite._vx = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vx, fx));
            else
                sprite._vx = Fx.zeroFx8
        }

        if (sprite._ay) {
            sprite._vy = Fx.add(
                sprite._vy,
                Fx.idiv(
                    Fx.imul(
                        sprite._ay,
                        dtMs
                    ),
                    1000
                )
            );
        } else if (sprite._fy) {
            const fy = Fx.idiv(
                Fx.imul(
                    sprite._fy,
                    dtMs
                ),
                1000
            );
            const c = Fx.compare(sprite._vy, fy);
            if (c < 0) // v < f, v += f
                sprite._vy = Fx.min(Fx.zeroFx8, Fx.add(sprite._vy, fy));
            else if (c > 0) // v > f, v -= f
                sprite._vy = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vy, fy));
            else
                sprite._vy = Fx.zeroFx8;
        }

        sprite._vx = this.constrain(sprite._vx);
        sprite._vy = this.constrain(sprite._vy);

        const dx = Fx8(Fx.toFloat(Fx.add(sprite._vx, ovx)) * dt2 / 1000);
        const dy = Fx8(Fx.toFloat(Fx.add(sprite._vy, ovy)) * dt2 / 1000);

        let xStep = dx;
        let yStep = dy;

        // make step increments smaller until under max step size
        while (Fx.abs(xStep) > this.maxSingleStep || Fx.abs(yStep) > this.maxSingleStep) {
            if (Fx.abs(xStep) > this.minSingleStep) {
                xStep = Fx.idiv(xStep, 2);
            }
            if (Fx.abs(yStep) > this.minSingleStep) {
                yStep = Fx.idiv(yStep, 2);
            }
        }

        return new MovingSprite(
            sprite,
            sprite._vx,
            sprite._vy,
            dx,
            dy,
            xStep,
            yStep
        );
    }

    protected spriteCollisions(movedSprites: MovingSprite[], handlers: scene.OverlapHandler[]) {
        control.enablePerfCounter("phys_collisions");
        if (!handlers.length) return;

        // clear the overlap lists on all sprites
        for (const sprite of this.sprites) {
            sprite._alreadyChecked = undefined;
        }

        for (const bucket of this.map.filledBuckets) {
            if (bucket.length === 1) continue;

            for (const sprite of bucket) {
                if (sprite.flags & SPRITE_NO_SPRITE_OVERLAPS) continue;

                for (const overlapper of bucket) {
                    if (overlapper === sprite) continue;
                    const thisKind = sprite.kind();
                    const otherKind = overlapper.kind();

                    // the sprite with the higher id maintains the overlap lists
                    const higher = sprite.id > overlapper.id ? sprite : overlapper;
                    const lower = higher === sprite ? overlapper : sprite;

                    if (!higher._alreadyChecked) {
                        higher._alreadyChecked = [];
                    }

                    // skip if we already compared these two
                    if (higher._alreadyChecked.indexOf(lower.id) !== -1) continue;

                    higher._alreadyChecked.push(lower.id);

                    // skip if already overlapping
                    if (higher._overlappers.indexOf(lower.id) !== -1) continue;

                    // skip if there is no overlap event between these two kinds of sprites
                    if (sprite._kindsOverlappedWith.indexOf(otherKind) === -1) continue;

                    // perform the actual overlap check
                    if (!higher.overlapsWith(lower)) continue;

                    // invoke all matching overlap event handlers
                    for (const h of handlers)
						{
                        
						if ( (h.kind === thisKind && h.otherKind === otherKind)
												||
							 (h.kind === otherKind && h.otherKind === thisKind) )
							{
                            
							higher._overlappers.push(lower.id);
							
							// RIC Para cada overlapped se crea una FIBER con la funcion a ejecutar
							control.runInParallel(() =>
								{
								
								if (!((sprite.flags | overlapper.flags) & SPRITE_NO_SPRITE_OVERLAPS))
									{
									
									if (thisKind === h.kind)
										{
										h.handler(sprite, overlapper)
										}
									else
										{
										h.handler(overlapper, sprite)
										}
									
									}
								
								higher._overlappers.removeElement(lower.id);
								
								});
							
							}
						
						}
					
                }
            }
        }
    }

    protected screenEdgeCollisions(movingSprite: MovingSprite, bounce: number, camera: scene.Camera) {
        let s = movingSprite.sprite;
        if (!s.isStatic()) s.setHitbox();
        if (!camera.isUpdated()) camera.update();

        let offset = Fx.toFloat(s._hitbox.left) - camera.offsetX;
        if (offset < 0) {
            s.left -= offset;
            if (bounce) s.vx = -s.vx;
        }
        else if ((offset = Fx.toFloat(s._hitbox.right) - camera.offsetX - screen.width) > 0) {
            s.right -= offset;
            if (bounce) s.vx = -s.vx;
        }
        if ((offset = Fx.toFloat(s._hitbox.top) - camera.offsetY) < 0) {
            s.top -= offset;
            if (bounce) s.vy = -s.vy;
        }
        else if ((offset = Fx.toFloat(s._hitbox.bottom) - camera.offsetY - screen.height) > 0) {
            s.bottom -= offset;
            if (bounce) s.vy = -s.vy;
        }
    }

    protected tilemapCollisions(movingSprite: MovingSprite, tm: tiles.TileMap) {
        const s = movingSprite.sprite;
        // if the sprite is already clipping into a wall,
        // allow free movement rather than randomly 'fixing' it
        if (s.flags & sprites.Flag.IsClipping) {
            if (!tm.isOnWall(s)) {
                s.flags &= ~sprites.Flag.IsClipping;
            }
        }
        if (!s.isStatic()) s.setHitbox();
        const hbox = s._hitbox;
        const tileScale = tm.scale;
        const tileSize = 1 << tileScale;

        const xDiff = Fx.sub(
            s._x,
            s._lastX
        );

        const yDiff = Fx.sub(
            s._y,
            s._lastY
        );

        if (!(s.flags & SPRITE_NO_WALL_COLLISION)) {
            if (xDiff !== Fx.zeroFx8) {
                const right = xDiff > Fx.zeroFx8;
                const x0 = Fx.toIntShifted(
                    Fx.add(
                        right ?
                            Fx.add(hbox.right, Fx.oneFx8)
                            :
                            Fx.sub(hbox.left, Fx.oneFx8),
                        Fx.oneHalfFx8
                    ),
                    tileScale
                );

                const collidedTiles: sprites.StaticObstacle[] = [];

                // check collisions with tiles sprite is moving towards horizontally
                for (
                    let y = Fx.sub(hbox.top, yDiff);
                    y < Fx.iadd(tileSize, Fx.sub(hbox.bottom, yDiff));
                    y = Fx.iadd(tileSize, y)
                ) {
                    const y0 = Fx.toIntShifted(
                        Fx.add(
                            Fx.min(
                                y,
                                Fx.sub(
                                    hbox.bottom,
                                    yDiff
                                )
                            ),
                            Fx.oneHalfFx8
                        ),
                        tileScale
                    );

                    if (tm.isObstacle(x0, y0)) {
                        const obstacle = tm.getObstacle(x0, y0);
                        if (!collidedTiles.some(o => o.tileIndex === obstacle.tileIndex)) {
                            collidedTiles.push(obstacle);
                        }
                    }
                }

                if (collidedTiles.length) {
                    const collisionDirection = right ? CollisionDirection.Right : CollisionDirection.Left;
                    s._x = Fx.sub(
                        right ?
                            Fx.sub(
                                Fx8(x0 << tileScale),
                                hbox.width
                            )
                            :
                            Fx8((x0 + 1) << tileScale),
                        hbox.ox
                    );

                    for (const tile of collidedTiles) {
                        if(!(s.flags & SPRITE_NO_WALL_COLLISION)) {
                            s.registerObstacle(collisionDirection, tile, tm);
                        }
                    }

                    if (s.flags & sprites.Flag.DestroyOnWall) {
                        s.destroy();
                    } else if (s._vx === movingSprite.cachedVx && !(s.flags & SPRITE_NO_WALL_COLLISION)) {
                        // sprite collision event didn't change velocity in this direction;
                        // apply normal updates
                        if (s.flags & sprites.Flag.BounceOnWall) {
                            if ((!right && s.vx < 0) || (right && s.vx > 0)) {
                                s._vx = Fx.neg(s._vx);
                                movingSprite.xStep = Fx.neg(movingSprite.xStep);
                                movingSprite.dx = Fx.neg(movingSprite.dx);
                            }
                        } else {
                            movingSprite.dx = Fx.zeroFx8;
                            s._vx = Fx.zeroFx8;
                        }
                    } else if (Math.sign(Fx.toInt(s._vx)) === Math.sign(Fx.toInt(movingSprite.cachedVx))) {
                        // sprite collision event changed velocity,
                        // but still facing same direction; prevent further movement this update.
                        movingSprite.dx = Fx.zeroFx8;
                    }
                }
            }

            if (yDiff !== Fx.zeroFx8) {
                const down = yDiff > Fx.zeroFx8;
                const y0 = Fx.toIntShifted(
                    Fx.add(
                        down ?
                            Fx.add(hbox.bottom, Fx.oneFx8)
                            :
                            Fx.sub(hbox.top, Fx.oneFx8),
                        Fx.oneHalfFx8
                    ),
                    tileScale
                );
                const collidedTiles: sprites.StaticObstacle[] = [];

                // check collisions with tiles sprite is moving towards vertically
                for (
                    let x = hbox.left;
                    x < Fx.iadd(tileSize, hbox.right);
                    x = Fx.iadd(tileSize, x)
                ) {
                    const x0 = Fx.toIntShifted(
                        Fx.add(
                            Fx.min(
                                x,
                                hbox.right
                            ),
                            Fx.oneHalfFx8
                        ),
                        tileScale
                    );

                    if (tm.isObstacle(x0, y0)) {
                        const obstacle = tm.getObstacle(x0, y0);
                        if (!collidedTiles.some(o => o.tileIndex === obstacle.tileIndex)) {
                            collidedTiles.push(obstacle);
                        }
                    }
                }

                if (collidedTiles.length) {
                    const collisionDirection = down ? CollisionDirection.Bottom : CollisionDirection.Top;
                    s._y = Fx.sub(
                        down ?
                            Fx.sub(
                                Fx8(y0 << tileScale),
                                hbox.height
                            )
                            :
                            Fx8((y0 + 1) << tileScale),
                        hbox.oy
                    );

                    for (const tile of collidedTiles) {
                        if(!(s.flags & SPRITE_NO_WALL_COLLISION)) {
                            s.registerObstacle(collisionDirection, tile, tm);
                        }
                    }

                    if (s.flags & sprites.Flag.DestroyOnWall) {
                        s.destroy();
                    } else if (s._vy === movingSprite.cachedVy && !(s.flags & SPRITE_NO_WALL_COLLISION)) {
                        // sprite collision event didn't change velocity in this direction;
                        // apply normal updates
                        if (s.flags & sprites.Flag.BounceOnWall) {
                            if ((!down && s.vy < 0) || (down && s.vy > 0)) {
                                s._vy = Fx.neg(s._vy);
                                movingSprite.yStep = Fx.neg(movingSprite.yStep);
                                movingSprite.dy = Fx.neg(movingSprite.dy);
                            }
                        } else {
                            movingSprite.dy = Fx.zeroFx8;
                            s._vy = Fx.zeroFx8;
                        }
                    } else if (Math.sign(Fx.toInt(s._vy)) === Math.sign(Fx.toInt(movingSprite.cachedVy))) {
                        // sprite collision event changed velocity,
                        // but still facing same direction; prevent further movement this update.
                        movingSprite.dy = Fx.zeroFx8;
                    }
                }
            }
        }


        if (!(s.flags & SPRITE_NO_TILE_OVERLAPS)) {
            // Now that we've moved, check all of the tiles underneath the current position
            // for overlaps
            const overlappedTiles: tiles.Location[] = [];
            for (
                let x = hbox.left;
                x < Fx.iadd(tileSize, hbox.right);
                x = Fx.iadd(tileSize, x)
            ) {
                const x0 = Fx.toIntShifted(
                    Fx.add(
                        Fx.min(
                            x,
                            hbox.right
                        ),
                        Fx.oneHalfFx8
                    ),
                    tileScale
                );
                for (
                    let y = hbox.top;
                    y < Fx.iadd(tileSize, hbox.bottom);
                    y = Fx.iadd(tileSize, y)
                ) {
                    const y0 = Fx.toIntShifted(
                        Fx.add(
                            Fx.min(
                                y,
                                hbox.bottom
                            ),
                            Fx.oneHalfFx8
                        ),
                        tileScale
                    );

                    // if the sprite can move through walls, it can overlap the underlying tile.
                    if (!tm.isObstacle(x0, y0) || !!(s.flags & sprites.Flag.GhostThroughWalls)) {
                        overlappedTiles.push(tm.getTile(x0, y0));
                    }
                }
            }

            if (overlappedTiles.length) {
                this.tilemapOverlaps(s, overlappedTiles);
            }
        }
    }

    /**
     * Given a sprite and a list of overlapped tiles, checks the overlap handlers and calls
     * the ones appropriate to the sprite and tile kind.
     * @param sprite the sprite
     * @param overlappedTiles the list of tiles the sprite is overlapping
     */
    protected tilemapOverlaps(sprite: Sprite, overlappedTiles: tiles.Location[]) {
        const alreadyHandled: tiles.Location[] = [];

        for (const tile of overlappedTiles) {
            if (alreadyHandled.some(l => l.column === tile.column && l.row === tile.row)) {
                continue;
            }
            alreadyHandled.push(tile);

            const tileOverlapHandlers = game.currentScene().tileOverlapHandlers;
            if (tileOverlapHandlers) {
                tileOverlapHandlers
                    .filter(h => h.spriteKind == sprite.kind() && h.tileKind.equals(tiles.getTileImage(tile)))
                    .forEach(h => h.handler(sprite, tile));
            }
        }
    }

    /**
     * Returns sprites that overlap with the given sprite. If type is non-zero, also filter by type.
     * @param sprite
     * @param layer
     */
    overlaps(sprite: Sprite): Sprite[] {
        return this.map.overlaps(sprite);
    }

    /** moves a sprite explicitly outside of the normal velocity changes **/
    public moveSprite(s: Sprite, dx: Fx8, dy: Fx8) {
        s._lastX = s._x;
        s._lastY = s._y;
        s._x = Fx.add(s._x, dx);
        s._y = Fx.add(s._y, dy);

        // if the sprite can collide with things, check tile map
        const tm = game.currentScene().tileMap;
        if (tm && tm.enabled) {
            const maxDist = Fx.toInt(this.maxSingleStep);
            // only check tile map if moving within a single step
            if (Math.abs(Fx.toInt(dx)) <= maxDist && Math.abs(Fx.toInt(dy)) <= maxDist) {
                const ms = new MovingSprite(
                    s,
                    s._vx,
                    s._vy,
                    dx,
                    dy,
                    dx,
                    dy
                );
                this.tilemapCollisions(ms, tm);
                // otherwise, accept movement...
            } else if (tm.isOnWall(s) && !this.canResolveClipping(s, tm)) {
                // if no luck, flag as clipping into a wall
                s.flags |= sprites.Flag.IsClipping;
            } else {
                // or clear clipping if no longer clipping
                s.flags &= ~sprites.Flag.IsClipping;
            }
        }
    }

    // Attempt to resolve clipping by moving the sprite slightly up / down / left / right
    protected canResolveClipping(s: Sprite, tm: tiles.TileMap) {
        if (s.flags & sprites.Flag.GhostThroughWalls) return false;
        if (!s.isStatic()) s.setHitbox();
        const hbox = s._hitbox;
        const sz = 1 << tm.scale;
        const maxMove = this.maxStep;
        const origY = s._y;
        const origX = s._x;
        const l = Fx.toInt(hbox.left);
        const r = Fx.toInt(hbox.right);
        const t = Fx.toInt(hbox.top);
        const b = Fx.toInt(hbox.bottom);

        {   // bump up and test;
            const offset = (b + 1) % sz;
            if (offset <= maxMove) {
                s._y = Fx.sub(
                    s._y,
                    Fx8(offset)
                );
                if (!tm.isOnWall(s)) {
                    return true;
                } else {
                    s._y = origY;
                }
            }
        }
        {   // bump down and test;
            const offset = (Math.floor(t / sz) + 1) * sz - t;
            if (offset <= maxMove) {
                s._y = Fx.add(
                    s._y,
                    Fx8(offset)
                );
                if (!tm.isOnWall(s)) {
                    return true;
                } else {
                    s._y = origY;
                }
            }
        }
        {   // bump left and test;
            const offset = (r + 1) % sz;
            if (offset <= maxMove) {
                s._x = Fx.sub(
                    s._x,
                    Fx8(offset)
                );
                if (!tm.isOnWall(s)) {
                    return true;
                } else {
                    s._x = origX;
                }
            }
        }
        {   // bump right and test;
            const offset = (Math.floor(l / sz) + 1) * sz - l;
            if (offset <= maxMove) {
                s._x = Fx.add(
                    s._x,
                    Fx8(offset)
                );
                if (!tm.isOnWall(s)) {
                    return true;
                } else {
                    s._x = origX;
                }
            }
        }

        // no trivial adjustment worked; it's going to clip for now
        return false;
    }

    protected constrain(v: Fx8) {
        return Fx.max(
            Fx.min(
                this.maxVelocity,
                v
            ),
            this.maxNegativeVelocity
        );
    }
}


/*	RIC - CRC Game Engine Physics

	creo la clase de Physics compatible con la gestion de SCENE.TS pero que trabaja con el motor CRC Game engine
	
	como creamos una extension de class PhysicsEngine (que es la plantilla de SCENE.TS)
	debemos rellenar las funciones:
	
			constructor() { }
			addSprite(sprite: Sprite) { }
			removeSprite(sprite: Sprite) { }
			moveSprite(s: Sprite, dx: Fx8, dy: Fx8) { }
			draw() { }
			move(dt: number) { }
			setMaxSpeed(speed: number) { }
			overlaps(sprite: Sprite): Sprite[] { return []; }
	
*/
class CRCPhysicsEngine extends PhysicsEngine
{
	
	protected sprites: Sprite[];
	
	// numero de overlapHandlers que ya hemos registrado en el nativo (CRC_OvAddKinds)
	protected ovSent: number;
	
	// RIC DEBUG
	protected numactivesprites: number;
	
	// velocidad maxima (px/s) en cada eje, igual que Arcade
	protected maxVelocity: Fx8;
	protected maxNegativeVelocity: Fx8;
	
    constructor()
		{
		// llama al constructor padre
        super();
		
		// empezamos con SPRITE's sin gestionar
        this.sprites = [];
		
		// overlaps nativos: estado limpio por cada scene
		this.ovSent = 0;
		image.CRC_OvReset();		
		
		// RIC debug
		this.numactivesprites=0;
		
		// velocidad maxima por defecto (la misma que Arcade)
		this.setMaxSpeed(500);
		}

    addSprite(sprite: Sprite)
	{
        this.sprites.push(sprite);
		
		/*	en el original gestiona un caso cuando el sprite empieza dentro de una WALL
			
			const tm = game.currentScene().tileMap;
			if (tm && tm.isOnWall(sprite))
				{
				sprite.flags |= sprites.Flag.IsClipping;
				}
		*/
    }

    removeSprite(sprite: Sprite)
	{
		this.sprites.removeElement(sprite);
    }

	// RIC es solo para DEBUG
    draw()
	{
		// aqui se pueden poner codigo visual cuando activamos DEBUG, por ejemplo mostrar los rectangulos de los SPRITEs    
    }

    setMaxSpeed(speed: number)
	{
        this.maxVelocity = Fx8(speed);
        this.maxNegativeVelocity = Fx.neg(this.maxVelocity);
    }

	// limita la velocidad a [-maxVelocity, +maxVelocity]
    protected constrain(v: Fx8): Fx8
	{
        return Fx.max( Fx.min(this.maxVelocity, v), this.maxNegativeVelocity );
    }

	/*	Misma logica que Arcade (createMovingSprite), pero por eje:
		- si hay aceleracion (a) se suma a la velocidad
		- si NO hay aceleracion pero hay friccion (f), frena hacia 0 sin pasarse
		dtMs en milisegundos
	*/
    protected applyAccelFriction(v: Fx8, a: Fx8, f: Fx8, dtMs: number): Fx8
	{
		if (a)
			{
			return Fx.add( v, Fx.idiv( Fx.imul(a, dtMs), 1000 ) );
			}
		else if (f)
			{
			const fr = Fx.idiv( Fx.imul(f, dtMs), 1000 );
			const c = Fx.compare(v, fr);
			
			if (c < 0)		// v < f
				return Fx.min( Fx.zeroFx8, Fx.add(v, fr) );
			else if (c > 0)	// v > f
				return Fx.max( Fx.zeroFx8, Fx.sub(v, fr) );
			else
				return Fx.zeroFx8;
			}
		
		return v;
    }

    overlaps(sprite: Sprite): Sprite[]
	{
        // sin detección de solapes entre sprites
        return [];
    }

    // esto es para colocarlo manualmente en una posicion (sin intervenir las Fisicas
    moveSprite(s: Sprite, dx: Fx8, dy: Fx8)
	{
		s._lastX = s._x;
		s._lastY = s._y;
		
		s._x = Fx.add(s._x, dx);
		s._y = Fx.add(s._y, dy);
		
		// PENDIENTE
		//this.clampToSceneBounds(s);
    }
	
    protected ovSyncKinds(handlers: scene.OverlapHandler[])
	{
		
		if (handlers.length === this.ovSent) return;
		
		image.CRC_OvClearKinds();
		
		for (const h of handlers)
			{
			image.CRC_OvAddKinds(h.kind, h.otherKind);
			}
			
		this.ovSent = handlers.length;
		
    }
	
    protected ExecuteOverlapsFunctions()
	{
	
		const nhits = image.CRC_OvCompute();
		if (!nhits) return;
		
		const handlers = game.currentScene().overlapHandlers;
		
		for (let k = 0; k < nhits; ++k)
			{
			
			// pareja empaquetada: slotA | (slotB << 8), el slot es el indice en this.sprites
			const p = image.CRC_OvHit(k);
			const a = this.sprites[p & 0xFF];
			const b = this.sprites[p >> 8];
			if (!a || !b) continue;
			
			const ka = a.kind();
			const kb = b.kind();
			
			// cuantos handlers aplican a esta pareja (en cualquier orden de kinds)
			let nm = 0;
			for (const h of handlers)
				{
				if ( (h.kind === ka && h.otherKind === kb) || (h.kind === kb && h.otherKind === ka) ) nm++;
				}
			if (!nm) continue;
			
			// la pareja queda ocupada hasta que terminen sus nm handlers
			image.CRC_OvBusy(a.id, b.id, nm);
			
			// ejecutamos cada funcion de overlapp en runInParallel ...
			for (const h of handlers)
				{
				
				if ( !( (h.kind === ka && h.otherKind === kb) || (h.kind === kb && h.otherKind === ka) ) )
					{
					continue;
					}
				
				control.runInParallel(() =>
					{
					
					// igual que Arcade: si entre medias se ha destruido o hecho ghost, no se ejecuta
					if (!((a.flags | b.flags) & SPRITE_NO_SPRITE_OVERLAPS))
						{
						
						if (ka === h.kind)	h.handler(a, b);
						else				h.handler(b, a);
						
						}
					
					image.CRC_OvDone(a.id, b.id);
					
					});
					
				}
				
			}
		
	}
	
    /** Aplica la física a todos los sprites registrados */
    move(dt: number)
	{

		const scene = game.currentScene();
		
		const tileMap = scene.tileMap;
		
		const camera = scene.camera;
			if (!camera.isUpdated()) camera.update();
			
		// RIC DEBUG
		{
		if (this.sprites.length != this.numactivesprites)
			{
			this.numactivesprites=this.sprites.length;
			control.EventContext.onStats( "VM : Fisica de " + this.numactivesprites + " sprites" );
			}
		}
		
		/*	Como funciona OVERLAPS
		
			primero de todo -> solo trabajamos si hay algun handler de onOverlap entre sprites
		
			manda al nativo cada sprite con CRC_OvSetSprite, y al final ExecuteOverlapsFunctions() pide las parejas
			que solapan. La semantica es la de Arcade: handlers en FIBER (runInParallel, pueden hacer pause) y una
			pareja no se vuelve a disparar hasta que terminan TODOS sus handlers.
		*/
		const doOv = scene.overlapHandlers.length > 0;
		if (doOv)
			{
			// pasa al nativo que parejas de kinds tienen handler (solo cuando cambia el numero de handlers)
			this.ovSyncKinds(scene.overlapHandlers);
			}
		let slot = 0;													// indice del sprite en this.sprites
		
		// dt llega en segundos; la fisica va en milisegundos y se limita el paso como en Arcade
		const dtMs = Math.min(MAX_TIME_STEP, dt * 1000);
		const dtSec = dtMs / 1000;
		
		for (const s of this.sprites)
			{
			
			/*	Aqui a cada FRAME vamos a mover el SPRITE... y miraremos el estudio de movimientos ...
			*/
			
			
				/*	PENDIENTE caso saltar el SPRITE porque lo tenemos en STANDBY (OJO la idea es que no se visualiza ni se calcula su movimiento)
				*/
				
				
				/*	PENDIENTE Primero de todo vemos el tema de la secuencia de animacion que nos puede afectar
					para los calculos siguientes, ya que podria cambiar el tamaño de los costumes si empezamos
					una nueva animacion ...
				*/
				
				
				/*	PENDIENTE si esta fuera de la scene ?
						- dejo 2 pixels de margen (sea multiplo de 2), al menos algo tiene que estar dentro de la SCENE
				*/
				
				
				/*	PENDIENTE Ahora miramos si desde Javascript nos han cambiado la posicion, porque debemos comprobar el Estudio de Movimientos
					de Maps Paths o colisiones ...
				*/
				// esto en principio ya no caldra ...
			
			// recordamos la posicion anterior
			s._lastX = s._x;
            s._lastY = s._y;
			
			
			/*	Aplicamos las leyes fisicas de este Sprite y otros calculos que afecten al estudio del movimiento
				-------------------------------------------------------------------------------------------------
			*/
			
			// PENDIENTE -> if (controljs == 1)									// JAVASCRIPT
			if ( (0 as number) == 1)							// JAVASCRIPT
				{
				
				
				}
			else												// si hay SECUENCIA de movimientos o CONTROLLER y propiedades FISICAS
				{
				
				/*	Eje X (el eje Y es igual). Filtramos para ir rapido:
					- con ax o fx -> camino completo (cambia la velocidad)
					- sin ax ni fx -> la velocidad es constante: sin helper, y si vx==0 no hacemos nada
				*/
				if (s._ax || s._fx)
					{
					const ovx = this.constrain(s._vx);
					s._vx = this.constrain( this.applyAccelFriction(s._vx, s._ax, s._fx, dtMs) );
					// como Arcade, se integra con la velocidad media (ovx+vx)/2
					s._x = Fx.add(s._x, Fx8( (Fx.toFloat(ovx) + Fx.toFloat(s._vx)) * 0.5 * dtSec ));
					}
				else if (s._vx)
					{
					// solo recortamos si se pasa del maximo (comparacion barata, sin llamar a constrain)
					if (s._vx > this.maxVelocity) s._vx = this.maxVelocity;
					else if (s._vx < this.maxNegativeVelocity) s._vx = this.maxNegativeVelocity;
					
					s._x = Fx.add(s._x, Fx8(Fx.toFloat(s._vx) * dtSec));
					}
				
				if (s._ay || s._fy)
					{
					const ovy = this.constrain(s._vy);
					s._vy = this.constrain( this.applyAccelFriction(s._vy, s._ay, s._fy, dtMs) );
					s._y = Fx.add(s._y, Fx8( (Fx.toFloat(ovy) + Fx.toFloat(s._vy)) * 0.5 * dtSec ));
					}
				else if (s._vy)
					{
					if (s._vy > this.maxVelocity) s._vy = this.maxVelocity;
					else if (s._vy < this.maxNegativeVelocity) s._vy = this.maxNegativeVelocity;
					
					s._y = Fx.add(s._y, Fx8(Fx.toFloat(s._vy) * dtSec));
					}
				
				// PENDIENTE hacer si esta Stayinscreen o Stayinscene
				//this.clampToSceneBounds(s);
				
				}
			
			// aplicamos el GMA de CRC Game Engine , pero si es Ghost, no choca con nada: nos saltamos el estudio
			if ( !(s.flags &  SPRITE_NO_GMA) )
				{
				
				// Estudio de movimientos en PXT64
				
					// preparamos la mascara, para saber que callbacks tenemos para activarlos si suceden en el GMA
					const listenMask = ( scene.GMAkindEventHandlers[ s.kind() ] ? scene.GMAkindEventHandlers[ s.kind() ].mask : 0 ) | ( s._GMAEventMask || 0 );
					
					image.GMA_VMprepareParameters( Fx.toFloat(s._lastX) , Fx.toFloat(s._lastY) ,
												   Fx.toFloat(s._vy) , listenMask , -1 ,
												   s.p.mpp , s.p.mcc , s.controljs );
				
					let res=image.GMA_EstudioMovimiento_Obstaculos(Fx.toFloat(s._x),Fx.toFloat(s._y),
																   Fx.toInt(s._width),Fx.toInt(s._height),
																   camera.drawOffsetX,camera.drawOffsetY,
																   tileMap.areaWidth(),tileMap.areaHeight());
				
				// si se han actualizado ?
				if (res.length == 4)
					{
					// RIC DEBUG			
					//control.EventContext.onStats( "VM : nuevas _x " + res[0] + " _y " + res[1] + " flags " + res[2]);
					
					// o los nuevos valores o los que ya habia
					s._x = Fx8(res[0]);
					s._y = Fx8(res[1]);
					
					
					// ahora miramos los callbacks ...
					const eventFlags = res[2];
					if (eventFlags)						// hay eventos callback por ejecutar, o del SPRITE o del SPRITE KIND, tiene prioridad el SPRITE para un mismo evento
						{
						
						// Bits de los eventos que el propio sprite va a atender por su cuenta
						const spriteMask = s._GMAEventMask || 0;
						
						// RIC DEBUG			
						//control.EventContext.onStats( "VM : spriteMask " + spriteMask);
						
						// Primero ejecutamos los callbacks del SPRITE
						if (eventFlags & spriteMask)			// solo si los que se han programado pertenecen al SPRITE
							{
						
							// Ponemos en runInParallel todas las funciones de callback que se han activado del SPRITE
							for (const h of s._GMAEventHandlers)
								{
								
								// RIC DEBUG			
								//control.EventContext.onStats( "VM : eventFlags " + eventFlags + " h.eventFlag " + h.eventFlag );
								
								if (eventFlags & h.eventFlag)
									{
									// RIC DEBUG			
									//control.EventContext.onStats( "VM : creamos runInParallel() para callback GMA del SPRITE");
									
									control.runInParallel(() => h.handler(s));
									}
								
								}
								
							}
						
						// Segundo los eventos por SPRITE Kind solo miraremos los que el SPRITE no tuviera cubiertos
						const kindFlags = eventFlags & ~spriteMask;
						
						if (kindFlags)
							{
							
							const kindEntry = scene.GMAkindEventHandlers[s.kind()];      		// undefined si NO hay handler de este kind				
							
							if (kindEntry)
								{
							
								// Ponemos en runInParallel todas las funciones de callback que se han activado del Kind SPRITE
								for (const h of kindEntry.handlers)
									{
								
									if (kindFlags & h.eventFlag)
										{
										// RIC DEBUG			
										//control.EventContext.onStats( "VM : creamos runInParallel() para callback GMA del SPRITE KIND");
										
										control.runInParallel(() => h.handler(s));
										}
									
									}
								
								}
							
							}
						
						}
					
					}
				
				}
			
			
			/*	Calculamos los OVERLAPS
				solo participan los sprites que tienen algun overlap por kind y no son GhostThroughSprites / Destroyed / RelativeToCamera
			*/
			if ( doOv && s._kindsOverlappedWith.length && !(s.flags & SPRITE_NO_SPRITE_OVERLAPS) )
				{
				image.CRC_OvSetSprite(slot, s.id, s.kind(), s._x as any as number, s._y as any as number, Fx.toInt(s._width), Fx.toInt(s._height), s.image);
				}
			slot++;
			
			/*	Calculamos los invalidates rectangles ... siempre que NO se mueva el fondo que entonces siempre es todo el screen ...
				para un sprite se puede generar 1 o 2 ... si se intersectan se genera 1 grande que contiene toda la superficie...
				y si no intersectan se generan 2
			*/
			// puede ser que la posicion anterior o la nueva esten fuera de pantalla, pero la otra NO, asi que hay que tenerlo en cuenta
			if ( !camera.bgmove )
				{
				
				// PENDIENTE falta saber si es animado y si ha cambiado de tamaño
				
				const w = Fx.toInt(s._width), h = Fx.toInt(s._height);
				const ox = camera.drawOffsetX, oy = camera.drawOffsetY;
				image.WRAPPER_SPRITE_CalculateInvalidateAnimated(Math.floor(Fx.toFloat(s._x)) - ox,
															     Math.floor(Fx.toFloat(s._y)) - oy,
																 w, h,
																 Math.floor(Fx.toFloat(s._lastX)) - ox,
																 Math.floor(Fx.toFloat(s._lastY)) - oy,
																 w, h);
				
				}
			
			}
		
		
		// avisamos al runtime nativo que ya hemos añadido todos los invalidates rectangles
		image.CommitInvalidateRectangles();
		
		// pide al nativo las parejas que solapan y lanza los handlers (runInParallel)
		if (doOv)
			{
			this.ExecuteOverlapsFunctions();
			}
		
    }

    /**
     * Mantiene al sprite dentro del área máxima de la escena:
     * el tilemap si hay uno activo, o si no, la pantalla (con la cámara).
     * Se queda pegado al borde sin traspasarlo; no rebota ni dispara eventos.
     */
    protected clampToSceneBounds(s: Sprite)
	{
	
		// si el SPRITE es dinamico, cambian sus frames, que podrian cambiar de tamaño ?
		if ( !s.isStatic() ) s.setHitbox();
		
		const hbox = s._hitbox;

        const scene = game.currentScene();
        const tileMap = scene.tileMap;

        if (tileMap && tileMap.enabled)
			{
            
			const areaWidth = tileMap.areaWidth();
            const areaHeight = tileMap.areaHeight();

            if (hbox.left < Fx.zeroFx8)
				{
                s.left -= Fx.toFloat(hbox.left);
				}
			else if (Fx.compare(hbox.right, Fx8(areaWidth) ) > 0)
				{
                s.right -= Fx.toFloat(Fx.sub(hbox.right, Fx8(areaWidth) ));
				}

            if (hbox.top < Fx.zeroFx8)
				{
                s.top -= Fx.toFloat(hbox.top);
				}
			else if (Fx.compare(hbox.bottom, Fx8(areaHeight) ) > 0)
				{
                s.bottom -= Fx.toFloat(Fx.sub(hbox.bottom, Fx8(areaHeight) ));
				}
				
			}
		else
			{
            
			const camera = scene.camera;
			if (!camera.isUpdated()) camera.update();

            let offset = Fx.toFloat(hbox.left) - camera.offsetX;
            if (offset < 0)
				{
                s.left -= offset;
				}
			else if ((offset = Fx.toFloat(hbox.right) - camera.offsetX - screen.width) > 0)
				{
                s.right -= offset;
				}

            offset = Fx.toFloat(hbox.top) - camera.offsetY;
            if (offset < 0)
				{
                s.top -= offset;
				}
			else if ((offset = Fx.toFloat(hbox.bottom) - camera.offsetY - screen.height) > 0)
				{
                s.bottom -= offset;
				}
				
			}
    
	}
	
}

