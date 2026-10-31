
// RIC
namespace sprites
{
	
	
    /**
     * Gets the "kind" of sprite
     */
    //% shim=KIND_GET
    //% blockId=spritekind block="$kind"
    //% kindNamespace=SpriteKind kindMemberName=kind kindPromptHint="e.g. Coin, Fireball, Asteroid..."
    //% help=sprites/sprite-kind
    export function _spriteKind(kind: number): number {
        return kind;
    }

    /**
     * Gets the sprite type
     */
    //% blockHidden=1 shim=ENUM_GET deprecated=true
    //% blockId=spritetype block="$kind" enumInitialMembers="Player,Projectile,Food,Enemy"
    //% enumName=SpriteKindLegacy enumMemberName=kind enumPromptHint="e.g. Coin, Fireball, Asteroid..."
    export function _spriteType(kind: number): number {
        return kind;
    }
	
	
}

namespace SpriteKind
{

	/*	Como se numeran los kind :
	
		Los kinds son 1000, 1001... y Projectile vale 1.
		
		con Player=1000, Projectile=1, Food=1001 y Enemy=1002.
	*/
	
	let nextKind: number;

    export function create()
		{
        if (nextKind === undefined) nextKind = 1000;
        return nextKind++;
		}

    //% isKind
    export const Player = create();

    //% isKind
    export const Projectile = 1;

    //% isKind
    export const Food = create();

    //% isKind
    export const Enemy = create();
	
	
}

