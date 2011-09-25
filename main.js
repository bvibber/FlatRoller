// (c) 2011 Brion Vibber <brion@pobox.com>

function GameEngine(canvas) {
    var self = this,
        $canvas = $(canvas),
        width = parseInt($canvas.attr('width')),
        height = parseInt($canvas.attr('height')),
        ctx = canvas.getContext('2d'),
        active = false;

    $.extend(this, {
        start: function() {
            active = true;

            // Set up rendering loop!
            this.queueFrame();
        },

        queueFrame: function() {
            GameEngine.requestAnimationFrame(function(timestamp) {
                self.paint(timestamp);
                if (active) {
                    self.queueFrame();
                }
            });
        },

        paint: function(timestamp) {
            ctx.save();

            ctx.fillStyle = "white";

            ctx.clearRect(0, 0, width, height);
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
