// (c) 2011 Brion Vibber <brion@pobox.com>

function GameEngine(canvas) {
    var self = this,
        $canvas = $(canvas),
        $debug = $('#debug'),
        width = parseInt($canvas.attr('width')),
        height = parseInt($canvas.attr('height')),
        ctx = canvas.getContext('2d'),
        active = false,
        horizon = Math.round(height * 0.75),
        frameCount = 0,
        lastFrameCount = 0,
        lastDebugUpdate = false;

    $.extend(this, {
        start: function() {
            active = true;

            // Set up rendering loop!
            this.queueFrame();
        },

        queueFrame: function() {
            GameEngine.requestAnimationFrame(function(timestamp) {
                self.paint(timestamp);
                if (lastDebugUpdate === false) {
                    lastDebugUpdate = timestamp;
                } else {
                    var delta = timestamp - lastDebugUpdate;
                    if (delta >= 1000) {
                        var fps = Math.round((frameCount - lastFrameCount) / (delta / 1000)),
                            msg = fps + ' fps; frame ' + frameCount;
                        $debug.text(msg);
                        lastDebugUpdate = timestamp;
                        lastFrameCount = frameCount;
                    }
                }
                frameCount++;
                if (active) {
                    self.queueFrame();
                }
            });
        },

        paint: function(timestamp) {
            ctx.save();

            ctx.fillStyle = 'blue';
            ctx.fillRect(0, 0, width, horizon);
            
            ctx.fillStyle = 'green';
            ctx.fillRect(0, horizon, width, height);

            ctx.fillStyle = "white";
            var x = Math.random() * width,
                y = Math.random() * height;
            ctx.fillRect(x, y, x + 20, y + 20);

            ctx.restore();
        }
    });
}

$.extend(GameEngine, {
    /**
     * Schedule an animation update...
     */
    requestAnimationFrame: function(callback) {
        // https://developer.mozilla.org/en/DOM/window.mozRequestAnimationFrame
        // @todo use multiple versions and fallbacks
        window.mozRequestAnimationFrame(callback);
    }
});


$(function() {
    var engine = new GameEngine(document.getElementById('game'));
    engine.start();
});
