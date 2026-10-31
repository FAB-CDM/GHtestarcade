namespace control.__screen
{

	let __update: () => void
	
    let __updated = false;

    export function update()
	{
        if (__update) __update()
		__updated = true
    }

    export function setupUpdate(update: () => void)
	{
		__updated = true;
        __update = update;
        update()
    }

    // low frequency fallback screen refresh
		// RIC DEBUG (tengo que decirle al compilador TS que es un SHIM
		    //% shim=pxt::updateStats
			function updateStats(msg: string): void { }
		updateStats("VM : low frequency fallback screen refresh");
    control.runInParallel(() =>
	{
	
		// parece que es como un backup de renderizar la pantalla en el TFT a menor velocidad cada 200 mseg.
		while (true)
			{
            
			__updated = false
			
            pause(200)
			
            if (!__updated)
				{
                __screen.update();
                __updated = true
				}
			
			}
    })
}
