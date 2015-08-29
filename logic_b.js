var Manager = (function () {
	var svg_board, svg_pieces;
	var Board, Prison;

	function BoardSpace () {
		this.setupSVG();
		this.open = false;
	}
	BoardSpace.prototype.highlight = function (cls) {
		this.svg_object.classList.add(cls);/*
		if (this.occupant) {
			this.occupant.svg_object.classList.add(cls);
		}*/
	}
	BoardSpace.prototype.lowlight = function (cls) {
		this.svg_object.classList.remove(cls);/*
		if (this.occupant) {
			this.occupant.svg_object.classList.remove(cls);
		}*/
	}
	BoardSpace.prototype.setOpen = function (passlist) {
		if (!this.open) {
			this.movelist = passlist;
			this.open = true;
			this.highlight("open");
			gameState.openSpaces.push(this);
			if (this.occupant && this.occupant.colour !== gameState.activePlayer){
				this.highlight("vulnerable");
			}
		}
	}
	BoardSpace.prototype.setClosed = function () {
		this.pass = null;
		this.open = false;
		this.lowlight("open");
		this.lowlight("vulnerable");
	}
	/*Object.defineProperty(BoardSpace.prototype, "movelist", {
		get: function () {return this.pass[0].slice(0, this.pass[1])}
	});*/



	var space = function (location) {
		if (Board[location[0]]) {
			return Board[location[0]][location[1]]
		} else {
			return undefined;
		}
	}
	var spots = {
		initialise: function () {
			var cols = ["black", "white"];
			var sides = ["queenside", "kingside"];
			var ranks = ["home", "pawns"];
			for (var i=0; i<2; i++) {
				var col = {};
				this[cols[i]] = col;
				for (var j=0; j<2; j++) {
					var side = {}
					col[sides[j]] = side;
					for (var k=0; k<2; k++) {
						side[ranks[k]] = Array(4);
					}
				}
			}
			for (var i=0; i<4; i++) {
				this.black.queenside.home[i] = Board[0][i];
				this.black.queenside.pawns[i] = Board[1][i];
				this.black.kingside.home[i] = Board[2*CT.BSIZE-1][i];
				this.black.kingside.pawns[i] = Board[2*CT.BSIZE-2][i];
				this.white.queenside.home[i] = Board[CT.BSIZE-1-i][CT.BSIZE-1];
				this.white.queenside.pawns[i]= Board[CT.BSIZE-1-i][CT.BSIZE-2];
				this.white.kingside.home[i] = Board[CT.BSIZE+i][CT.BSIZE-1];
				this.white.kingside.pawns[i]= Board[CT.BSIZE+i][CT.BSIZE-2];
			}
		}
	}


	function GamePiece(colour, piece, location){
        this.colour = colour;
        this.svg_object = document.createElementNS(CT.SN, "use");
        this.promote(piece);
        svg_pieces.appendChild(this.svg_object);
        this.place(location);
        this.svg_object.addEventListener(
        	"click",
        	function () {recieve(this.territory)}.bind(this)
        )
		if (CT.ANIMATIONS) {
			this.mover = document.createElementNS(CT.SN, "animateMotion");
			this.mover.setAttributeNS(null, "dur", CT.ADUR);
			this.mover.setAttributeNS(null, "begin", "indefinite");
			this.mover.setAttributeNS(null, "fill", "freeze");
			this.svg_object.appendChild(this.mover);
		}
    }
    GamePiece.prototype.promote = function (piece) {
    	var new_id = "#" + this.colour + "-" + piece;
    	this.piece = piece;
    	this.svg_object.setAttributeNS(CT.XN, "href", new_id);
    }
    GamePiece.prototype.place = function (location) {
        this.setLocation(location);
    	this.jump();
    }
    GamePiece.prototype.move = function (steps, callback) {
    	var location = steps[steps.length-1];
    	// clear old space
    	this.territory.occupant = null;
    	if (this.piece === "pawn" &&
    		directions.atPawnEnd(this.colour, location)) {
    		this.promote(askme());
    	}
    	if (CT.ANIMATIONS) {
    		var startspace = this.territory;
    		this.setLocation(location);
    		this.glide(startspace, steps);

    	} else {
    	    this.setLocation(location);
    		this.jump(location);
    	}

    }
    GamePiece.prototype.setLocation = function (location) {
    	this.location = location;
    	this.territory = space(location);
    	if (this.territory.occupant) {
    		this.territory.occupant.getCaptured();
    	}
    	this.territory.occupant = this;
	}
    GamePiece.prototype.jump = function (location) {
    	this.origin = this.territory.centre;
    	this.svg_object.setAttributeNS(null, "x", this.origin.xs);
    	this.svg_object.setAttributeNS(null, "y", this.origin.ys);
    }
    GamePiece.prototype.glide = function (startspace, steps) {
    	// steps : array of points to move.
    	var cmds = ["M", startspace.centre.from(this.origin)];
    	for (var i=0; i<steps.length; i++) {
    		cmds.push("L", space(steps[i]).centre.from(this.origin));
    	}
    	this.mover.setAttributeNS(null, "path", cmds.join(" "));
    	this.mover.beginElement();
    }
    GamePiece.prototype.getCaptured = function () {
    	/*this.location = null;
    	this.territory = null;
    	this.svg_object.setAttributeNS(null, "x", 0);
    	this.svg_object.setAttributeNS(null, "y", 0);*/
    	this.svg_object.classList.add("gone");
    	gameState.prison.push(this);
    }

    var askme = function () {
    	return window.prompt()
    }


	var nametate = function(s, t){
		var lp = CT.LETTERS[s];
		var np = s < CT.BSIZE ? (CT.BSIZE-t) : (CT.BSIZE+1+t);
		return [lp, np]
	}
	var gridtate = function(lp, np){
		var s = CT.LETTERS.indexOf(lp);
		var t = s < CT.BSIZE ? (CT.BSIZE-np) : (np-CT.BSIZE-1);
		return [s, t]
	}
	var nameplate = function(cord){
		return nametate.apply(this, cord).join("-")
	}
	var denameplate = function(plate){
		return gridtate.apply(this, plate.split("-"))
	}


	// Draw board
	var draw_board = function(){

		// SVG mixin
		var containSVG = function (tagname, classname) {
			this.setupSVG = function () {
				this.svg_object = document.createElementNS(CT.SN, tagname);
				this.svg_object.classList.add(classname);
				svg_board.appendChild(this.svg_object);
			}
		}


		// Maths Functions
		var border_rule = function(n){
			return [CT.BSTRETCH * Math.pow(n+CT.BBOFFSET, CT.BPOW), CT.BGAP*(n+1)]
		}

		var centre_rule = function(n){
			return [CT.BSTRETCH * Math.pow(n+CT.BCOFFSET, CT.BPOW), CT.BGAP*(n+0.5)]
		}
		var cm = function (s, t) {
			return (s%2 === t%2)
		}
		var cor = function(n, med, thresh){
			return Math.abs(n-med) < thresh;
		}

		// Text label constructor
		function TextLabel (text, position) {
			this.setupSVG();
			this.svg_object.setAttributeNS(null, "x", position.xs);
			this.svg_object.setAttributeNS(null, "y", position.ys);
			this.svg_object.setAttributeNS(null, "dy", "0.4em");
			this.svg_object.textContent = text;
		}
		containSVG.call(TextLabel.prototype, "text", "boardlabel");

		// Setup the boardspace	for mixins
		containSVG.call(BoardSpace.prototype, "path", "boardspace");

		var bsize = CT.BSIZE;
		var bbase = CT.BBASE;
		var axis = new BMaths.VerticalAxis();
		var c_shorts = new Array(bsize * 2);
		var c_longs = new Array(bsize);
		var b_shorts = new Array(bsize * 2 + 1);
		var b_longs = new Array(bsize + 1);
		b_shorts[bsize] = axis;
		b_longs[0] = axis;

		// Filling in the arrays
		for (var i=0; i < bsize; i++) {
			var p = centre_rule(i);
			// shorts on the left
			c_shorts[bsize-i-1] = new BMaths.Parabola(p[0], p[1], -1);
			// shorts on the right
			c_shorts[bsize+i] = new BMaths.Parabola(p[0], p[1], +1);
			// longs
			c_longs[i] = new BMaths.Parabola(-p[0], -p[1], 0);
			// and likewise for the borders
			p = border_rule(i);
			b_shorts[bsize-i-1] = new BMaths.Parabola(p[0], p[1], -1);
			b_shorts[bsize+i+1] = new BMaths.Parabola(p[0], p[1], +1);
			b_longs[i+1] = new BMaths.Parabola(-p[0], -p[1], 0);
		}
		// precalculate corners, just because we can!
		var b_corners = new Array(b_shorts.length);
		for (var s=0; s < b_shorts.length; s++){
			b_corners[s] = new Array(b_longs.length);
			var dep = cor(s, bsize, bbase+1) ? b_longs.length : bbase + 1
			for (var t=0; t < dep; t++){
				b_corners[s][t] = BMaths.parabolaIntersection(b_shorts[s], b_longs[t]);
			}
		}
		// don't bother calculating the control points!!!

		// draw points over the thing

		var plate_labels = function(place, fstart, fend) {
			var platerule = border_rule(place);
			var left_namebar = new BMaths.Parabola(platerule[0], platerule[1], -1);
			var right_namebar = new BMaths.Parabola(platerule[0], platerule[1], 1);
			var bottom_namebar = new BMaths.Parabola(-platerule[0], -platerule[1]);
			for (var i=fstart; i<fend; i++){
				new TextLabel(i,//nametate(0,i)[1],
					BMaths.parabolaIntersection(left_namebar, c_longs[i]));
				new TextLabel(i,//nametate(bsize,i)[1],
					BMaths.parabolaIntersection(right_namebar, c_longs[i]));
				new TextLabel(bsize-1-i,//nametate(bsize-1-i, 0)[0],
					BMaths.parabolaIntersection(c_shorts[bsize-1-i], bottom_namebar));
				new TextLabel(bsize+i,//nametate(bsize+i, 0)[0],
					BMaths.parabolaIntersection(c_shorts[bsize+i], bottom_namebar));
			}
		}
		plate_labels(bsize-1+CT.BLABELGAP, 0, bbase);
		plate_labels(bbase-1+CT.BLABELGAP, bbase, bsize);




		var board_spaces = new Array(c_shorts.length)
		for (var s=0; s < c_shorts.length; s++) {
			board_spaces[s] = new Array(c_longs.length)
			var dep = cor(s, bsize-0.5, bbase) ? c_longs.length : bbase;
			for (var t=0; t < dep; t++) {
				// create the space
				var bspace = new BoardSpace();
				bspace.coords = [s, t];
				// mark the centre
				bspace.centre = BMaths.parabolaIntersection(c_shorts[s], c_longs[t]);

				// setup SVG object
				// clockwise, from top
				bspace.svg_object.id = nameplate(bspace.coords);
				bspace.svg_object.classList.add(cm(s,t) ? "light" : "dark");

				var s_sides = [b_longs[t], b_shorts[s+1],
							   b_longs[t+1], b_shorts[s]]
				// clockwise, from top left, and back to the start
				var s_corners = [b_corners[s][t], b_corners[s+1][t],
								 b_corners[s+1][t+1], b_corners[s][t+1],
								 b_corners[s][t]]
				// write drawing command
				var cmds = ["M", s_corners[0]];
				for (var i=0; i<4; i++){
					cmds.push(s_sides[i].curvecmd(s_corners[i], s_corners[i+1]))
				}
				bspace.svg_object.setAttributeNS(null, "d", cmds.join(" "));
				// LETS BIND
				bspace.svg_object.addEventListener(
					"click",
					function(){recieve(this)}.bind(bspace)
				);

				// put it in our table
				board_spaces[s][t] = bspace;
			}
		}
		Board = board_spaces;
		spots.initialise();


		var centre = document.createElementNS(CT.SN, "circle")
		centre.classList.add("dot");
		centre.setAttributeNS(null, "cx", 0);
		centre.setAttributeNS(null, "cy", 0);
		centre.setAttributeNS(null, "r", 2);
		svg_board.appendChild(centre)

	}

	// Game Time

	var whitePieces, blackPieces;

	var createPieces = function () {
		whitePieces = [];
		blackPieces = [];
		// ♜♞♝♛♚♝♞♜
		var bshort = CT.BSIZE
		var blong = CT.BSIZE * 2
		var p = ["king", "queen", "bishop", "knight", "rook"]
		// King, queen
		for (var i=0; i<2; i++) {
			whitePieces.push(
				new GamePiece("white", p[i], [bshort-i, bshort-1]),
				new GamePiece("white", "pawn", [bshort-i, bshort-2])
			)
			blackPieces.push(
				new GamePiece("black", p[i], [(blong-1)*(1-i), 0]),
				new GamePiece("black", "pawn", [(blong-3)*i+1, 0])
			)
		}
		// Bishops, knights, rook,
		for (var i=2; i<5; i++) {
			// we may want to pull the knights to the top of the stack later
			whitePieces.push(
				new GamePiece("white", "pawn", [bshort-i, bshort-2]),
				new GamePiece("white", "pawn", [bshort-1+i, bshort-2]),
				new GamePiece("white", p[i], [bshort-i, bshort-1]),
				new GamePiece("white", p[i], [bshort-1+i, bshort-1])
			);
			blackPieces.push(
				new GamePiece("black", "pawn", [1, i-1]),
				new GamePiece("black", "pawn", [blong - 2, i-1]),
				new GamePiece("black", p[i], [0, i-1]),
				new GamePiece("black", p[i], [blong - 1, i-1])
			);
		}



	}

	var otherPlayer = function (player) {
		return (player === "white") ? "black" : "white"
	}

	var gameState = {
		switchPlayer: function () {
			this.activePlayer = otherPlayer(this.activePlayer)
		},
		setFocus: function (senderSpace) {
			if (this.activeSpace) {
				this.deFocus();
			}
			this.activeSpace = senderSpace;
			this.activeSpace.highlight("active");
			this.lookAround();
		},
		deFocus: function () {
			this.activeSpace.lowlight("active");
			this.activeSpace = null;
			this.closeSpaces();
		},
		lookAround: function () {
			movingRules[this.activeSpace.occupant.piece]();
		},
		closeSpaces: function () {
			for (var i=0; i<this.openSpaces.length; i++){
				this.openSpaces[i].setClosed();
			}
			this.openSpaces = [];
		},
		makeMove: function (moveparams) {
			this.activeSpace.occupant.move(moveparams);
			this.deFocus();
			this.switchPlayer();
		},
	}

	var Roamer = {
		conjugate: function (n) {
			return CT.BSIZE*2-1-n
		},
		findNext: function (loc, dir) {
			var newLoc = [], newDir = [];
			var jump;
			if (loc[1]===0 && dir[1]===-1) {
                if (loc[0]===CT.BSIZE-1 && dir[0]===1 ||
                     loc[0]===CT.BSIZE && dir[0]===-1) {
                	newDir[0] = dir[0];
                    jump = 0
                } else {
                    newDir[0] = -dir[0];
                    jump = -dir[0];
                }
                newDir[1] = 1;
                newLoc = [this.conjugate(loc[0]) + jump, 0];

            } else {
                newLoc = [loc[0]+dir[0], loc[1]+dir[1]]
                newDir = dir.slice()
            }
            return {location: newLoc, direction: newDir}
		},
		query: function (bspace, col) {
			col = col || gameState.activePlayer;
			if (bspace) {
				var oc = bspace.occupant;
				if (oc) {
					if (oc.colour === col) {
						return true; // friend
					} else {
						return false; // foe
					}
				} else { // no occupant
					return null;
				}
			} else { // space does not exist
				return undefined;
			}
		},
		singleRoam: function (loc, dir, callback) {
			var next = this.findNext(loc, dir);
			loc = next.location;
			var bspace = space(loc);
			switch (this.query(bspace)){
				case null:
				case false:
					callback(loc, bspace);
					break;
				case true:
				case undefined:
					// DO NOTHING
					break;
			}
		},
		kingMoves: function () {
			gameState.openSpaces = []
			for (var i=0; i<8; i++) {
				this.singleRoam(
					gameState.activeSpace.coords,
					directions.omni[i],
					function (loc, bspace) {
						bspace.setOpen([loc])
					}
				);
			}
		},
		lineRoam: function (loc, dir, callback) {
			var next, bspace, q;
			var halted = false;
			while (!halted) {
				next = this.findNext(loc, dir);
				loc = next.location;
				dir = next.direction;
				bspace = space(loc);
				q = this.query(bspace);
				switch (q){
					case null:
						callback(loc, bspace, q);
						break;
					case false:
						callback(loc, bspace, q); // and continue...
					case true:
					case undefined:
						halted = true;
				}
			}
		},
		fullRoam: function (dirs) {
			gameState.openSpaces = [];
			for (var i=0; i<dirs.length; i++){
				var passlist = [];
				this.lineRoam(
					gameState.activeSpace.coords,
					dirs[i],
					function (loc, bspace) {
						passlist.push(loc);
						bspace.setOpen(passlist.slice());
					}
				);
			}
		},
		pawnsRoam: function (loc, col, move_callback, add_callback) {
			var nloc, next, bspace;
			var dir = directions.pawn(col, loc);
			var lim = directions.atPawnStart(col, loc) ? 2 : 1
			nloc = loc;
			ndir = dir;
			for (var i=0; i<lim; i++) {
				next = this.findNext(nloc, ndir);
				nloc = next.location;
				ndir = directions.pawn(col, nloc);
				bspace = space(nloc);
				switch (this.query(bspace)) {
					 case true:
					 case false:
					 case undefined: // shouldn't happen, but whatever
					 	lim = 1;
					 	break;
					 case null:
					 	move_callback(nloc, bspace);
				}
			}
			var adirs = directions.besides(dir);
			for (var i=0; i<2; i++) {
				next = this.findNext(loc, adirs[i]);
				nloc = next.location;
				bspace = space(nloc);
				if (this.query(bspace) === false) {
					add_callback(nloc, bspace);
				}
			}
		},
		pawnsMoves: function () {
			gameState.openSpaces = [];
			var passlist = [];
			this.pawnsRoam(
				gameState.activeSpace.coords,
				gameState.activePlayer,
				function (loc, bspace) {
					passlist.push(loc);
					bspace.setOpen(passlist.slice());
				},
				function (loc, bspace) {
					bspace.setOpen([loc]);
				}
			);
		},
		knightsRoam: function (loc, dir, pass_callback, add_callback) {
			// go forward
			var nloc, q;
			var next = this.findNext(loc, dir);
			loc = next.location;
			dir = next.direction;
			var bspace = space(loc);
			if (bspace) {
				pass_callback(loc, bspace);
				newdirs = directions.besides(dir);
				for (var i=0; i<2; i++) {
					next = this.findNext(loc, newdirs[i]);
					nloc = next.location;
					bspace = space(nloc);
					q = this.query(bspace);
					switch (q) {
						case false:
						case null:
							add_callback(nloc, bspace, q);
					}
				}
			}
		},
		knightsMoves: function () {
			gameState.openSpaces = [];
			var movetracker
			for (var i=0; i<4; i++) {
				this.knightsRoam(
					gameState.activeSpace.coords,
					directions.ortho[i],
					function(loc) {movetracker = loc},
					function(loc, bspace) {bspace.setOpen([movetracker, loc])}
				);
			}
		},
		knightsCatalog: function (start, poosh) {
			for (var i=0; i<4; i++) {
				this.knightsRoam(
					start,
					directions.ortho[i],
					function(loc){},
					function(loc, bspace){poosh.push(bspace)}
				)
			}
		},
		reverseKnightsCatalog: function (start, poosh) {
			for (var i=0; i<4; i++) {
				this.knightsRoam(
					start,
					directions.diag[i],
					function(){},
					function(loc, bspace){poosh.push(bspace)}
				);
			}
		},
		knightCheck: function (start, col) {
			col = col || gameState.activePlayer;
			var flag = false;
			for (var i=0; i<4; i++) {
				this.knightsRoam(
					start,
					directions.diag[i],
					function(){},
					function(loc, bspace, q){
						if (q===false) {
							flag = true;
						}
					}
				);
				// bad practices but whatever
			}
			return flag;
		},

		castleMoves: function (col) {
			if (gameState.castlable[col]) {

			}
		},



	}


	var movingRules = {
		queen: function() {
			Roamer.fullRoam(directions.omni);
		},
		rook: function() {
			Roamer.fullRoam(directions.ortho);
		},
		bishop: function () {
			Roamer.fullRoam(directions.diag);
		},
		pawn: function () {
			Roamer.pawnsMoves();
		},
		knight: function () {
			Roamer.knightsMoves();
		},
		king: function () {
			Roamer.kingMoves();
			var jim = []
			Roamer.reverseKnightsCatalog(gameState.activeSpace.coords, jim);
			console.log(jim)
		},
	}

	var directions = {
		omni: [[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1]],
		ortho: [[-1,0],[0,1],[1,0],[0,-1]],
		diag: [[-1,-1], [-1,1], [1,1], [1,-1]],
		besides: function (dir) {
			var n = this.get_cat(dir);
			return [this.omni[(n+7)%8], this.omni[(n+1)%8]]
		},
		get_cat: function (dir) {
		// not the most sensible in the world but it will do
			switch (dir[0]) {
				case 0:
					return (5 - 2*dir[1])
					break;
				case 1:
					return (5 - dir[1])
					break; // These breaks aren't really nec. but...
				case -1:
					return (1 + dir[1])
					break;
			}
		},
		pawn: function (col, loc) {
			if (col === "white") {
				if (this.zone(loc) > 0) {
					return [0, -1];
				} else {
					if (this.leftside(loc)) {
						return [-1, 0];
					} else {
						return [1, 0];
					}
				}
			} else { // col === "black"
				if (this.zone(loc) < 0) {
					if (this.leftside(loc)) {
						return [1, 0];
					} else {
						return [-1, 0];
					}
				} else {
					return [0, 1];
				}
			}
		},
		zone: function (loc) {
		 // negative for top, positive for bottom, zero for middle
		 	loc = this.normLeft(loc);
			return (loc[0]+loc[1])-(CT.BSIZE-1)
		},
		normLeft: function (loc) {
			if (this.leftside(loc)) {
				return loc;
			} else {
				return [2*CT.BSIZE-1-loc[0], loc[1]]
			}
		},
		leftside: function (loc) {
			return loc[0]<CT.BSIZE
		},
		atPawnStart: function (col, loc) {
			if (col==="white") {
				return (loc[1]===CT.BSIZE-2)
			} else {
				loc = this.normLeft(loc);
				return (loc[0]===1)
			}
		},
		atPawnEnd: function (col, loc) {
			if (col==="white") {
				loc = this.normLeft(loc);
				return (loc[0]===0);
			} else {
				return (loc[1]===CT.BSIZE-1);
			}
		}
	}

	var newGame = function () {
		createPieces()
		gameState.activePlayer = "white";
		gameState.activeSpace = null;
		gameState.openSpaces = [];
		gameState.prison = [];
		gameState.castlable = {white: false, black: false};
	}

	var recieve = function (senderSpace) {
	//console.log(directions.zone(senderSpace.coords))
	//console.log(directions.atPawnStart("black", senderSpace.coords))
	//console.log(senderSpace)
		if (senderSpace.open) {
			// Move available: make move
			gameState.makeMove(senderSpace.movelist);
		} else if (senderSpace.occupant && senderSpace.occupant.colour === gameState.activePlayer) {
			if (senderSpace === gameState.activeSpace) {
				// active space clicked: defocus
				gameState.deFocus();
			} else {
				// friend clicked: switch
				gameState.setFocus(senderSpace);
			}
		} else {
			// do nothing

		}
	}


	/****** 	INITIALISER		*********/

	initialise = function () {
		svg_board = document.getElementById("board");
		svg_pieces = document.getElementById("pieces");
		PieceMaker.initialise();
		draw_board();
		this.board = Board
		newGame();
		this.gs = gameState;
	}

	return {
		initialise: initialise,
		gp : GamePiece,
	}
}());

window.onload = function () {
	Manager.initialise()
}

