/*var serverElement = require("./ServerElement");

var round = function(x){
	return Math.round(100*x)/100;
}

var Controller = function(applicationSocket, applicationInstance, autoStart) {

	var controller = this;

	controller.intervals = [];
	
	var timeScale = 1;
	var time = 0; // seconds
	this.paused = !autoStart;
	
	controller.setInterval(function() {
	//	if (controller.paused)
		//	console.log("Is paused!");
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
	
	controller.broadTiles=[];
	
	var width=700;
	var height=500; // from client somehow
	var broadTilesWidth=50; //config from client/socket, to tweak.. //60 not bad

	for (var left=0;left<width;left+=broadTilesWidth)
		for (var top=0;top<height;top+=broadTilesWidth)
	{
		controller.broadTiles.push({
			left:left,
			top:top,
			right:left+broadTilesWidth,
			bottom:top+broadTilesWidth,
			elements:[]
		});
	}
	
	// new frame process, split, clarify??
	controller.setInterval(function() {
		
		
		if (controller.paused)
			return;
		
		var currentTime = controller.getTime();
		var start = (new Date()).getTime();
		
		controller
		.elements
		.filter(function(e){return e.moving;})
		.forEach(
		function(e)
		{				
			// compute new position, does not update the current one.
			// .position, .newPosition
			var old = e.position.y;
			e.moving.move();
			e.moving.accelerate(); 
			e.moving.collided = false;
			e.history = e.history || [];
			e.history.unshift(round(currentTime) + ' - moving: from ' + round(old) + ' to ' + round(e.position.y));
		});

	//	console.log("To completed moves : " + ((new Date()).getTime() - start));

		var collisionsToCheck = [];
		var collisionsToCheckTable = [];
	//	var collisionsToHandle = [];		

		controller.broadTiles.forEach(function(tile){
			tile.elements.forEach(function(e1){
				tile.elements.filter(function(e){return e.id>e1.id;}).forEach(function(e2){
					if (!e1.previousPosition && !e2.previousPosition)
						return;
					
					if (collisionsToCheck[e1.id] && collisionsToCheck[e1.id][e2.id])
						return;

					var toCheck = {
						e1:e1,
						e2:e2, 
						status:undefined};
					
					collisionsToCheckTable[e1.id]=collisionsToCheckTable[e1.id]||[];
					collisionsToCheckTable[e2.id]=collisionsToCheckTable[e2.id]||[];
					collisionsToCheckTable[e1.id][e2.id] = collisionsToCheckTable[e2.id][e1.id] = toCheck;
					
					collisionsToCheck.push(toCheck);
				})
			})
		});

//		console.log("Broad phase : " + collisionsToCheck.length + " collisions to check");
		//	console.log("Average : " + collisionsToCheck.length/controller.broadTiles.length + " collisions per broadTiles");
		//console.log("To completed broad phase : " + ((new Date()).getTime() - start));

		while(collisionsToCheck.length>0)
		{
			var c = collisionsToCheck.shift();
			
			if (c.status !== undefined)
				continue;
			
			if (!c.e1.previousPosition && !c.e2.previousPosition)
				continue;
			
			var collision = controller.collisionSolver.getCollision(
				c.e1,
				c.e1.position,
				c.e2,
				c.e2.position);
			
			if (!collision.collided)
			{
				collisionsToCheckTable[c.e1.id][c.e2.id].status = collisionsToCheckTable[c.e2.id][c.e1.id].status = false;
				continue;
			}
			
			c.e1.history = c.e1.history || [];
			c.e2.history = c.e2.history || [];

			c.e1.history.unshift(round(currentTime) + ' - treating collision with ' + c.e2.id);
			c.e2.history.unshift(round(currentTime) + ' - treating collision with ' + c.e1.id);
			
			collisionsToCheckTable[c.e1.id][c.e2.id].status = 
				collisionsToCheckTable[c.e2.id][c.e1.id].status = true;

			//console.log('COLLISION : ' + c.e1.id + ' / ' + c.e2.id);
			c.collided = collision.collided;
			c.collisionDetails = collision.collisionDetails; // point at least. F already?
			c.e1.moving.collided = true;
			c.e2.moving.collided = true;
			
			var stuff=0.95;
			
			c.e1.moving.speed.x+=stuff*c.collisionDetails.e1.dSpeedX;
			c.e1.moving.speed.y+=stuff*c.collisionDetails.e1.dSpeedY;
			c.e1.moving.speed.angle+=stuff*c.collisionDetails.e1.dSpeedAngle;

			c.e2.moving.speed.x+=stuff*c.collisionDetails.e2.dSpeedX;
			c.e2.moving.speed.y+=stuff*c.collisionDetails.e2.dSpeedY;
			c.e2.moving.speed.angle+=stuff*c.collisionDetails.e2.dSpeedAngle;
					
			// broad: find tiles for old and add all collisions with new inside this tile.

			var beforeUpdate = collisionsToCheck.length;				

			c.e1.okPosition = c.e1.previousPosition || c.e1.position;
			c.e2.okPosition = c.e2.previousPosition || c.e2.position;
			c.e1.collidedPosition = c.e1.position;
			c.e2.collidedPosition = c.e2.position;

			c.e1.history.unshift(round(currentTime) + ' - did not collid at ' + round(c.e1.okPosition.y) + ' with ' + c.e2.id + ' at ' + round(c.e2.okPosition.y) + " (" + Math.abs(round(c.e1.okPosition.y-c.e2.okPosition.y)) + ")");
			c.e2.history.unshift(round(currentTime) + ' - did not collid at ' + round(c.e2.okPosition.y) + ' with ' + c.e1.id + ' at ' + round(c.e1.okPosition.y)+ " (" + Math.abs(round(c.e1.okPosition.y-c.e2.okPosition.y)) + ")");
			c.e1.history.unshift(round(currentTime) + ' - collided at ' + round(c.e1.position.y) + ' with ' + c.e2.id + ' at ' + round(c.e2.position.y)+ " (" + Math.abs(round(c.e1.position.y-c.e2.position.y)) + ")");
			c.e2.history.unshift(round(currentTime) + ' - collided at ' + round(c.e2.position.y) + ' with ' + c.e1.id + ' at ' + round(c.e1.position.y)+ " (" + Math.abs(round(c.e1.position.y-c.e2.position.y)) + ")");
			
//				console.log(c.e1.id + "-" + c.e2.id + " : UNCOLLIDED : " + c.e1.okPosition.y + "," + c.e2.okPosition.y);
//				console.log(c.e1.id + "-" + c.e2.id + " : COLLIDED : " + c.e1.position.y + "," + c.e2.position.y);

			var step = 8; // tood, use distance or stuff, here just 4 iterations
			while (step>0)
			{
				step--;
				c.e1.testingPosition = c.e1.previousPosition?{
						x:(c.e1.collidedPosition.x+c.e1.okPosition.x)/2,
						y:(c.e1.collidedPosition.y+c.e1.okPosition.y)/2,
						angle:(c.e1.collidedPosition.angle+c.e1.okPosition.angle)/2,
						z:c.e1.position.z
				}:c.e1.position;
				
				c.e2.testingPosition = c.e2.previousPosition?{
						x:(c.e2.collidedPosition.x+c.e2.okPosition.x)/2,
						y:(c.e2.collidedPosition.y+c.e2.okPosition.y)/2,
						angle:(c.e2.collidedPosition.angle+c.e2.okPosition.angle)/2,
						z:c.e2.position.z
				}:c.e2.position;
				
				if (controller.collisionSolver.getCollision(
						c.e1,
						c.e1.testingPosition,
						c.e2,
						c.e2.testingPosition).collided)
				{
					c.e1.history.unshift(round(currentTime) + ' - TEST does collid at ' + round(c.e1.testingPosition.y) + ' with ' + c.e2.id + ' at ' + round(c.e2.testingPosition.y)+ " (" + Math.abs(round(c.e1.testingPosition.y-c.e2.testingPosition.y)) + ")");
					c.e2.history.unshift(round(currentTime) + ' - TEST does collid at ' + round(c.e2.testingPosition.y) + ' with ' + c.e1.id + ' at ' + round(c.e1.testingPosition.y)+ " (" + Math.abs(round(c.e1.testingPosition.y-c.e2.testingPosition.y)) + ")");

//						console.log(c.e1.id + "-" + c.e2.id + " : COLLISION : " + c.e1.testingPosition.y + "," + c.e2.testingPosition.y);
					c.e1.collidedPosition = c.e1.testingPosition;
					c.e2.collidedPosition = c.e2.testingPosition;
				}
				else
				{
					c.e1.history.unshift(round(currentTime) + ' - TEST does not collid at ' + round(c.e1.testingPosition.y) + ' with ' + c.e2.id + ' at ' + round(c.e2.testingPosition.y)+ " (" + Math.abs(round(c.e1.testingPosition.y-c.e2.testingPosition.y)) + ")");
					c.e2.history.unshift(round(currentTime) + ' - TEST does not collid at ' + round(c.e2.testingPosition.y) + ' with ' + c.e1.id + ' at ' + round(c.e1.testingPosition.y)+ " (" + Math.abs(round(c.e1.testingPosition.y-c.e2.testingPosition.y)) + ")");

					//console.log(c.e1.id + "-" + c.e2.id + " : NO COLLISION : " + c.e1.testingPosition.y + "," + c.e2.testingPosition.y);
					//console.log(c.e2.id + " - can use y=" + c.e2.testingPosition.y + " instead of " + c.e2.okPosition.y);
					c.e1.okPosition = c.e1.testingPosition;
					c.e2.okPosition = c.e2.testingPosition;
				}
			}

			c.e1.history.unshift(round(currentTime) + ' - after test, let us use ' + round(c.e1.okPosition.y));
			c.e2.history.unshift(round(currentTime) + ' - after test, let us use ' + round(c.e2.okPosition.y));

			c.e1.position = c.e1.okPosition;
			c.e2.position = c.e2.okPosition;
			
			//console.log("");
			
			if (c.e1.previousPosition)
			{
				if (Math.abs(c.e1.previousPosition.y-c.e1.position.y)<0.01)
				{
					c.e1.position = c.e1.previousPosition;
					c.e1.previousPosition = null;
					c.e1.dt = 0;
				}
//					else
//					{
//						c.e1.dt = t*c.e1.dt;
//					}
				
				c.e1.boundaryBox = c.e1.getBoundaryBox(c.e1.position);

				collisionsToCheckTable[c.e1.id]
				.filter(function(cell){ return cell.status !== undefined })
					.forEach(function(cell){
						collisionsToCheckTable[cell.e1.id][cell.e2.id].status = 
						collisionsToCheckTable[cell.e2.id][cell.e1.id].status = undefined;
						collisionsToCheck.push(collisionsToCheckTable[cell.e1.id][cell.e2.id]);
					});
			}

			//TODO unduplicate
			if (c.e2.previousPosition)
			{
				if (Math.abs(c.e2.previousPosition.y-c.e2.position.y)<0.01)
				{
					c.e2.position = c.e2.previousPosition;
					c.e2.previousPosition = null;
					c.e2.dt = 0;
				}

				c.e2.boundaryBox = c.e2.getBoundaryBox(c.e2.position);
				
				collisionsToCheckTable[c.e2.id]
				.filter(function(cell){ return cell.status !== undefined })
				.forEach(function(cell){
					collisionsToCheckTable[cell.e1.id][cell.e2.id].status = 
					collisionsToCheckTable[cell.e2.id][cell.e1.id].status = undefined;
					collisionsToCheck.push(collisionsToCheckTable[cell.e1.id][cell.e2.id]);
				});
			}
		};

		controller
		.elements
		.filter(function(e){return e.moving;})
		.forEach(function(e1){
			controller
			.elements
			.filter(function(e){return e.moving && e.id>e1.id;})
			.forEach(function(e2){

				if (Math.abs(e1.position.x-e2.position.x)<1 && Math.abs(e1.position.y-e2.position.y)<20)
				{
					console.log("");
					console.log(e1.id + "-" + e2.id + " should have collided: " + round(e1.position.y) + ", " + round(e2.position.y) + "(" + Math.abs(round(e1.position.y-e2.position.y)) + ")");
					console.log("collided now: " + controller.collisionSolver.getCollision(
							e1,
							e1.position,
							e2,
							e2.position).collided);

					console.log("checktable: " +
						(collisionsToCheckTable[e1.id]?
								(collisionsToCheckTable[e1.id][e2.id]?collisionsToCheckTable[e1.id][e2.id].status:undefined):
								(undefined)) 
					);
					
					
					console.log("");
					for (var i=0; i<20 && i<e1.history.length; i++)
					{
						console.log(e1.id + "-" + e1.history[i]);					
					}

					console.log("");
					for (var i=0; i<20 && i<e2.history.length; i++)
					{
						console.log(e2.id + "-" + e2.history[i]);					
					}

//					console.log(e1.id + "-" + e2.id + " HOUSTON WE'VE GOT A PROBLEM !! - ");
					
					controller.pause();
					return;
				}
				
			});
			
			if (Math.abs(e1.position.y)>501 && e1.solid.mass<Infinity)
			{
				
				console.log("");
				for (var i=0; i<20 && i<e1.history.length; i++)
				{
					console.log(e1.id + "-" + e1.history[i]);					
				}
				
				controller.pause();
				return;
			}

			
		});


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
		
		if ((new Date()).getTime() - start>40)
			console.log("Full frame process time : " + ((new Date()).getTime() - start) + ": THIS IS TOOOOO LOOOOOOOOOOOOONG");

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
*/