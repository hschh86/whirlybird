var PieceMaker = (function () {
	'use strict';

    var def_object;

    var chesspiece = {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    };
    var chess_size = 14.5,
		chess_offset = "0.3em";

    var chessShape = function (colour, piece) {
        var shape = document.createElementNS(CT.SN, "g");
        var circle = shape.appendChild(document.createElementNS(CT.SN, "circle"));
        circle.setAttributeNS(null, "r", chess_size);
        var label = shape.appendChild(document.createElementNS(CT.SN, "text"));
        label.setAttributeNS(null, "dy", chess_offset);
        label.textContent = chesspiece[piece];
        shape.id = colour + "-" + piece;
        shape.classList.add(colour, "chesspiece");
        return shape;
    };
    var createDefs = function () {
		var p;
        for (p in chesspiece) {
            def_object.appendChild(chessShape("black", p));
            def_object.appendChild(chessShape("white", p));
        }
    };

    /*
    var useElem = function (colour, piece) {
        var el = document.createElementNS(CT.SN, "use");
        el.setAttributeNS(CT.XN, "href", "#" + colour + "-" + piece);
        return el
    }
    */



    var initialise = function () {
        def_object = document.getElementById("defs");
        createDefs();
    };
    return {
        initialise: initialise
    };

}());

