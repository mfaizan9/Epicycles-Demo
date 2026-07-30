function PathTracingDemo1Class()
{
   this.ball2OrbitalRadius = 85;
   this.ball2AnomalyAtEpoch = 0;
   this.ball3OrbitalRadius = 200;
   this.ball3AnomalyAtEpoch = 0;
   this.ball3Period = Math.pow(this.ball3OrbitalRadius / this.ball2OrbitalRadius,1.5);
   this.attachMovie("System","systemMC",10);
   this.systemMC.attachMovie("Yellow Ball","ball1",1,{_x:0,_y:0});
   this.systemMC.attachMovie("Blue Ball","ball2",2);
   this.systemMC.attachMovie("Red Ball","ball3",3);
   this.lineSegments = 120;
   this.createEmptyMovieClip("pathsMC",5);
   this.pathSegmentsArray = [];
   var i = 0;
   while(i < this.lineSegments)
   {
      this.pathSegmentsArray.push(this.pathsMC.createEmptyMovieClip("_" + i,i));
      i++;
   }
   this.currentSegment = 0;
   this.systemMC.createEmptyMovieClip("yellowCentricMC",0);
   this.systemMC.yellowCentricMC.clear();
   this.systemMC.yellowCentricMC.lineStyle(1,0,100);
   this.drawCircle(this.systemMC.yellowCentricMC,this.ball3OrbitalRadius);
   this.drawCircle(this.systemMC.yellowCentricMC,this.ball2OrbitalRadius);
   this.systemTime = 0;
   this.setCenter("yellow");
}
var p = PathTracingDemo1Class.prototype = new MovieClip();
Object.registerClass("Path Tracing Demo 1",PathTracingDemo1Class);
p.setCenter = function(arg)
{
   if(arg == "yellow")
   {
      this.centerBall = 1;
   }
   else if(arg == "blue")
   {
      this.centerBall = 2;
   }
   else if(arg == "red")
   {
      this.centerBall = 3;
   }
   this.setTime(this.systemTime);
};
p.getTime = function()
{
   return this.systemTime;
};
p.setTime = function(arg)
{
   this.systemTime = arg;
   var ball2Anomaly = this.ball2AnomalyAtEpoch + arg * 2 * 3.141592653589793;
   var x2 = this.ball2OrbitalRadius * Math.cos(ball2Anomaly);
   var y2 = (- this.ball2OrbitalRadius) * Math.sin(ball2Anomaly);
   this.systemMC.ball2._x = x2;
   this.systemMC.ball2._y = y2;
   var ball3Anomaly = this.ball3AnomalyAtEpoch + arg * 2 * 3.141592653589793 / this.ball3Period;
   var x3 = this.ball3OrbitalRadius * Math.cos(ball3Anomaly);
   var y3 = (- this.ball3OrbitalRadius) * Math.sin(ball3Anomaly);
   this.systemMC.ball3._x = x3;
   this.systemMC.ball3._y = y3;
   var dx = - this.systemMC["ball" + this.centerBall]._x;
   var dy = - this.systemMC["ball" + this.centerBall]._y;
   this.systemMC._x = dx;
   this.systemMC._y = dy;
   if(this.centerBall == 1)
   {
      this.lastBx = x2;
      this.lastBy = y2;
      this.lastCx = x3;
      this.lastCy = y3;
   }
   else if(this.centerBall == 2)
   {
      this.lastBx = dx;
      this.lastBy = dy;
      this.lastCx = x3 + dx;
      this.lastCy = y3 + dy;
   }
   else if(this.centerBall == 3)
   {
      this.lastBx = x2 + dx;
      this.lastBy = y2 + dy;
      this.lastCx = dx;
      this.lastCy = dy;
   }
   var ls = this.lineSegments;
   var segments = this.pathSegmentsArray;
   var i = 0;
   while(i < ls)
   {
      segments[i].clear();
      i++;
   }
};
p.addProperty("time",p.getTime,p.setTime);
p.incrementTime = function(arg)
{
   var start = getTimer();
   var cos = Math.cos;
   var sin = Math.sin;
   var maxTimeStep = 0.025;
   var minTimeStep = 0.003;
   if(Math.abs(arg) < minTimeStep)
   {
      return undefined;
   }
   var numSteps = Math.ceil(Math.abs(arg / maxTimeStep));
   var stepSize = arg / numSteps;
   var t0 = this.systemTime;
   var cs = this.currentSegment;
   var ls = this.lineSegments;
   var segments = this.pathSegmentsArray;
   var lxB = this.lastBx;
   var lyB = this.lastBy;
   var lxC = this.lastCx;
   var lyC = this.lastCy;
   var r2 = this.ball2OrbitalRadius;
   var r3 = this.ball3OrbitalRadius;
   var center = this.centerBall;
   var i = 0;
   while(i < numSteps)
   {
      var t = t0 + i * stepSize;
      var ball2Anomaly = this.ball2AnomalyAtEpoch + t * 2 * 3.141592653589793;
      var x2 = r2 * cos(ball2Anomaly);
      var y2 = (- r2) * sin(ball2Anomaly);
      var ball3Anomaly = this.ball3AnomalyAtEpoch + t * 2 * 3.141592653589793 / this.ball3Period;
      var x3 = r3 * cos(ball3Anomaly);
      var y3 = (- r3) * sin(ball3Anomaly);
      if(center == 1)
      {
         var dx = 0;
         var dy = 0;
         var nxB = x2;
         var nyB = y2;
         var nxC = x3;
         var nyC = y3;
      }
      else if(center == 2)
      {
         var dx = - x2;
         var dy = - y2;
         var nxB = dx;
         var nyB = dy;
         var nxC = x3 + dx;
         var nyC = y3 + dy;
      }
      else if(center == 3)
      {
         var dx = - x3;
         var dy = - y3;
         var nxB = x2 + dx;
         var nyB = y2 + dy;
         var nxC = dx;
         var nyC = dy;
      }
      cs = (cs + 1) % ls;
      var mc = segments[cs];
      mc.clear();
      mc.lineStyle(1,16711680,100);
      mc.moveTo(lxB,lyB);
      mc.lineTo(nxB,nyB);
      mc.moveTo(lxC,lyC);
      mc.lineTo(nxC,nyC);
      lxB = nxB;
      lyB = nyB;
      lxC = nxC;
      lyC = nyC;
      i++;
   }
   this.systemMC.ball2._x = x2;
   this.systemMC.ball2._y = y2;
   this.systemMC.ball3._x = x3;
   this.systemMC.ball3._y = y3;
   this.systemMC._x = dx;
   this.systemMC._y = dy;
   this.lastBx = lxB;
   this.lastBy = lyB;
   this.lastCx = lxC;
   this.lastCy = lyC;
   this.currentSegment = cs;
   var alphaStep = 100 / ls;
   var i = 0;
   while(i < ls)
   {
      if(i > cs)
      {
         segments[i]._alpha = 100 - alphaStep * (cs - i + ls);
      }
      else
      {
         segments[i]._alpha = 100 - alphaStep * (cs - i);
      }
      i++;
   }
   this.systemTime += arg;
   trace("time: " + (getTimer() - start));
};
p.drawCircle = function(mc, r)
{
   var cos = Math.cos;
   var sin = Math.sin;
   var n = 10;
   var step = 6.283185307179586 / n;
   var halfStep = step / 2;
   var cr = r / cos(halfStep);
   var aAngle = step;
   var cAngle = halfStep;
   mc.moveTo(r,0);
   var i = 0;
   while(i < n)
   {
      mc.curveTo(cr * cos(cAngle),cr * sin(cAngle),r * cos(aAngle),r * sin(aAngle));
      aAngle += step;
      cAngle += step;
      i++;
   }
};
