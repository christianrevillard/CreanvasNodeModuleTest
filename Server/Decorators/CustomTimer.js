var applyTo = function(element, customTimerData)
{	
	console.log('applying customTimer');
	
	element.controller.setInterval(
		function()
		{
			customTimerData["action"].call(element);					
		},
		customTimerData["time"]);
}

exports.applyTo = applyTo;