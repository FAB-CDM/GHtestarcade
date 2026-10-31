
namespace scene
{

	export class Renderable extends sprites.BaseSprite
	{
		
        public constructor(protected handler: (target: Image, camera: Camera) => void,protected shouldBeVisible: () => boolean,z: number,)
		{
            super(z);
        }

        __visible(): boolean
		{
			return this.shouldBeVisible();
        }

        __drawCore(camera: scene.Camera)
		{
            this.handler(screen, camera);
        }

        destroy()
		{
            const s = game.currentScene();
            s.allSprites.removeElement(this);
        }
		
    }

	// RIC (el TileMap es un Renderable, es decir en el fondo un sprite que tiene su propia funcion de draw()
	// y se guarda en Z order con la lista de sprites activos en el Game
    export function createRenderable(z: number,
									 handler: (target: Image, camera: Camera) => void,
									 shouldBeVisible?: () => boolean): Renderable
	{
	
		const renderable = new Renderable(handler,shouldBeVisible || (() => true),z,);

        return renderable;
    }
	
}