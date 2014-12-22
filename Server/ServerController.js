var serverElement = require("./ServerElement");

var Controller = function(applicationSocket, applicationInstance, autoStart) {

	var controller = this;

	controller.intervals = [];
	
	var timeScale = 1;
	var time = 0; // seconds
	this.paused = !autoStart;
	
	controller.setInterval(function() {
		if (controller.paused)
			console.log("Is paused!");
		if (controller.paused)
			return;
		time += 10 * timeScale / 1000;
	}, 10);
	this.getTime = function() {
		return time;
	};

	controller.applicationSocket = applicationSocket;
	controller.applicationInstance = applicationInstance;

	controller.elements = [];
	controller.elementTypes = [];

	console.log('Setting up for Creanvas');

	// to do, move all in CollisionSolver stuff, but we go quick for the moment.
	controller.collisionMatrix = [];
	
	
	// new frame process, split, clarify??
	controller.setInterval(function() {
		
		//move movable - will check collision and stuff
		
		var currentTime = controller.getTime();
		
		controller
		.elements
		.filter(function(e){return e.moving;})
		.forEach(
		function(e)
		{				
			// compute new position, does not update the current one.
			// .position, .newPosition
			e.moving.move();
			e.moving.collided = false;
		});
		
		// solve collisions
		controller.collisionMatrix.forEach(function(c){
			c.new1 = c.e1.newPosition?true:false;
			c.new2 = c.e2.newPosition?true:false;
			c.collided = undefined;			
		});

		controller.collisionMatrix.filter(function(c){ return !c.new1 && !c.new2;})
		.forEach(function(c){
			c.collided = false;			
		});

		//TODO: broad phase

		while(controller.collisionMatrix.some(function(c){ return c.collided === undefined;}))
		{
			controller.collisionMatrix.filter(function(c){ return c.collided === undefined;})
			.forEach(function(c){
				var collision = controller.collisionSolver.getCollision(
					c.e1,
					c.new1?c.e1.newPosition:c.e1.position,
					c.e2,
					c.new2?c.e2.newPosition:c.e2.position);
				
				c.collided = collision.collided;
				if (c.collided)
				{
					c.collisionDetails = collision.collisionDetails; // point at least. F already?
					c.e1.moving.collided = true;
					c.e2.moving.collided = true;
				}
			});
	
			controller.collisionMatrix.filter(function(c){ return c.collided === false && ((c.e1.moving.collided && c.new1) || (c.e2.moving.collided && c.new2));})
			.forEach(function(c){
				c.new1 &= !c.e1.moving.collided 
				c.new2 &= !c.e2.moving.collided 
				c.collided = (c.new1 || c.new2)?undefined:false;
			});
		};

		controller
		.elements
		.filter(function(e){return e.moving && e.newPosition && e.moving.collided;})
		.forEach(
		function(e)
		{				
			// update elements not involved in collision	
			e.position = e.newPosition;
		});

		controller.collisionMatrix.filter(function(c){ return c.collided;})
		.forEach(function(c){
			c.e1.moving.speed.x+=c.collisionDetails.e1.dSpeedX;
			c.e1.moving.speed.y+=c.collisionDetails.e1.dSpeedY;
			c.e1.moving.speed.angle+=c.collisionDetails.e1.dSpeedAngle;

			c.e2.moving.speed.x+=c.collisionDetails.e2.dSpeedX;
			c.e2.moving.speed.y+=c.collisionDetails.e2.dSpeedY;
			c.e2.moving.speed.angle+=c.collisionDetails.e2.dSpeedAngle;
		});

		
		// when do I apply acceleration? same time as impulsions to avoid a loop, end of collision solving
		// done in move at the moment, to test
		

		var toUpdate = controller.elements
			.map(function(e) {
				return e.getUpdatedClientData();
			})		
			.filter(function(updatedData) {
				return updatedData != null;
			});

		var toDelete = controller.elements.filter(function(e) {
			return e.toDelete;
		});

		if (toUpdate.length > 0 || toDelete.length > 0) {
			controller.applicationInstanceEmit('updateClientElements', {
				updates : toUpdate,
				deletes : toDelete.map(function(e) {
					return {
						id : e.id
					};
				})
			});

			toDelete.forEach(function(e) {
				controller.removeElement(e);
			});
		}
	}, 40);
	

	this.applicationInstanceEmit = function(command, data) {
		applicationSocket.to(this.applicationInstance).emit(command,
				JSON.stringify(data));
	}

	this.applicationInstanceBroadcast = function(socket, command, data) {
		socket.broadcast.to(this.applicationInstance).emit(command,
				JSON.stringify(data));
	}

	this.emitToSocket = function(socketId, command, data) {
		applicationSocket.to(socketId).emit(command, JSON.stringify(data));
	}
};

Controller.prototype.getElementById = function(id) {
	var els = this.elements.filter(function(e) {
		return e.id == id;
	});
	if (els.length == 0)
		return null;
	return els[0];
};

Controller.prototype.getElementByTouchIdentifier = function(touchId) {
	var byIdentifier = this.elements.filter(function(e) {
		return e.touchIdentifier == touchId;
	});
	return byIdentifier.length > 0 ? byIdentifier[0] : null;
};

Controller.prototype.addElement = function(elementTemplate) {
	var controller = this;

	var element = new serverElement.Element(controller, elementTemplate);

	controller
		.elements
		.filter(function(e){return e.solid;})
		.forEach(function(e){
			controller.collisionMatrix.push(
				{e1:e,
				e2: element});});

	controller.elements.push(element);

	return element;
};

Controller.prototype.stop= function() {	
	if (this.intervals)
	{
		this.intervals.forEach(function(interval){
			console.log("cleanInterval: " + interval);
			clearInterval(interval);
			});
	}
	this.intervals = [];
};

Controller.prototype.setInterval= function(intervalFunction, time) {	
	this.intervals.push(setInterval(intervalFunction, time));
};

Controller.prototype.removeSocket = function(socket) {
	socket.leave(this.applicationInstance);
	this.socketCount--;
	if (this.socketCount == 0)
	{
		this.stop();
	}
};

Controller.prototype.pause = function() {
	this.paused = true;	
};

Controller.prototype.resume = function() {
	this.paused = false;	
};

Controller.prototype.addSocket = function(socket) {
	var controller = this;

	this.socketCount = this.socketCount || 0;
	this.socketCount++;
	
	socket.join(this.applicationInstance);

	socket.on('pointerEvent', function(message) {

		var eventData = JSON.parse(message);
		var bubble = true;

		eventData.identifierElement = controller.getElementByTouchIdentifier(eventData.touchIdentifier);
		eventData.originSocketId = socket.id;

		if (eventData.identifierElement) {
			eventData.identifierElement.triggerEvent(eventData);
		}

		var hits = controller.elements.filter(function(e) {
			return e.isPointInElementEdges(eventData.x, eventData.y);
		}).sort(function(a, b) {
			return (b.z || 0 - a.z || 0);
		});

		hits.forEach(function(hit) {

			if (!bubble)
				return;

			if (eventData.identifierElement
					&& hit.id == eventData.identifierElement.id)
				return;

			bubble = hit.triggerEvent(eventData);
		});
	});

	socket.on('registerEdges', function(message) {
		var edgesData = JSON.parse(message);

		console.log("Registering edges for " + edgesData.typeName);

		if (controller.elementTypes.filter(function(t) {
			return t.typeName == edgesData.typeName;
		}).length > 0)
			return;
		
		var newType = { 
				typeName: edgesData.typeName,
				imageData: edgesData.imageData,
				boxData: edgesData.boxData// for isInPoint
			};

		if (edgesData.imageData)
		{
			var edgeResolutionX = 1;//edgesData.edgeResolutionX;
			var edgeResolutionY = 1;//edgesData.edgeResolutionY;
			var width = edgesData.width;
			var height = edgesData.height;
					
			edgeImage = edgesData.imageData;
		
			var startEdge = null;
			var transparencyLimit = 1;
			
			var imageX= null;
			var imageY = null;
			var currentEdge = null;
			
			newType.edges = []; 
			var checkPoint = function(x,y,edge, isCorner)
			{
				if (edgeImage[y*width*4 + x*4 + 3] < transparencyLimit)
					return false;
								
				var match = false;
				
				if (edge == "top")
				{
					match = y==0 || edgeImage[(y-1)*width*4 + x*4 + 3] < transparencyLimit;
					dx = 0.5; dy=0;
				}
				if (edge == "left")
				{
					match = x==0 || edgeImage[y*width*4 + (x-1)*4 + 3] < transparencyLimit;
					dx = 0; dy=0.5;
				}
				if (edge == "right")
				{
					match = x==width-1 || edgeImage[y*width*4 + (x+1)*4 + 3] < transparencyLimit;
					dx = 1; dy=0.5;
				}
				if (edge == "bottom")
				{
					match = y==height-1 || edgeImage[(y+1)*width*4 + x*4 + 3] < transparencyLimit;
					dx = 0.5; dy=1;
				};

				if (!match)
					return;
				
				newType.edges.push({
					x: (x + dx)*edgeResolutionX + edgesData.boxData.left,
					y: (y + dy)*edgeResolutionY + edgesData.boxData.top,
					isCorner: isCorner}); 

				imageX = x;
				imageY = y;
				currentEdge = edge;

				return true;
			};
				
			for (var forX=0;forX<width; forX++)
			{
				for (var forY=0;forY<height; forY++)
				{
					if (checkPoint(forX, forY, "top", true))
					{
						startEdge = {x:imageX, y:imageY};
						forX = width; forY=height;
					}
				}
			}

			if (startEdge)
			{						
				do 
				{
					if (currentEdge == "top")
					{
						if (imageX<width-1 && imageY>0 && checkPoint(imageX+1, imageY-1, "left", true))
						{
							continue;
						}
						
						if (imageX<width-1 && checkPoint(imageX+1, imageY, "top", false))
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
						if (imageX<width-1 && imageY<height-1 && checkPoint(imageX+1, imageY+1, "top", true))
						{
							continue;
						}
						
						if (imageY<height-1 && checkPoint(imageX, imageY+1, "right",false))
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
						if (imageX>0 && imageY<height-1 && checkPoint(imageX-1, imageY+1, "right",true))
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
		}
		
		controller.elementTypes.push(newType);
		
		console.log("Registered boxData " + newType.boxData);

	});
};

exports.Controller = Controller;
