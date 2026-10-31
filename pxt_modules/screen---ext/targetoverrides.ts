/**
 * Tagged image literal converter
 */

//% shim=@f4 helper=image::ofBuffer blockIdentity="images._spriteImage"
//% groups=["0.","1#","2T","3t","4N","5n","6G","7g","8","9","aAR","bBP","cCp","dDO","eEY","fFW"]
function img(lits: any, ...args: any[]): Image { return null }

//% shim=pxt::updateScreen
function updateScreen(img: Image): void { }
//% shim=pxt::updateStats
function updateStats(msg: string): void { }


// set palette before creating screen, so the JS version has the right BPP
	// RIC DEBUG
	updateStats("VM : creamos la paleta por defecto 4bpp");
image.setPalette(hex`__palette`)

	// RIC DEBUG
	updateStats("VM : creamos el frame buffer de 160x120 pixels");
let screen = image.create(_screen_internal.getScreenWidth(160), _screen_internal.getScreenHeight(120)) as ScreenImage


// RIC
namespace image
{


	//% shim=pxt::setPalette
    export function setPalette(buf: Buffer) { }

    // RIC
    //% shim=pxt::setCRCmaps
    export function setCRCmaps(bufmultipaleta: Buffer , bufmappaths: Buffer , bufforeground: Buffer , bufspecialzones: Buffer) { }

    // RIC - offset de camara (mismo que camera.drawOffsetX/Y), para que el fondo multipaleta
    //% shim=pxt::setCRCbackgroundOffset
    export function setCRCbackgroundOffset(offsetX: number, offsetY: number) { }
	
	// RIC
    //% shim=pxt::GMA_EstudioMovimiento_Obstaculos
	export function GMA_EstudioMovimiento_Obstaculos(_x: number, _y: number, spw: number, sph: number,
													 scx: number, scy: number, scw: number, sch: number): number[] { return [0,0]; }
	
	// RIC
    //% shim=pxt::GMA_VMprepareParameters
	export function GMA_VMprepareParameters(_lastX: number, _lastY: number, _vy: number, listenMask: number, inc: number, mpp: number, mcc: number, controljs: number) { }

	// RIC
    //% shim=pxt::GMA_SpriteInSpecialZone
	export function GMA_SpriteInSpecialZone(_x: number, _y: number, spw: number, sph: number, scw: number): number { return 0; }

	// RIC
    //% shim=pxt::GMA_SpriteSpecialZoneNumber
	export function GMA_SpriteSpecialZoneNumber(_x: number, _y: number, spw: number, sph: number): number { return 0; }

	// RIC
    //% shim=pxt::WRAPPER_AddInvRect
	export function WRAPPER_AddInvRect(x: number, y: number, w: number, h: number) { }
	
	// RIC
    //% shim=pxt::WRAPPER_SPRITE_CalculateInvalidateStatic
	export function WRAPPER_SPRITE_CalculateInvalidateStatic(_x: number, _y: number, spw: number, sph: number,
															 _lastX: number, _lastY: number,spwlast: number, sphlast: number) { }
															 
	// RIC
    //% shim=pxt::WRAPPER_SPRITE_CalculateInvalidateAnimated
	export function WRAPPER_SPRITE_CalculateInvalidateAnimated(_x: number, _y: number, spw: number, sph: number,
															   _lastX: number, _lastY: number,spwlast: number, sphlast: number) { }
	
	//% shim=pxt::CommitInvalidateRectangles
    export function CommitInvalidateRectangles() { }
	
	//% shim=pxt::CRC_OvReset
	export function CRC_OvReset() { }
	
	//% shim=pxt::CRC_OvClearKinds
	export function CRC_OvClearKinds() { }
	
	//% shim=pxt::CRC_OvAddKinds
	export function CRC_OvAddKinds(kind: number, otherKind: number) { }
	
	//% shim=pxt::CRC_OvSetMinPixels
	export function CRC_OvSetMinPixels(n: number) { }
	
	// slot = indice del sprite en this.sprites ; x8 e y8 son los Fx8 en crudo (_x, _y)
	//% shim=pxt::CRC_OvSetSprite
	export function CRC_OvSetSprite(slot: number, id: number, kind: number, x8: number, y8: number,w: number, h: number, img: Image) { }
	
	//% shim=pxt::CRC_OvCompute
	export function CRC_OvCompute(): number { return 0; }
	
	//% shim=pxt::CRC_OvHit
	export function CRC_OvHit(k: number): number { return 0; }
	
	//% shim=pxt::CRC_OvBusy
	export function CRC_OvBusy(idA: number, idB: number, count: number) { }
	
	//% shim=pxt::CRC_OvDone
	export function CRC_OvDone(idA: number, idB: number) { }
	
}

namespace _screen_internal
{

    //% shim=TD_ID
    export function getScreenWidth(defl: number) {
        return control.getConfigValue(DAL.CFG_ARCADE_SCREEN_WIDTH, defl)
    }

    //% shim=TD_ID
    export function getScreenHeight(defl: number) {
        return control.getConfigValue(DAL.CFG_ARCADE_SCREEN_HEIGHT, defl)
    }

    control.__screen.setupUpdate(() => updateScreen(screen))
	
	// RIC esta es la funcion que permite el console.log desde loa archivos .TS
    control.EventContext.onStats = function (msg: string)
	{
		// esta es llamada SHIM (nativa C++)
		updateStats(msg);
    }
	
}
