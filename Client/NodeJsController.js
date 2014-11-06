// IN progress
// client side of the controller
// register elements locally, register them on the server
// client controller (here) does the display on request from the server
// client event (mouse) to be send to the server- hit: local? server? TBD

(function(){
	var creanvas = CreJs.CreanvasNodeClient;
	
	creanvas.NodeJsController = function(controllerData) {
		var controller = this;
		controller.refreshTime = controllerData["controller.refreshTime"] || creanvas.NodeJsController.DEFAULT_REFRESH_TIME;
		this.clientToServerBuffering = 50;
		
		var canvas = controllerData["canvas"];
		this.logger = controllerData['log'];		
		this.lengthScale =  controllerData["lengthScale"] ||  canvas.height / controllerData["realHeight"] || canvas.width / controllerData["realWidth"]|| 1;

		
		//		timeScale = controllerData["timeScale"] || 1;
		this.nodeSocket = controllerData["nodeSocket"];				
		this.elementTypes = [];
		
		var emitBuffer = [];

		this.emitToServer = function (action, actionData, overrideActionKey)
		{
			if (overrideActionKey && emitBuffer.length>0)
			{
				var toOverride = emitBuffer.filter(function(e){ return e.overrideActionKey == overrideActionKey;});
				
				if (toOverride.length>0)
				{
					toOverride.forEach(function(e){ e.actionData = actionData;});
					return;
				}
			}

			emitBuffer.push({action:action, actionData:actionData, overrideActionKey:overrideActionKey});
		};
		
		setInterval(
			function()
			{
				if (emitBuffer.length == 0)
					return;
				
				emitBuffer.forEach(function(e) {
					
					controller.nodeSocket.emit(
						e.action, 
						JSON.stringify(e.actionData));	
					
				emitBuffer = [];
				});
			},
			controller.clientToServerBuffering);		
		
		if (DEBUG) this.logMessage('Starting controller');
		
		controller.elements = [];

		controller.context = canvas.getContext("2d");		

		controller.context.setTransform(controller.lengthScale,0,0,controller.lengthScale,0,0);

		controller.needRedraw = true;
		controller.isDrawing = false;
		
		registerCanvasEvents.call(controller);
		startController.call(controller);

		this.nodeSocket.on('textMessage', function(msg){		
			var data = JSON.parse(msg);
			if (controller.onTextMessage)
			{
				controller.onTextMessage(data);
			}			
		}); 	

		this.nodeSocket.on('updateClientElements', function(msg){
			var data = JSON.parse(msg);
			
			data.updates.forEach(function(updated){
				var els = controller.elements.filter(function(e){ return e.id == updated.id;});
				
				if (els.length>0) { 
					// updates			
					var el = els[0];
					
//					el.updated = updated;

					el.elementX = updated["elementX"]===undefined?el.elementX:updated["elementX"];
					el.elementY = updated["elementY"]===undefined?el.elementY:updated["elementY"];
					el.elementZ = updated["elementZ"]===undefined?el.elementZ:updated["elementZ"];
					el.elementScaleX = updated["elementScaleX"]===undefined?el.elementScaleX:updated["elementScaleX"];
					el.elementScaleY = updated["elementScaleY"]===undefined?el.elementScaleY:updated["elementScaleY"];				
					el.elementAngle= updated["elementAngle"]===undefined?el.elementAngle:updated["elementAngle"];

					if (updated['typeName'] && el.elementType.typeName != updated['typeName'])
					{
						el.elementType = controller.elementTypes.filter(function(e){ return e.typeName == updated['typeName'];})[0];
					}
				}
				else {
					//inserts
					if (DEBUG) controller.logMessage('Adding element ' + updated['typeName'] + ' in (' + updated["elementX"] + ',' + updated["elementY"] + ',' + updated["elementZ"] +')');
						
					var element = controller.add(
							["name",updated["name"]],
							["image", {"elementType" :controller.elementTypes.filter(function(e){ return e.typeName == updated['typeName'];})[0]}],
							["position", {"x": updated["elementX"], "y": updated["elementY"], "z": updated["elementZ"], "angle":updated["elementAngle"]}]);
					element.id = updated.id;
				}
			});

			data.deletes.forEach(function(deleted){
				controller.removeElementById(deleted.id);
			});

			needRedraw = true;
		  });	  
		
		controller.addBackground(null);
	};
	
	var registerCanvasEvents = function()
	{
		this.registerCanvasPointerEvent('click', 'click');
		this.registerCanvasPointerEvent('mousedown','pointerDown');
		this.registerCanvasPointerEvent('touchstart','pointerDown');
		this.registerCanvasPointerEvent('mousemove','pointerMove');
		this.registerCanvasPointerEvent('touchmove','pointerMove');
		this.registerCanvasPointerEvent('mouseup','pointerUp');
		this.registerCanvasPointerEvent('touchend','pointerUp');
	};		
	
	
	var startController = function()
	{
		var controller = this;

		setInterval(
			function()
			{
				if (controller.needRedraw && !controller.isDrawing)
				{						
					controller.isDrawing = true;															
										
					controller
						.elements
						.sort(function(a,b){return ((a.elementZ || 0) - (b.elementZ || 0));})
						.forEach(function(element)
						{
							element.drawMyself();							
						});					
														

					if (controller.displayMessage)
					{
						controller.displayMessage(controller.context);
					}					

					controller.isDrawing = false;
				}
				else
				{
					if (DEBUG) controller.logMessage ("No redraw");
				}
			},
			controller.refreshTime);	
	};

	creanvas.NodeJsController.prototype.addBackground = function(draw)
	{
		var controller = this;
		controller.removeElementById(0);
		
		if (DEBUG) controller.logMessage('Adding background');
		
		draw = draw || function(context){
				context.fillStyle = creanvas.NodeJsController.DEFAULT_BACKGROUND_COLOUR;
				context.fillRect(0,0,controller.context.canvas.width/controller.lengthScale,controller.context.canvas.height/controller.lengthScale);};
		
		var background = controller.add(
				['name','background'],
				['image', {"elementType": {draw: draw}}],
				["position", {"x": 0, "y": 0, "z": -Infinity}]);

		background.id = 0;
	};

	creanvas.NodeJsController.prototype.logMessage = function(logData){
		if (this.logger)
			this.logger(logData);
		};
				
	creanvas.NodeJsController.prototype.removeElementById = function(id) {
		this.elements  = this.elements.filter(function(e){ return e.id != id; });
	};

	creanvas.NodeJsController.prototype.triggerElementEvent = function(eventId, event)
	{
		var controller = this;	
		
		controller.emitToServer(
			'pointerEvent', 
			{
				"eventId":eventId, 
				"x":event.x,
				"y":event.y,
				"touchIdentifier":event.touchIdentifier
			},
			eventId + ':' + event.touchIdentifier );
	};
	
	creanvas.NodeJsController.prototype.registerCanvasPointerEvent = function (controlEventId, customEventId)
	{
		var controller = this;
		
		controller.context.canvas.addEventListener(controlEventId,
			function(event)
			{
				setTimeout(function()
				{	
					var triggerEvent = function(clientXY, touchIdentifier)
					{							
						if (DEBUG)
						{
							controller.logMessage("Canvas event " + controlEventId + " with touchIdentifier " + touchIdentifier);
						}
						var eventData = controller.getRealXYFromClientXY(clientXY);
						eventData.touchIdentifier = touchIdentifier;
						controller.triggerElementEvent.call(controller, customEventId, eventData);						
					};
					
					if (event.changedTouches)
					{
						for(var i=0;i<event.changedTouches.length;i++)
						{
							 triggerEvent(event.changedTouches[i], event.changedTouches[i].identifier);
						}
					}
					else
					{
						triggerEvent(event, -1);
					}
				});
			});
	};

	creanvas.NodeJsController.prototype.getRealXYFromClientXY  = function(clientXY)
	{
		var boundings = this.context.canvas.getBoundingClientRect();
		
		var xy = { 
			x: (clientXY.clientX-boundings.left) * this.context.canvas.width/boundings.width / this.lengthScale,
			y: (clientXY.clientY-boundings.top) * this.context.canvas.height/boundings.height /  this.lengthScale};
		
		console.log("ClientXY: (" + clientXY.clientX + "," + clientXY.clientY + ") - RealXY: (" + xy.x + "," + xy.y + ")" );
		if (DEBUG) this.logMessage("ClientXY: (" + clientXY.clientX + "," + clientXY.clientY + ") - RealXY: (" + xy.x + "," + xy.y + ")" );
		return xy;
	};

	creanvas.NodeJsController.prototype.getCorners = function(boxData)
	{
		var controller = this;
		var corners = [];

		// support height/width; left/width|left/right+top/height|top/bottom
		var width = boxData["width"];
		var height = boxData["height"];

		var top = boxData["top"] == 0 ? 0 : boxData["top"] || (-height / 2);
		var left = boxData["left"] == 0 ? 0 : boxData["left"] || (-width / 2);
		var bottom = boxData["bottom"] == 0 ? 0 : boxData["bottom"] || (top + height);
		var right = boxData["right"] == 0 ? 0 : boxData["right"]|| (left + width);
		
		corners.push({x:left,y:top});
		corners.push({x:right,y:top});
		corners.push({x:right,y:bottom});
		corners.push({x:left,y:bottom});
		
		return corners;
	};
	
	creanvas.NodeJsController.prototype.getEdges = function(draw, boxData)
	{
		// TODO, send raw imagedata, compute edges on server,,,
		
		var controller = this;
		var edges = [];

		// support height/width; left/width|left/right+top/height|top/bottom
		var width = boxData["width"];
		var height = boxData["height"];

		var top = boxData["top"] == 0 ? 0 : boxData["top"] || (-height / 2);
		var left = boxData["left"] == 0 ? 0 : boxData["left"] || (-width / 2);
		var bottom = boxData["bottom"] == 0 ? 0 : boxData["bottom"] || (top + height);
		var right = boxData["right"] == 0 ? 0 : boxData["right"]|| (left + width);
		width = width || (right - left);
		height = height || (bottom - top);
		
		if (width == 0 || height == 0)
			return null;
		
		var edgeResolution = boxData['edgeResolution'] || 10;
		var edgeResolutionX  = Math.min(edgeResolution, width/10); // at leat 10 points in tempCanvas	
		var edgeResolutionY = Math.min(edgeResolution, height/10); // at leat 10 points in tempCanvas
		
		var tempCanvas = controller.context.canvas.ownerDocument.createElement('canvas');
		var temporaryRenderingContext = tempCanvas.getContext("2d");

		//Debug // controller.context.canvas.ownerDocument.body.appendChild(tempCanvas);
		
		tempCanvas.width = Math.ceil(width / edgeResolutionX);
		tempCanvas.height = Math.ceil(height / edgeResolutionY);

		temporaryRenderingContext.beginPath();
		temporaryRenderingContext.translate(-left/edgeResolutionX, -top/edgeResolutionY);
		temporaryRenderingContext.scale(1/edgeResolutionX, 1/edgeResolutionY);
		draw(temporaryRenderingContext);
		
		var edgeImage = temporaryRenderingContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
		
		var startEdge = null;
		var transparencyLimit = 1;
		
		var imageX= null;
		var imageY = null;
		var currentEdge = null;
		
		var checkPoint = function(x,y,edge, isCorner)
		{
			if (edgeImage.data[y*tempCanvas.width*4 + x*4 + 3] < transparencyLimit)
				return false;
							
			var match = false;
			
			if (edge == "top")
			{
				match = y==0 || edgeImage.data[(y-1)*tempCanvas.width*4 + x*4 + 3] < transparencyLimit;
				dx = 0.5; dy=0;
			}
			if (edge == "left")
			{
				match = x==0 || edgeImage.data[y*tempCanvas.width*4 + (x-1)*4 + 3] < transparencyLimit;
				dx = 0; dy=0.5;
			}
			if (edge == "right")
			{
				match = x==tempCanvas.width-1 || edgeImage.data[y*tempCanvas.width*4 + (x+1)*4 + 3] < transparencyLimit;
				dx = 1; dy=0.5;
			}
			if (edge == "bottom")
			{
				match = y==tempCanvas.height-1 || edgeImage.data[(y+1)*tempCanvas.width*4 + x*4 + 3] < transparencyLimit;
				dx = 0.5; dy=1;
			};

			if (!match)
				return;
			
			edges.push({
				x: (x + dx)*edgeResolutionX + left,
				y: (y + dy)*edgeResolutionY + top,
				isCorner: isCorner}); 

			imageX = x;
			imageY = y;
			currentEdge = edge;

			return true;
		};
			
		for (var forX=0;forX<tempCanvas.width; forX++)
		{
			for (var forY=0;forY<tempCanvas.height; forY++)
			{
				if (checkPoint(forX, forY, "top", true))
				{
					startEdge = {x:imageX, y:imageY};
					forX = tempCanvas.width; forY=tempCanvas.height;
				}
			}
		}

		if (startEdge)
		{						
			do 
			{
				if (currentEdge == "top")
				{
					if (imageX<tempCanvas.width-1 && imageY>0 && checkPoint(imageX+1, imageY-1, "left", true))
					{
						continue;
					}
					
					if (imageX<tempCanvas.width-1 && checkPoint(imageX+1, imageY, "top", false))
					{
						continue;
					}
					
					if (checkPoint(imageX, imageY, "right", true))
					{
						continue;
					}
				}
				else if (currentEdge == "right")
				{
					if (imageX<tempCanvas.width-1 && imageY<tempCanvas.height-1 && checkPoint(imageX+1, imageY+1, "top", true))
					{
						continue;
					}
					
					if (imageY<tempCanvas.height-1 && checkPoint(imageX, imageY+1, "right",false))
					{
						continue;
					}
					
					if (checkPoint(imageX, imageY, "bottom",true))
					{
						continue;
					}
				}
				else if (currentEdge == "bottom")
				{
					if (imageX>0 && imageY<tempCanvas.height-1 && checkPoint(imageX-1, imageY+1, "right",true))
					{
						continue;
					}
					
					if (imageX>0 && checkPoint(imageX-1, imageY, "bottom",false))
					{
						continue;
					}
					
					if (checkPoint(imageX, imageY, "left", true))
					{
						continue;
					}
				}
				else if (currentEdge == "left")
				{
					if (imageX>0 && imageY>0 && checkPoint(imageX-1, imageY-1, "bottom", true))
					{
						continue;
					}
					
					if (imageY>0 && checkPoint(imageX, imageY-1, "left", false))
					{
						continue;
					}
					
					if (checkPoint(imageX, imageY, "top", true))
					{
						continue;
					}
				}
			} while (imageX != startEdge.x || imageY != startEdge.y);
		}		
		
		return edges;
	};

	// x,y in Real values
	creanvas.NodeJsController.prototype.isPointInPath = function(x,y)
	{
		// convert to Canvas XY
		return this.context.isPointInPath(x*this.lengthScale,y*this.lengthScale);
	};

	creanvas.NodeJsController.prototype.addElementType = function(typeName, draw, boxData)
	{
		// compute edges
		var edges = boxData == null ? null : this.getEdges(draw, boxData);
		
		this.elementTypes.push({typeName:typeName, draw:draw, edges:edges});
		
		// send to server.
		// should compute on server, really, but how without canvas ? or use nodes-canvas type stuff?
		this.emitToServer(
				'registerEdges', 
				{
					"typeName":typeName, 
					"edges":edges
				});
	};

	creanvas.NodeJsController.prototype.add  = function ()
	{
		var controller = this;
		
		if (DEBUG) controller.logMessage("Controller.addElement: Adding element - args:" + arguments.length );

		var args = [].slice.call(arguments);

		var identificationData = args.filter(function(arg){ return arg && arg[0]=="name";})[0] || ["name","Unknown"];
		var imageData = args.filter(function(arg){ return arg && arg[0]=="image";})[0]; // mandatory
		var positionData = args.filter(function(arg){ return arg && arg[0]=="position";})[0]; // mandatory
		
		var element = new CreJs.CreanvasNodeClient.NodeJsElement(controller, identificationData, imageData, positionData);
		
		controller.elements.push(element);
		
		return element;
	};

	creanvas.NodeJsController.DEFAULT_REFRESH_TIME = 40; // 25 times per second
	creanvas.NodeJsController.DEFAULT_BACKGROUND_COLOUR = "#FFF";

	// Export interface 
	creanvas["NodeJsController"] = creanvas.NodeJsController;
	creanvas.NodeJsController.prototype["addElementType"] = creanvas.NodeJsController.prototype.addElementType;
	creanvas.NodeJsController.prototype["startApplication"] = creanvas.NodeJsController.prototype.startApplication;
}());
