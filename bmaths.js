
var BMaths = (function() {
	// "Classes"
	function Point(x, y) {
		this.x = x;
		this.y = y;
	}
	Object.defineProperty(Point.prototype, "xs", {
		get: function(){ return this.x.toFixed(CT.FIX) }
	})
	Object.defineProperty(Point.prototype, "ys", {
		get: function(){ return this.y.toFixed(CT.FIX) }
	})
	Point.prototype.toString = function () {
		return this.xs + "," + this.ys
	}
	Point.prototype.from = function (origin) {
		return new Point(this.x - origin.x, this.y - origin.y)
	}

	function LinearRelation(p, q, r) {
		// linear relation of form px + qy = r, or if you like,
		// qy = -px + r, or -qy = px - r
		this.p = p;
		this.q = q;
		this.r = r;
	}

	function Parabola(a, b, d) {
		// Parabola: y = ax^2 + b
		this.a = a;
		this.b = b;
		this.d = d; // used for direction (horizontal coord)
		this.parabolaRelation = new LinearRelation(this.a, -1, -this.b);
	}
	Parabola.prototype.m = function (x) {
		return 2 * this.a * x
	}
	Parabola.prototype.tangent = function (p) {
		// y-y1 = m(x-x1) => mx - y  = mx1 - y1
		// trust that p is on the curve
		var gradient = this.m(p.x);
		var nyint = (gradient * p.x) - p.y;
		return new LinearRelation(gradient, -1, nyint)
	}
	Parabola.prototype.controlpoint = function(p1, p2) {
		var t1 = this.tangent(p1);
		var t2 = this.tangent(p2);
		var isc = linearIntersection(t1, t2);
		return isc
	}
	Parabola.prototype.curvecmd = function(p1, p2) {
		return ["Q", this.controlpoint(p1, p2), p2].join(" ");
	}

	function VerticalAxis () {}
	VerticalAxis.prototype.curvecmd = function (p1, p2) {return "L "+p2}
	VerticalAxis.prototype.parabolaRelation = new LinearRelation(1, 0, 0);

	var linearSolve = function(e1, e2){
		// takes two LinearRelations and spits out the intersection
		// | e1.p e1.q | | t.x | _ | e1.r |
		// | e2.p e2.q | | t.y | - | e2.r |
		var determinant = (e1.p * e2.q) - (e1.q * e2.p);
		var t = {
			x: ((e1.r * e2.q)-(e1.q * e2.r))/determinant,
			y: ((e1.p * e2.r)-(e1.r * e2.p))/determinant
		}
		return t
	}

	var linearIntersection = function(e1, e2){
		var r = linearSolve(e1, e2);
		return new Point(r.x, r.y);
	}

	var parabolaIntersection = function(e1, e2){
		if (e1 !== e2) {
			var r = linearSolve(e1.parabolaRelation, e2.parabolaRelation);
			var mul = typeof e1.d !== "undefined" ? e1.d : 1;
			return new Point(mul * Math.sqrt(r.x), r.y)
		} else {
			return new Point(0, 0)
		}
	}


	return {
		Point: Point,
		LinearRelation: LinearRelation,
		Parabola: Parabola,
		VerticalAxis: VerticalAxis,
		linearIntersection: linearIntersection,
		parabolaIntersection: parabolaIntersection,
	}
}());


