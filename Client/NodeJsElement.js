// Basic Element
// Define position, drawing info

(function() {
	var creanvas = CreJs.CreanvasNodeClient;

	// decorators as additional arguments.
	creanvas.NodeJsElement = function(
			controller, 
			identificationData,
			imageData, 
			positionData) {

		var element = this;

		this.controller = controller;

		setIdentification(element, identificationData[1]);
		setImage(element, imageData[1]);
		setPosition(element, positionData[1]);

/*		setInterval(function(){			
			if (element.updated)
			{
				// testing... Should be more PID stuff
				element.elementX += 0.1* ((element.updated["elementX"]===undefined?element.elementX:element.updated["elementX"]) - element.elementX);
				element.elementY += 0.1* ((element.updated["elementY"]===undefined?element.elementY:element.updated["elementY"]) - element.elementY);
				element.elementZ += 0.1* ((element.updated["elementZ"]===undefined?element.elementZ:element.updated["elementZ"]) - element.elementZ);
				element.elementScaleX += 0.1* ((element.updated["elementScaleX"]===undefined?element.elementScaleX:element.updated["elementScaleX"]) - element.elementScaleX);
				element.elementScaleY += 0.1* ((element.updated["elementScaleY"]===undefined?element.elementScaleY:element.updated["elementScaleY"]) - element.elementScaleY);				
				element.elementAngle += 0.1* ((element.updated["elementAngle"]===undefined?element.elementAngle:element.updated["elementAngle"]) - element.elementAngle);
			}
		},40);*/
		
		this.drawMyself = function() {

			var element = this;

			element.controller.context.translate(element.elementX,
					element.elementY);
			element.controller.context.rotate(element.elementAngle || 0);
			element.controller.context.scale(element.elementScaleX || 1,
					element.elementScaleY || 1);

			controller.context.beginPath();
			element.elementType.draw(controller.context);

			element.controller.context.scale(1/(element.elementScaleX || 1), 1/(element.elementScaleY || 1));

			element.controller.context.rotate(- (element.elementAngle || 0));

			element.controller.context.translate(-element.elementX, - element.elementY);			

		};
	};

	var setIdentification = function(element, identificationData) {
		element.elementName = identificationData;
	};

	var setImage = function(element, imageData) {
		// scaling decorator ?? => should be
		element.elementScaleX = imageData["scaleX"] || 1;
		element.elementScaleY = imageData["scaleY"] || 1;
		element.elementType = imageData["elementType"];
	};

	var setPosition = function(element, position) {
		// position prop
		element.elementX = position["x"] || 0;
		element.elementY = position["y"] || 0;
		element.elementZ = position["z"] || 0;
		element.elementAngle = position["angle"] || 0;
	};	
}());