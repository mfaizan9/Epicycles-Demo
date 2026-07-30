function changeCenter()
{
   test.setCenter(centerCombo.getValue());
}
test.setCenter("yellow");
timeLast = getTimer();
onEnterFrame = function()
{
   var timeNow = getTimer();
   test.incrementTime(speedSlider.value * (timeNow - timeLast));
   timeLast = timeNow;
};
