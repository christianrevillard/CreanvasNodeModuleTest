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
		
		this.drawMyself = function() {

			var element = this;

			element.controller.context.translate(element.elementX,
					element.elementY);
			element.controller.context.rotate(element.elementAngle || 0);
			element.controller.context.scale(element.elementScaleX || 1,
					element.elementScaleY || 1);

			controller.context.beginPath();
			element.elementType.draw(controller.context);
			
			/* Debug edges*/
			/*
			if (element.elementType.edges)
			{
				var edge = element.elementType.edges[0];
				controller.context.beginPath();
				controller.context.moveTo(edge.x, edge.y);
				element.elementType.edges.forEach(
						function(edge)
						{
							controller.context.lineTo(edge.x, edge.y);
						}					
				);
				controller.context.lineTo(edge.x, edge.y);
				controller.context.strokeStyle = "#F00";
				controller.context.stroke();
			}
			*/
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