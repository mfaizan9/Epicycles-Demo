function Slider4Class()
{
   this.valueField.restrict = "0-9.Ee+\\-";
   this.valueField.onChanged = function()
   {
      this.textColor = this._parent.textColorWhileEditing;
      Key.addListener(this._parent);
   };
   this.valueField.onKillFocus = function()
   {
      if(this._parent.grabberMC.hitTest(_root._xmouse,_root._ymouse,true) || this._parent.barMC.hitTest(_root._xmouse,_root._ymouse,true))
      {
         this._parent.setValue(NaN);
      }
      else
      {
         this._parent.setValue(parseFloat(this.text),true);
      }
   };
   this.grabberMC.useHandCursor = false;
   this.grabberMC.onPress = function()
   {
      this._xOffset = this._parent._xmouse - this._x;
      this.onMouseMove = this.onMouseMoveFunc;
   };
   this.grabberMC.onMouseMoveFunc = function()
   {
      var newValue = this._parent.getValueFromPosition(this._parent._xmouse - this._xOffset);
      this._parent.setValue(newValue,true);
      updateAfterEvent();
   };
   this.grabberMC.onRelease = this.grabberMC.onReleaseOutside = function()
   {
      this.onMouseMove = undefined;
   };
   this.barMC._holdDelay = 500;
   this.barMC.useHandCursor = false;
   this.barMC.onPress = function()
   {
      if(this._parent._xmouse > this._parent.grabberMC._x)
      {
         this._parent.incrementValue(1,true);
      }
      else
      {
         this._parent.incrementValue(-1,true);
      }
      this._startAuto = getTimer() + this._holdDelay;
      this.onEnterFrame = this.onEnterFrameFunc;
   };
   this.barMC.onEnterFrameFunc = function()
   {
      if(getTimer() > this._startAuto)
      {
         if(this._parent._xmouse > this._parent.grabberMC._x)
         {
            this._parent.incrementValue(1,true);
         }
         else
         {
            this._parent.incrementValue(-1,true);
         }
      }
   };
   this.barMC.onRelease = this.barMC.onReleaseOutside = function()
   {
      this.onEnterFrame = undefined;
   };
   this._range = this.barMC._width + 2 * this.barMC._x;
   if(this.initScaleMode == "linear")
   {
      this._scaleMode = 0;
   }
   else
   {
      this._scaleMode = 1;
   }
   if(this.initPrecisionMode == "significant digits")
   {
      this._precisionMode = 0;
      var x = Math.abs(parseInt(this.initPrecision));
      if(!isFinite(x) || isNaN(x) || x == 0)
      {
         x = 1;
      }
      this._sigs = x;
      this._tickResolution = Math.pow(10,x);
   }
   else
   {
      this._precisionMode = 1;
      var x = parseInt(this.initPrecision);
      if(!isFinite(x) || isNaN(x))
      {
         x = 1;
      }
      this._prec = x;
      this._minIncrement = Math.pow(10,- x);
   }
   this.setMin(this.initMinValue);
   this.setMax(this.initMaxValue);
   this.setValue(this.initValue);
}
var p = Slider4Class.prototype = new MovieClip();
Object.registerClass("Slider v4 Component",Slider4Class);
p.textColorWhileEditing = 16711680;
p.textColorOtherwise = 0;
p.onKeyDown = function()
{
   if(Key.isDown(13))
   {
      this.setValue(parseFloat(this.valueField.text),true);
   }
};
p.getValue = function()
{
   return this._value;
};
p.setValue = function(arg, callHandler)
{
   var x = Number(arg);
   if(isFinite(x) && !isNaN(x))
   {
      if(x < this._min)
      {
         x = this._min;
      }
      else if(x > this._max)
      {
         x = this._max;
      }
      if(this._precisionMode == 0)
      {
         this._valueDecade = 1 + Math.floor(Math.log(x) / 2.302585092994046);
         this._valuePow = Math.pow(10,this._valueDecade);
         this._valueTick = Math.round(x * this._tickResolution / this._valuePow);
         if(this._valueTick == this._tickResolution)
         {
            this._valueTick = this._tickResolution / 10;
            this._valueDecade++;
            this._valuePow = Math.pow(10,this._valueDecade);
         }
         this._value = this._valueTick / this._tickResolution * this._valuePow;
         this._prec = this._sigs - this._valueDecade;
      }
      else
      {
         this._value = this._minIncrement * Math.round(x / this._minIncrement);
      }
      this.grabberMC._x = this.getPositionFromValue(this._value);
      if(callHandler)
      {
         this._parent[this.changeHandler](this._value);
      }
   }
   this.valueField.textColor = this.textColorOtherwise;
   Key.removeListener(this);
   if(this._prec > 0)
   {
      this.valueField.text = this.toFixed(this._value);
   }
   else
   {
      this.valueField.text = this._value;
   }
};
p.addProperty("value",p.getValue,p.setValue);
p.incrementValue = function(deltaTicks, callHandler)
{
   if(this._precisionMode == 0)
   {
      var ticksPerDecade = 0.9 * this._tickResolution;
      var fracDecades = deltaTicks / ticksPerDecade;
      var deltaDecade = 0;
      if(fracDecades >= 1)
      {
         deltaDecade = Math.floor(fracDecades);
         deltaTicks -= deltaDecade * ticksPerDecade;
      }
      else if(fracDecades <= -1)
      {
         deltaDecade = Math.ceil(fracDecades);
         deltaTicks -= deltaDecade * ticksPerDecade;
      }
      var newTick = this._valueTick + deltaTicks;
      var newDecade = this._valueDecade + deltaDecade;
      if(newTick >= this._tickResolution)
      {
         newTick -= ticksPerDecade;
         newDecade++;
      }
      else if(newTick < 0.1 * this._tickResolution)
      {
         newTick += ticksPerDecade;
         newDecade--;
      }
      this.setValue(Math.pow(10,newDecade) * newTick / this._tickResolution,callHandler);
   }
   else
   {
      this.setValue(this._value + deltaTicks * this._minIncrement,callHandler);
   }
};
p.getMin = function()
{
   return this._min;
};
p.setMin = function(arg)
{
   this._min = arg;
   if(this._scaleMode == 0)
   {
      this._scale = (this._max - this._min) / this._range;
   }
   else
   {
      this._logMin = Math.log(this._min);
      this._scale = (Math.log(this._max) - this._logMin) / this._range;
   }
   this.setValue(NaN);
};
p.addProperty("min",p.getMin,p.setMin);
p.getMax = function()
{
   return this._max;
};
p.setMax = function(arg)
{
   this._max = arg;
   if(this._scaleMode == 0)
   {
      this._scale = (this._max - this._min) / this._range;
   }
   else
   {
      this._scale = (Math.log(this._max) - this._logMin) / this._range;
   }
   this.setValue(NaN);
};
p.addProperty("max",p.getMax,p.setMax);
p.getValueFromPosition = function(pos)
{
   if(this._scaleMode == 0)
   {
      return pos * this._scale + this._min;
   }
   return Math.exp(pos * this._scale + this._logMin);
};
p.getPositionFromValue = function(val)
{
   if(this._scaleMode == 0)
   {
      return (val - this._min) / this._scale;
   }
   return (Math.log(val) - this._logMin) / this._scale;
};
p.toFixed = function(x)
{
   var f = this._prec;
   var s = "";
   if(x < 0)
   {
      s = "-";
      x = - x;
   }
   var m = "";
   if(x < 1e+21)
   {
      var n = Math.round(x * Math.pow(10,f));
      if(n == 0)
      {
         m = "0";
      }
      else
      {
         m = n.toString();
      }
      if(f > 0)
      {
         var k = m.length;
         if(k <= f)
         {
            var z = "";
            var i = 0;
            while(i < f + 1 - k)
            {
               z += "0";
               i++;
            }
            m = z + m;
            k = f + 1;
         }
         var a = m.substr(0,k - f);
         var b = m.substr(k - f);
         m = a + "." + b;
      }
   }
   else
   {
      m = x.toString();
   }
   return s + m;
};
