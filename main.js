// (c) 2011 Brion Vibber <brion@pobox.com>

function GameObject(props) {
    $.extend({
        x: 0,
        y: 0,
        radius: 1,
        dx: 0,
        dy: 0,
        paint: null,
        tick: null
    }, props);
    $.extend(this, props);
}

function GameEngine(canvas) {
    var self = this,
        pi = Math.PI,
        tau = pi * 2, // http://tauday.com/
        $canvas = $(canvas),
        $debug = $('#debug'),
        width = parseInt($canvas.attr('width')),
        height = parseInt($canvas.attr('height')),
        ctx = canvas.getContext('2d'),
        active = false,
        horizon = Math.round(height * 0.75),
        frameCount = 0,
        lastFrameCount = 0,
        tickCount = 0,
        lastTickCount = 0,
        lastDebugUpdate = false,
        lastPainted = false,
        lastTickedPaint = false;

    var roller = new GameObject({
        x: 100,
        y: horizon - 20,
        radius: 20,
        theta: 0,
        dx: tau * 20,
        dy: 0,
        dtheta: tau,
        paint: function() {
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.translate(this.x, this.y);
            ctx.rotate(this.theta);
            ctx.fillRect(-this.radius, -this.radius,
                         this.radius * 2, this.radius * 2);
            ctx.restore();
        },
        tick: function(slice) {
            this.x += this.dx * slice;
            this.y += this.dy * slice;
            this.theta += this.dtheta * slice;
            
            if (this.x > width) {
                this.x -= width;
            }
            if (this.theta > tau) {
                this.theta -= tau;
            }
        }
    });
    var items = [roller];

    $.extend(this, {
        start: function() {
            active = true;

            // Set up rendering loop!
            this.queueFrame();
            
            // Set up physics loop!
            var slice = 1 / 30;
            window.setInterval(function() {
                self.tick(slice);
                tickCount++;
            }, 1000 * slice);
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
                            tps = Math.round((tickCount - lastTickCount) / (delta / 1000)),
                            msg = fps + ' fps; frame ' + frameCount + '; ' + tps + ' tps; tick ' + tickCount;
                        $debug.text(msg);
                        lastDebugUpdate = timestamp;
                        lastFrameCount = frameCount;
                        lastTickCount = tickCount;
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
            ctx.fillRect(0, horizon, width, height - horizon);

            var stub = new GameObject,
                slice = (timestamp - lastTickedPaint) / 1000,
                args = [slice];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                $.extend(stub, item);
                
                if (slice) {
                    // Partial physics application for smoother view!
                    stub.tick.apply(stub, args);
                }
                item.paint.apply(stub);
            }

            ctx.restore();
            lastPainted = timestamp;
        },

        /**
         * @param {number} slice: portion of a second to calculate for
         */
        tick: function(slice) {
            lastTickedPaint = lastPainted;
            var args = [slice];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                item.tick.apply(item, args);
            }
        },
    });
}


$.extend(GameEngine, {
    /**
     * Schedule an animation update...
     */
    requestAnimationFrame: (function() {
        // https://developer.mozilla.org/en/DOM/window.mozRequestAnimationFrame
        if ('requestAnimationFrame' in window) {
            return window.requestAnimationFrame.bind(window);
        } else if ('mozRequestAnimationFrame' in window) {
            return window.mozRequestAnimationFrame.bind(window);
        } else if ('webkitRequestAnimationFrame' in window) {
            return window.webkitRequestAnimationFrame.bind(window);
        } else {
            return function() {
                alert('no requestAnimationFrame support');
            }
        }
    })()
});


$(function() {
    var engine = new GameEngine(document.getElementById('game'));
    engine.start();
});
