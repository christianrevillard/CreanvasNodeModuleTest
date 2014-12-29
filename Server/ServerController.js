var serverElement = require("./ServerElement");

var currentTime = 0;

var round = function(x){
	return Math.round(10000*x)/10000;
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
	
	controller.lastUpdated = 0;
	
	// new frame process, split, clarify??
	controller.setInterval(
		function() { controller.nextFrame();}, 
		40);

	this.applicationInstanceEmit = function(command, data) {
		applicationSocket.to(this.applicationInstance).emit(command,
				JSON.stringify(data));
	};

	this.applicationInstanceBroadcast = function(socket, command, data) {
		socket.broadcast.to(this.applicationInstance).emit(command,
				JSON.stringify(data));
	};

	this.emitToSocket = function(socketId, command, data) {
		applicationSocket.to(socketId).emit(command, JSON.stringify(data));
	};
	
	this.computeNewPositions = function(dt){
		controller
		.elements
		.filter(function(e){return e.moving;})
		.forEach(
		function(e)
		{				
			var old = e.position.y;
			e.moveCandidate = e.moving.move(dt);
			e.moveCandidate.dt = e.moveCandidate.dt;
			e.history = e.history || [];
			//e.addHistory(round(currentTime) + ' - moving: from ' + round(old) + ' to ' + round(e.moveCandidate.position.y));
		});		
	};
	
	
	//TODO : to collision solver
	this.broadPhase = function(collisionsMatrix, collisionsToCheck){
		var controller = this;
		
		controller.broadTiles.forEach(function(tile){
			tile.elements.forEach(function(e1){
				tile.elements.filter(function(e){return e.id>e1.id;}).forEach(function(e2){
					if (!e1.moveCandidate.dt && !e2.moveCandidate.dt)
						return;
					
					if (collisionsMatrix[e1.id] && collisionsMatrix[e1.id][e2.id])
						return;

					var toCheck = {
						checkTimes:0,
						e1:e1,
						e2:e2,  //e2.id>e1.id, always
						status:undefined};
					
					collisionsMatrix[e1.id]=collisionsMatrix[e1.id]||[];
					collisionsMatrix[e2.id]=collisionsMatrix[e2.id]||[];
					collisionsMatrix[e1.id][e2.id] = collisionsMatrix[e2.id][e1.id] = toCheck;
					
					collisionsToCheck.push(toCheck);
				})
			})
		});
		
//		console.log('Broad phase : ' + collisionsToCheck.length + ' collisions to check');
	};

	this.requeuePossibleCollisions = function(collisionsMatrix, collisionsToCheck, e)
	{				
		collisionsMatrix[e.id]
		.filter(function(cell){ return cell.status !== undefined && ((cell.e1.id==e.id && cell.checkedDt1>e.moveCandidate.dt)||(cell.e2.id==e.id && cell.checkedDt2>e.moveCandidate.dt))})
			.forEach(function(cell){
				collisionsMatrix[cell.e1.id][cell.e2.id].status = 
				collisionsMatrix[cell.e2.id][cell.e1.id].status = undefined;
				collisionsToCheck.push(collisionsMatrix[cell.e1.id][cell.e2.id]);
//				console.log('Rechecking collision ' + cell.e1.id + '/' + cell.e2.id + ' was handled at ' + round(cell.e1.id==e.id?cell.checkedDt1:cell.checkedDt2) + ', recheck for ' + e.id + ' at ' + round(e.moveCandidate.dt));
			});
	};

	
	this.moveOutOfOverlap = function(e1, e2) {
		// Input: e1 and e2 overlap in their currentDt
		// Out: update currentDt and moveCandidate into an non-overlaping position. dt goes always down
		// See later, drop for the moment - CollisionMatrix to contain the most actual collisionInfo => needed really?
		
		//console.log('Fixing overlap for ' + e1.id + '/' + e2.id);
		
		var controller = this;

		e1.addHistory('Separating from ' + e2.id);
		e2.addHistory('Separating from ' + e1.id);

		// scenario 1: same currentDt 
		if (Math.abs(e1.moveCandidate.dt - e2.moveCandidate.dt)<0.001)
		{
			this.moveOutOfOverlapCommonDt(e1, e2);
		}
		else
		{
			var highestDtElement = (e1.moveCandidate.dt>e2.moveCandidate.dt)?e1:e2;
			var lowestDtElement = (e1.moveCandidate.dt>e2.moveCandidate.dt)?e2:e1;
			
			var highestDt  = highestDtElement.moveCandidate.dt;			
			var lowestDt = lowestDtElement.moveCandidate.dt;

			highestDtElement.moveCandidate = highestDtElement.moving.move(lowestDt);
							
			collision = controller.collisionSolver.getCollision(
				highestDtElement,
				highestDtElement.moveCandidate.position,
				lowestDtElement,
				lowestDtElement.moveCandidate.position);
			
			if (collision.collided) {
				// scenario 2a: different currentDt, do collide at minimum of the 2 => common dt to fin between 0 and lowestDt
				// both moved at lowestDt already
				this.moveOutOfOverlapCommonDt(e1, e2);				
			} else {
				// scenario 2b: different currentDt, do no collide at minimum of the 2. => only update highest dt to find non-collision				
				highestDtElement.moveCandidate = highestDtElement.moving.move(highestDt);
				this.moveOutOfOverlapDifferentDt(highestDtElement, lowestDtElement);				
			}
		}
	};

	this.moveOutOfOverlapCommonDt = function(e1, e2) {
		// Input: e1 and e2 overlap in their currentDt, which is the same
		// Out: update currentDt and moveCandidate into an non-overlaping position.

	//	console.log('Fixing overlap - common dt -for ' + e1.id + '/' + e2.id);
 
		var controller = this;

		var okDt = 0;
		var collidedDt = Math.min(e1.moveCandidate.dt, e2.moveCandidate.dt); // in case not perfectly equal.
		var testDt;
		var collision;
		
		var step = 8; // tood, use distance or stuff to refine.
		while (step>0)
		{
			step--;

			testDt = (okDt + collidedDt)/2;	
			
			e1.moveCandidate = e1.moving.move(testDt);
			e2.moveCandidate = e2.moving.move(testDt);
							
			collision = controller.collisionSolver.getCollision(
				e1,
				e1.moveCandidate.position,
				e2,
				e2.moveCandidate.position);
			
			if (collision.collided) { 
				collidedDt = testDt; 
	//			console.log('collision at ' + round(testDt) + " (" + Math.abs(round(e1.moveCandidate.position.y - e2.moveCandidate.position.y)) + ")");
			} else { 
					okDt = testDt;
//					console.log('ok at ' + round(testDt));
			}
		}
		
		e1.moveCandidate = e1.moving.move(okDt);
		e2.moveCandidate = e2.moving.move(okDt);

//		console.log('Now using ' + e1.id + ': ' + e1.moveCandidate.dt);
//		console.log('Now using ' + e2.id + ': ' + e2.moveCandidate.dt);

		e1.addHistory('Separating from ' + e2.id + ' - common dt loop dt:' + round(okDt));
		e2.addHistory('Separating from ' + e1.id + ' - common dt loop dt:' + round(okDt));
	};

	this.moveOutOfOverlapDifferentDt = function(toUpdate, fixed) {
		// Input: e1 and e2 overlap in their currentDt, but not at fixed.dt. Find the correct value for toUpdate

		var controller = this;

		var okDt = fixed.moveCandidate.dt;
		
		var collidedDt = toUpdate.moveCandidate.dt; 

		var testDt;
		var collision;
		
		var step = 8; // tood, use distance or stuff to refine.
		while (step>0)
		{
			step--;

			testDt = (okDt + collidedDt)/2;	
			
			toUpdate.moveCandidate = toUpdate.moving.move(testDt);
							
			collision = controller.collisionSolver.getCollision(
				toUpdate,
				toUpdate.moveCandidate.position,
				fixed,
				fixed.moveCandidate.position);
			
			if (collision.collided) { collidedDt = testDt; } else { okDt = testDt;}
			
		}
		
		toUpdate.moveCandidate = toUpdate.moving.move(okDt);

	//	console.log('Fixing overlap - different dt - for ' + toUpdate.id + '/' + fixed.id + ' - using ' + round(okDt) + '/' + round( fixed.moveCandidate.dt));

		toUpdate.addHistory('Separating from ' + fixed.id + ' - different dt loop - update dt to:' + round(okDt));
		fixed.addHistory('Separating from ' + toUpdate.id + ' - different dt loop - keeping dt:' + round(fixed.moveCandidate.dt));
	};

	this.checkForCollision = function(c, collisionsMatrix, collisionsToCheck){
				
	//	console.log('Checking collision ' + c.e1.id + ' at ' + round(c.e1.moveCandidate.dt) + ' /' + c.e2.id + ' at ' + round(c.e2.moveCandidate.dt) + ' for the ' + (++c.checkTimes) + '. time');

		if (c.status !== undefined)
			return; // already handled - can this really happen, check.
		
		if (!c.e1.moveCandidate.dt  && !c.e2.moveCandidate.dt)
			return;

		var logInfo = round(currentTime) + ': ' + c.e1.id + '('+ round(c.e1.moveCandidate.dt) +') /' + c.e2.id + '('+ round(c.e2.moveCandidate.dt)+') : ';
						
		var collision = controller.collisionSolver.getCollision(
			c.e1,
			c.e1.moveCandidate.position,
			c.e2,
			c.e2.moveCandidate.position); // must send speed too... try with the currrent one.
					
		if (!collision.collided)
		{
			c.e1.history.unshift(logInfo + ' no collision at ' + round(c.e1.moveCandidate.dt) + ' : ' + Math.abs(round(c.e1.moveCandidate.position.y-c.e2.moveCandidate.position.y)));
			c.e2.history.unshift(logInfo + ' no collision at ' + round(c.e2.moveCandidate.dt) + ' : ' + Math.abs(round(c.e1.moveCandidate.position.y-c.e2.moveCandidate.position.y)));
			collisionsMatrix[c.e1.id][c.e2.id].status = collisionsMatrix[c.e2.id][c.e1.id].status = false;
			
			collisionsMatrix[c.e1.id][c.e2.id].checkedDt1 = collisionsMatrix[c.e2.id][c.e1.id].checkedDt1 =  c.e1.moveCandidate.dt;
			collisionsMatrix[c.e1.id][c.e2.id].checkedDt2 = collisionsMatrix[c.e2.id][c.e1.id].checkedDt2 =  c.e2.moveCandidate.dt;
			return;
		}
		
		c.e1.addHistory(logInfo + ' collision at ' + round(c.e1.moveCandidate.dt) + ' : ' + Math.abs(round(c.e1.moveCandidate.position.y-c.e2.moveCandidate.position.y)));
		c.e2.addHistory(logInfo + ' collision at ' + round(c.e2.moveCandidate.dt) + ' : ' + Math.abs(round(c.e1.moveCandidate.position.y-c.e2.moveCandidate.position.y)));

		collisionsMatrix[c.e1.id][c.e2.id].status =  collisionsMatrix[c.e2.id][c.e1.id].status = true;				
		collisionsMatrix[c.e1.id][c.e2.id].collisionDetails = collisionsMatrix[c.e2.id][c.e1.id].collisionDetails =  collision.collisionDetails;
			
		this.moveOutOfOverlap(c.e1, c.e2);
		
		collisionsMatrix[c.e1.id][c.e2.id].checkedDt1 = collisionsMatrix[c.e2.id][c.e1.id].checkedDt1 =  c.e1.moveCandidate.dt;
		collisionsMatrix[c.e1.id][c.e2.id].checkedDt2 = collisionsMatrix[c.e2.id][c.e1.id].checkedDt2 =  c.e2.moveCandidate.dt;

		controller.requeuePossibleCollisions(collisionsMatrix, collisionsToCheck, c.e1);
		controller.requeuePossibleCollisions(collisionsMatrix, collisionsToCheck, c.e2);		
	};
		
	this.narrowPhase = function(collisionsMatrix, collisionsToCheck){
		var controller = this;
		
		while(collisionsToCheck.length>0)
		{
			controller.checkForCollision(collisionsToCheck.shift(), collisionsMatrix, collisionsToCheck);
		};		
	};

	this.commitMoves = function()
	{
		this
		.elements
		.filter(function(e){return e.moving;})
		.forEach(function(e){
			e.moving.commitMove(e.moveCandidate);
		});
	};
	
	this.updateSpeeds = function(collisionsMatrix){
		var controller = this;
		
		collisionsMatrix.forEach(function(column){
			column.forEach(function(c){
				if (!c.status)
					return;

				console.log('Updating for collision ' + c.e1.id + '/' + c.e2.id);
				
				// avoid handlig the same twice is twice in the table!
				c.status = undefined;

				var stuff=0.9;
									
//				console.log(round(currentTime) +  ' Updating speeds for ' + c.e1.id + '-' + c.e2.id);
				if (Math.abs(c.collisionDetails.e1.dSpeedY)>0)
				{
					c.e1.moving.speed.x+=stuff*c.collisionDetails.e1.dSpeedX;
					c.e1.moving.speed.y+=stuff*c.collisionDetails.e1.dSpeedY;
					c.e1.moving.speed.angle+=stuff*c.collisionDetails.e1.dSpeedAngle;
				}
				if (Math.abs(c.collisionDetails.e2.dSpeedY)>0)
				{
					c.e2.moving.speed.x+=stuff*c.collisionDetails.e2.dSpeedX;
					c.e2.moving.speed.y+=stuff*c.collisionDetails.e2.dSpeedY;
					c.e2.moving.speed.angle+=stuff*c.collisionDetails.e2.dSpeedAngle;
				}
				
			})
		});
		
	};
	
	
	this.updateClient = function(){
		var controller = this;
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
	};

	this.nextFrame = function() {
		
		var controller = this;
		
		if (controller.paused)
			return;
		
		console.log('');		
		//console.log('Starting new frame');
		
		currentTime = controller.getTime();
		var start = (new Date()).getTime();
		
		dt = currentTime - controller.lastUpdated;
		controller.lastUpdated = currentTime;

		controller.computeNewPositions(dt);
		
	//	console.log("To completed moves : " + ((new Date()).getTime() - start));

		var collisionsToCheck = [];
		var collisionsMatrix = [];

		controller.broadPhase(collisionsMatrix, collisionsToCheck);		

//		console.log("Broad phase : " + collisionsToCheck.length + " collisions to check");
		//	console.log("Average : " + collisionsToCheck.length/controller.broadTiles.length + " collisions per broadTiles");
		//console.log("To completed broad phase : " + ((new Date()).getTime() - start));

		controller.narrowPhase(collisionsMatrix, collisionsToCheck);		
		
		controller.commitMoves();

		controller.updateSpeeds(collisionsMatrix);

		controller.afterNextFrame(collisionsMatrix);

		controller.updateClient();
		
		
		if ((new Date()).getTime() - start>40)
			console.log("Full frame process time : " + ((new Date()).getTime() - start) + ": THIS IS TOOOOO LOOOOOOOOOOOOONG");

	};

this.afterNextFrame = function(collisionsMatrix){
	var controller = this;
	
	if(controller.ce)
	{
		//console.log('was E=' + round(controller.ce));
		controller.oldce=controller.ce
	}
	
	controller.ce = 0;
	
	controller
	.elements
	.filter(function(e){return e.moving && e.moving.speed;})
	.forEach(function(e){
		controller.ce+=e.moving.speed.y*e.moving.speed.y/2 + 100*(438-e.position.y);
	});
	
	//console.log('now E=' + round(controller.ce));

	if (!controller.ce)
	{
		controller.pause();
		return;
	}	

	if (controller.oldce && controller.ce>2*controller.oldce)
	{
		console.log('That was too much !');
	}
	
	
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
					(collisionsMatrix[e1.id]?
							(collisionsMatrix[e1.id][e2.id]?collisionsMatrix[e1.id][e2.id].status:undefined):
							(undefined)) 
				);
				
				
				console.log("");
				e1.displayHistory(20);

				console.log("");
				e2.displayHistory(20);
				
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
};

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
