var Manager = (function () {
	var svg_board, svg_pieces;
	var Board, Prison;

	function BoardSpace () {
		this.setupSVG();
		this.open = false;
	}
	BoardSpace.prototype.highlight = function () {
		this.svg_object.classList.add.apply(this.svg_object.classList, arguments);
	}
	BoardSpace.prototype.lowlight = function () {
		this.svg_object.classList.remove.apply(this.svg_object.classList, arguments);
	}
	BoardSpace.prototype.setOpen = function (passlist) {
		if (!this.open) {
			gameState.openSpaces.push(this);
			// check if this will put us in check.
			//  simulate the move
			var moveshadow = new ShadowBoard();
			moveshadow.setMove(gameState.activeSpace, this);
			// checkcheck
			var forbidden = gameState.checkCheck(gameState.activePlayer, moveshadow);
			if (forbidden) {
				this.highlight("forbidden");

			} else {
				this.movelist = passlist;
				this.open = true;
				this.highlight("open");

				if (this.occupant && this.occupant.colour !== gameState.activePlayer){
					this.highlight("vulnerable");
				}
			}
		}
	}
	BoardSpace.prototype.setClosed = function () {
		this.movelist = null;
		this.open = false;
		this.lowlight("open", "vulnerable", "forbidden");
	}
	BoardSpace.prototype.getNext = function (ds, dt) {
		var cs = this.coords[0];
		var ct = this.coords[1];
		var nds, ndt, jump;
		var bsp;
		if (ct===0 && dt===-1) {
            if (cs===CT.BSIZE-1 && ds===1 ||
                 cs===CT.BSIZE && ds===-1) {
            	nds = ds;
                jump = 0;
            } else {
                nds = jump = -ds;
            }
            ndt = 1;
            bsp = getspace(conjugate(cs)+jump, 0);
        } else {
            bsp = getspace(cs+ds, ct+dt);
            nds = ds;
            ndt = dt;
        }
        return {bspace: bsp, ds: nds, dt: ndt}
	}
	BoardSpace.prototype.toString = function () {
		return this.coords.toString();
	}
	BoardSpace.prototype.passantOpen = function (bsp) {
		//this.setOpen([bsp]);

	}


	var getspace = function (s, t) {
		return (Board[s] && Board[s][t])
	}
	var space = function (location) {
		return getspace.apply(null, location);
	}
	var conjugate = function (n) {
		return CT.BSIZE*2-1-n
	}
	var spots;

	function GamePiece(colour, piece, bspace){
        this.colour = colour;
        this.piece = piece;
        this.setupSVG();
        this.place(bspace);
        this.bindListener();

    }
    GamePiece.prototype.bindListener = function () {
    	this.listenerFunc = function () {recieve(this.territory)}.bind(this);
    	this.svg_object.addEventListener("click", this.listenerFunc);
    }
    GamePiece.prototype.setupSVG = function () {
    	//this.transfersheet = document.createElementNS(CT.SN, "g");
        this.svg_object = document.createElementNS(CT.SN, "use");
        this.setPieceAppearance();
        svg_pieces.appendChild(this.svg_object);

        if (CT.ANIMATIONS) {
			this.mover = document.createElementNS(CT.SN, "animateMotion");
			this.mover.setAttributeNS(null, "dur", CT.ADUR);
			this.mover.setAttributeNS(null, "begin", "indefinite");
			this.mover.setAttributeNS(null, "fill", "freeze");
			this.svg_object.appendChild(this.mover);
		}
    }
    GamePiece.prototype.setPieceAppearance = function () {
    	var new_id = "#" + this.colour + "-" + this.piece;
    	this.svg_object.setAttributeNS(CT.XN, "href", new_id);
    }
    GamePiece.prototype.place = function (bspace) {
        this.setLocation(bspace);
    	this.jump();
    }
    GamePiece.prototype.move = function (steps) {
    	var bspace = steps[steps.length-1];
    	// clear old space
    	this.territory.occupant = null;
    	if (this.mover) {
    		var startspace = this.territory;
    		this.setLocation(bspace);
    		this.glide(startspace, steps);

    	} else {
    	    this.setLocation(bspace);
    		this.jump();
    	}

    }
    GamePiece.prototype.setLocation = function (bspace) {
    	this.location = bspace.coords;
    	this.territory = bspace;
    	if (this.territory.occupant) {
    		this.territory.occupant.getCaptured();
    	}
    	this.territory.occupant = this;
	}
    GamePiece.prototype.jump = function () {
    	this.origin = this.territory.centre;
    	this.svg_object.setAttributeNS(null, "x", this.origin.xs);
    	this.svg_object.setAttributeNS(null, "y", this.origin.ys);
    }
    GamePiece.prototype.glide = function (startspace, steps) {
		//svg_board.appendChild(svg_pieces)
		//_board.appendChild(document.createElementNS(CT.SN, "g"))
    	// steps : array of points to move.
    	var cmds = ["M", startspace.centre.from(this.origin)];
    	for (var i=0; i<steps.length; i++) {
    		cmds.push("L", steps[i].centre.from(this.origin));
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


    function Pawn (colour, bspace) {
    	GamePiece.call(this, colour, "pawn", bspace);
    }
    Pawn.prototype = Object.create(GamePiece.prototype);
    Pawn.prototype.move = function (steps) {
		if (directions.atPawnEnd(this.colour, steps[steps.length-1].coords)) {
			var t = askme();
			GamePiece.prototype.move.call(this, steps);
			this.promote(t);
		} else {
			GamePiece.prototype.move.call(this, steps);
		}
    }
    Pawn.prototype.promote = function (piecetype) {
    	// Step 1. Create a new GamePiece object.
    	var newconstructor = piecetypes[piecetype];
    	var replacement = Object.create(newconstructor.prototype);
    	replacement.constructor = newconstructor;
    	// Step 2. Transfer roles and responsibilities.
    	//  part a: the svg object.
    	//   (it will keep its animations)
    	replacement.svg_object = this.svg_object;
   		replacement.mover = this.mover;
   		//   part a part ii: the listener.
   		this.svg_object.removeEventListener("click", this.listenerFunc);
   		replacement.bindListener();
    	//  part b: some properties.
    	replacement.colour = this.colour;
    	replacement.piece = piecetype;
    	// if we call this after a move,
    	// the location should be the new one
    	// and the old territory vacated
    	replacement.location = this.location;
    	replacement.territory = this.territory;
    	replacement.origin = this.origin;
    	// notify the territory!
    	this.territory.occupant = replacement;

    	// and for some final touches
    	replacement.setPieceAppearance();
    	// this might be moved to a callback

    	// Step 3. Changing of the guard.
    	var parray = pieceArrays[this.colour];
    	var thisindex = parray.indexOf(this);
    	parray.splice(thisindex, 1, replacement);
    	// and we should be done. Hopefully.
    }


    function Queen (colour, bspace) {
    	GamePiece.call(this, colour, "queen", bspace);
    }
    Queen.prototype = Object.create(GamePiece.prototype);

    function King (colour, bspace) {
    	GamePiece.call(this, colour, "king", bspace);
    }
    King.prototype = Object.create(GamePiece.prototype);

    function Rook (colour, bspace) {
    	GamePiece.call(this, colour, "rook", bspace);
    }
    Rook.prototype = Object.create(GamePiece.prototype);

    function Knight (colour, bspace) {
    	GamePiece.call(this, colour, "knight", bspace);
    }
    Knight.prototype = Object.create(GamePiece.prototype);
    Knight.prototype.glide = function (startspace, steps) {
    	// move the piece to the top of the svg paint
    	//svg_pieces.appendChild(this.svg_object)
    	GamePiece.prototype.glide.call(this, startspace, steps);
    }

    function Bishop (colour, bspace) {
    	GamePiece.call(this, colour, "bishop", bspace);
    }
    Bishop.prototype = Object.create(GamePiece.prototype);

    var piecetypes = {
    	pawn: Pawn, king: King, queen: Queen, rook: Rook,
    	knight: Knight, bishop: Bishop
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
		// setup spots
		spots = {};
		var cols = ["black", "white"];
		var sides = ["queenside", "kingside"];
		var ranks = ["home", "pawns"];
		for (var i=0; i<2; i++) {
			var col = {};
			spots[cols[i]] = col;
			for (var j=0; j<2; j++) {
				var side = {}
				col[sides[j]] = side;
				for (var k=0; k<2; k++) {
					side[ranks[k]] = Array(4);
				}
			}
		}
		for (var i=0; i<4; i++) {
			spots.black.queenside.home[i] = Board[0][i];
			spots.black.queenside.pawns[i] = Board[1][i];
			spots.black.kingside.home[i] = Board[2*CT.BSIZE-1][i];
			spots.black.kingside.pawns[i] = Board[2*CT.BSIZE-2][i];
			spots.white.queenside.home[i] = Board[CT.BSIZE-1-i][CT.BSIZE-1];
			spots.white.queenside.pawns[i]= Board[CT.BSIZE-1-i][CT.BSIZE-2];
			spots.white.kingside.home[i] = Board[CT.BSIZE+i][CT.BSIZE-1];
			spots.white.kingside.pawns[i]= Board[CT.BSIZE+i][CT.BSIZE-2];
		}





		var centre = document.createElementNS(CT.SN, "circle")
		centre.classList.add("dot");
		centre.setAttributeNS(null, "cx", 0);
		centre.setAttributeNS(null, "cy", 0);
		centre.setAttributeNS(null, "r", 2);
		svg_board.appendChild(centre)

	}

	// Game Time

	var pieceArrays = {};
	var kingpieces = {};

	var createPieces = function () {
		// ♜♞♝♛♚♝♞♜
		for (var colour in spots) {
			var pieceArray = []
			pieceArrays[colour] = pieceArray;
			var sides = spots[colour];
			for (var side in sides) {
				var rows = sides[side];
				for (var i=0; i<4; i++) {
					pieceArray.push(
						new Pawn(colour, rows.pawns[i])
					);
				}
				pieceArray.push(
					new Bishop(colour, rows.home[1]),
					new Knight(colour, rows.home[2]),
					new Rook(colour, rows.home[3])
				);
			}
			var newKing = new King(colour, sides.kingside.home[0]);
			pieceArray.push(
				new Queen(colour, sides.queenside.home[0]),
				newKing
			);
			kingpieces[colour] = newKing;
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
			}/*
			requestAnimationFrame(function(){
			svg_pieces.appendChild(senderSpace.occupant.svg_object)
			})*/
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
			this.deFocus();			//scmp(imagine());
			this.switchPlayer();

		},
		checkCheck: function (col, shadow) {
			// checks whether it's in check or not
			shadow = shadow || new ShadowBoard();
			var kingspace = shadow.getKingSpace(col);
			return Roamer.dangerChecker(kingspace, col, shadow);
		}
	}

	function Roman (bsp, dir) { // When in Rome...
		this.bspace = bsp;
		this.dir = dir;
	}
	Roman.prototype.advance = function () {
		var next = this.getNext();
		this.bspace = next.bspace;
		this.dir = [next.ds, next.dt];
	}
	Roman.prototype.getNext = function (dir) {
		dir = dir || this.dir;
		return this.bspace.getNext.apply(this.bspace, dir);
	}
	Roman.prototype.getSpace = function (dir) {
		return this.getNext(dir).bspace;
	}

	var query = function (bspace, col, shadow) {
		col = col || gameState.activePlayer;
		if (bspace) {
			var oc = (shadow) ? shadow.getOccupant(bspace) : bspace.occupant;
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
	}

	var Roamer = {
		conjugate: conjugate,
		query: query,
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
		lineRoam: function (bspace, dir, switch_callback) {
			// return 'true' in the callback to cut short!
			var halted;
			var augustus = new Roman(bspace, dir);
			do {
				augustus.advance();
				halted = switch_callback(augustus.bspace);
			} while (!halted);
		},
		kingMoves: function () {
			gameState.openSpaces = []
			for (var i=0; i<8; i++) {
				this.lineRoam(
					gameState.activeSpace,
					directions.omni[i],
					// switch-callback
					function (bspace) {
						var q = query(bspace);
						switch (q) {
							case null:
							case false:
								bspace.setOpen([bspace]);
						}
						return true;
					}
				);
			}
		},
		fullRoam: function (dirs) {
			gameState.openSpaces = [];
			var pusher = function (bspace) {
				passlist.push(bspace);
				bspace.setOpen(passlist.slice());
			}
			for (var i=0; i<dirs.length; i++){
				var passlist = [];
				this.lineRoam(
					gameState.activeSpace,
					dirs[i],
					// switch-callback
					function (bspace) {
						var q = query(bspace);
						switch (q) {
							case null:
								pusher(bspace);
								return false;
								break;
							case false:
								pusher(bspace);
							default:
								return true;
						}
					}
				);
			}
		},
		xpawnsRoam: function (bspace, col, move_callback, add_callback) {
			var next;
			var loc = bspace.coords;
			var dir = directions.pawn(col, loc);
			var lim = directions.atPawnStart(col, loc) ? 2 : 1
			var caesar = new Roman(bspace, dir);
			for (var i=0; i<lim; i++) {
				caesar.advance();
				caesar.dir = directions.pawn(col, caesar.bspace.coords);
				switch (this.query(caesar.bspace)) {
					 case true:
					 case false:
					 case undefined: // shouldn't happen, but whatever
					 	lim = 1;
					 	break;
					 case null:
					 	move_callback(caesar.bspace);
				}
			}
			var adirs = directions.besides(dir);
			for (var i=0; i<2; i++) {
				next = bspace.getNext.apply(bspace, adirs[i]);
				if (this.query(next.bspace) === false) {
					add_callback(next.bspace);
				}
			}
		},
		pawnsRoam: function(bspace, col, call_1, call_2, call_attack) {
			var dir = directions.pawn(col, bspace.coords);
			var caesar = new Roman(bspace, dir);
			// Move forward one space. Execute call_1.
			caesar.advance();
			var halt = call_1(caesar.bspace);
			if (!halt) {
				call_2(caesar.getSpace(directions.pawn(col, caesar.bspace.coords)));
			}
			var adirs = directions.besides(dir);
			caesar.bspace = bspace;
			for (var i=0; i<2; i++) {
				call_attack(caesar.getSpace(adirs[i]));
			}
		},
		pawnsMoves: function () {
			gameState.openSpaces = [];
			var pass_space;
			this.pawnsRoam(
				gameState.activeSpace,
				gameState.activePlayer,
				// call_1
				function (bspace) {
					var q = query(bspace);
					switch (q) {
						case null: // empty
							bspace.setOpen([bspace]);
							if (directions.atPawnStart(
									gameState.activePlayer,
									gameState.activeSpace.coords
								)) {
								pass_space = bspace;
								return false;
							}
						default: // occupied or undef
							return true;
					}
				},
				// call_2
				function (bspace) {
					var q = query(bspace);
					if (q === null)	{
						bspace.setOpen([pass_space, bspace]);
						bspace.enpassant = true;
						pass_space.passant = gameState.activeSpace.occupant;
						console.log(pass_space);
						/*
						pass_space.passant = gameState.activeSpace.occupant;
						pass_space.ep_shadow = new ShadowBoard();
						pass_space.ep_shadow.setSpace(pass_space, gameState.activeSpace.occupant);
						gameState.enpassant[gameState.activePlayer] = pass_space;
						*/
					}
				},
				// call_attack
				function (bspace) {
					var q = query(bspace)//, gameState.activePlayer, bspace.ep_shadow);
					switch (q) {
						case false:
							bspace.setOpen([bspace]);
							break;
						case null:
							if (bspace.passant) {
								//
								bspace.passantOpen();
							}
							break;
					}
				}
			);
		},
		xpawnsMoves: function () {
			gameState.openSpaces = [];
			var passlist = [];
			this.pawnsRoam(
				gameState.activeSpace,
				gameState.activePlayer,
				function (bspace) {
					passlist.push(bspace);
					bspace.setOpen(passlist.slice());
				},
				function (bspace) {
					bspace.setOpen([bspace]);
				}
			);
		},
		knightsRoam: function (bspace, dir, pass_callback, switch_callback) {
			// go forward
			var next, q;
			var pliny = new Roman(bspace, dir);
			pliny.advance();
			if (pliny.bspace) {
				pass_callback(pliny.bspace);
				var newdirs = directions.besides(pliny.dir);
				var nb = pliny.bspace;
				for (var i=0; i<2; i++) {
					next = nb.getNext.apply(nb, newdirs[i]);
					var halt = switch_callback(next.bspace);
					if (halt) break;
				}
			}
		},
		knightsMoves: function () {
			gameState.openSpaces = [];
			var movetracker
			for (var i=0; i<4; i++) {
				this.knightsRoam(
					gameState.activeSpace,
					directions.ortho[i],
					// pass callback
					function (bspace) {
						movetracker = bspace;
					},
					// switch-callback
					function (bspace) {
						var q = query(bspace);
						switch (q) {
							case false:
							case null:
								bspace.setOpen([movetracker, bspace]);
						}
						return false;
					}
				);
			}
		},/*
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
					function(bspace){poosh.push(bspace)}
				);
			}
		},
		castleMoves: function (col) {
			if (gameState.castlable[col]) {

			}
		},*/
		lineChecker: function (bspace, col, shadow) {
			var flag;
			for (var i=0; i<8 && !flag; i++) {
				// check for bishops, rooks, queens
				this.lineRoam(
					bspace,
					directions.omni[i],
					function (nbspace) {
						var q = query(nbspace, col, shadow);
						switch (q) {
							case null:
								return false;
								break;
							case false:
								var validPieceTypes = directions.generalVulnerabilityList[i];
								if (validPieceTypes.indexOf(shadow.getOccupant(nbspace).piece) !== -1) {
									flag = true;
								} // and continue...
							default:
								return true;
						}
					}
				);
			}
			return flag;
		},
		knightChecker: function (bspace, col, shadow) {
			var flag;
			for (var i=0; i<4 && !flag; i++) {
				this.knightsRoam(
					bspace,
					directions.diag[i],
					function(){},
					function (nbspace) {
						var q = query(nbspace, col, shadow);
						if (q===false && shadow.getOccupant(nbspace).piece === "knight") {
							flag = true;
							return true;
						}
					}
				);
			}
			return flag;
		},
		pawnChecker: function (bspace, col, shadow) {
			var flag;
			// TAKE TWO. This is the stupid version, but it'll do, pig.
			for (var i=0; i<4; i++) {
				// CHECK ALL DIAGONALS.
				var next = bspace.getNext.apply(bspace, directions.diag[i]);
				// look for pieces on the diagonal
				var nbspace = next.bspace;
				var q = query(nbspace, col, shadow);
				if (q===false && shadow.getOccupant(next.bspace).piece === "pawn") {
					// check if the piece can attack us
					var ndirs = directions.besides(directions.pawn(otherPlayer(col), nbspace.coords));
					for (var j=0; j<2; j++) {
						var att = nbspace.getNext.apply(nbspace, ndirs[j]);
						if (att.bspace === bspace) {
							flag = true;
							break;
						}
					}
				}
				if (flag) break;
			}
			return flag;
		},
		kingChecker: function (bspace, col, shadow) {
			var flag;
			for (var i=0; i<8 && !flag; i++) {
				this.lineRoam(
					bspace,
					directions.omni[i],
					function (nbspace) {
						var q = query(nbspace, col, shadow);
						if (q===false && shadow.getOccupant(nbspace).piece === "king") {
							flag = true;
						}
						return true;
					}
				);
			}
			return flag;
		},
		dangerChecker: function (bspace, col, shadow) {
			// premature optimisation is the root of all evil.
			shadow = shadow || new ShadowBoard();
			return this.lineChecker(bspace, col, shadow) ||
				this.knightChecker(bspace, col, shadow) ||
				this.pawnChecker(bspace, col, shadow) ||
				this.kingChecker(bspace, col, shadow) || false;
		}


	}

	function ShadowBoard() {}
	ShadowBoard.prototype.setSpace = function (bspace, val) {
		this[bspace.toString()] = val;
		if (val && (val.piece === "king")) {
			this[val.colour] = bspace;
		}
	}
	ShadowBoard.prototype.setMove = function (start, finish) {
		var movedpiece = this.getOccupant(start);
		this.setSpace(start, null);
		this.setSpace(finish, movedpiece);
	}
	ShadowBoard.prototype.getOccupant = function (bspace) {
		var key = bspace.toString();
		return (key in this) ? this[key] : bspace.occupant;
	}
	ShadowBoard.prototype.getKingSpace = function (col) {
		return (col in this) ? this[col] : kingpieces[col].territory;
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
		opposite: function (dir) {
			return [-dir[0], -dir[1]]
		},
		besides_indices: function (dir) {
			var n = this.get_cat(dir);
			return [(n+7)%8, (n+1)%8]
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
		},
		generalVulnerabilityList: (function(){
			var b = [["bishop", "queen"], ["rook", "queen"]];
			return b.concat(b, b, b)
		}())
	}

	var newGame = function () {
		createPieces()
		gameState.activePlayer = "white";
		gameState.activeSpace = null;
		gameState.openSpaces = [];
		gameState.prison = [];
		gameState.castlable = {white: false, black: false};
		gameState.enpassant = {white: null, black: null};




	}

	var scmp = function (a) {
		for (var i=0; i<14; i++){
			for (var j=0; j<7; j++) {
				var b = getspace(i,j);
				if (b) {
					b.lowlight("dangerous");
					var ii = Roamer.dangerChecker(b, gameState.activePlayer, a);
					if (ii) {
						b.highlight("dangerous");
					}
				}
			}
		}
	}

	var imagine = function () {
		var t = new ShadowBoard();
		for (var i=0; i<4; i++) {
			t.setSpace(spots.black.queenside.pawns[i], null);
			t.setSpace(spots.black.queenside.home[i], null);
			t.setSpace(spots.black.kingside.pawns[i], null);
			t.setSpace(spots.black.kingside.home[i], null);
		}
		t.setSpace(getspace(7,0), spots.black.queenside.home[0].occupant);
		t.setSpace(getspace(5,0), spots.black.queenside.pawns[0].occupant);
		return t
	}

	var recieve = function (senderSpace) {
	//console.log(senderSpace.coords)
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

