// (c) 2011 Brion Vibber <brion@pobox.com>

function GameObject(props) {
    var defaults = {
        x: 0,
        y: 0,
        radius: 1,
        theta: 0,
        dx: 0,
        dy: 0,
        dtheta: 0,
        paint: null,
        tick: null
    };
    $.extend(defaults, props);
    $.extend(this, defaults);
}

function GameEngine(canvas) {
    var self = this,
        pi = Math.PI,
        tau = pi * 2, // http://tauday.com/
        margin = 0.0001,
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
        lastTicked = false;

    var roller = new GameObject({
        x: 100,
        y: height * 0.25,
        radius: 20,
        theta: 0,
        dx: tau * 20,
        dy: 200,
        dtheta: pi,
        fillStyle: 'white',
        paint: function() {
            ctx.save();
            ctx.fillStyle = this.fillStyle;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.theta);
            ctx.fillRect(-this.radius, -this.radius,
                         this.radius * 2, this.radius * 2);
            ctx.restore();
        },
        tick: function(slice) {
            if (Math.abs(this.dx) > margin) {
                this.x += this.dx * slice;
            }
            if (Math.abs(this.dx) > margin) {
                this.y += this.dy * slice;
            }
            if (Math.abs(this.dtheta) > margin) {
                this.theta += this.dtheta * slice;
            }

            if (this.x < 0) {
                this.x += width;
            } else if (this.x > width) {
                this.x -= width;
            }
            if (this.theta > tau) {
                this.theta -= tau;
            }

            var cutoff = horizon - this.radius;
            if (this.y >= (cutoff - margin)) {
                this.y = cutoff;
                this.dy = 0;
            }
            if (this.y >= (cutoff - margin * 2)) {
                // Force rolling to match our speed
                this.dtheta = (this.dx / this.radius);

                var rollingResistence = 10 * slice;
                if (this.dx > margin) {
                    this.dx -= rollingResistence;
                } else if (this.dx < margin) {
                    this.dx += rollingResistence;
                }
            } else {
                // Apply gravity
                this.dy += (100 * slice);
            }
        }
    });
    var items = [roller];

    // Add some junk for us eh?
    for (var i = 0; i < 10; i++) {
        var randomRadius = Math.random() * 23 + 2;
        items.push(new GameObject({
            x: Math.random() * width,
            y: horizon - randomRadius,
            radius: randomRadius,
            fillStyle: 'gray',
            paint: roller.paint,
            tick: roller.tick
        }));
    }

    $.extend(this, {
        start: function() {
            active = true;

            // Set up rendering loop!
            this.queueFrame();

            // Set up input!
            var onGround = function() {
                return roller.y + roller.radius >= horizon - 2 * margin;
            }
            this.keyboard({
                space: function(event) {
                    if (onGround()) {
                        roller.dy -= 100;
                    }
                },
                left: function(event) {
                    if (onGround()) {
                        roller.dx -= 10;
                    }
                },
                right: function(event) {
                    if (onGround()) {
                        roller.dx += 10;
                    }
                },
            });
        },

        queueFrame: function() {
            GameEngine.requestAnimationFrame(function(timestamp) {
                if (lastTicked) {
                    // Run physics to update positions since last tick
                    var slice = (timestamp - lastTicked) / 1000;
                    self.tick(slice);
                }
                lastTicked = timestamp;

                // Draw all our goodies
                self.paint(timestamp);

                if (lastDebugUpdate === false) {
                    lastDebugUpdate = timestamp;
                } else {
                    var delta = timestamp - lastDebugUpdate;
                    if (delta >= 1000) {
                        var fps = Math.round((frameCount - lastFrameCount) / (delta / 1000)),
                            tps = Math.round((tickCount - lastTickCount) / (delta / 1000)),
                            msg = fps + ' fps; frame ' + frameCount + '; ' +
                                  tps + ' tps; tick ' + tickCount + '; ' +
                                  [roller.dx, roller.dy, roller.dtheta].join(' ');
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

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                item.paint.apply(item);
            }

            ctx.restore();
            lastPainted = timestamp;
        },

        /**
         * @param {number} slice: time to calculate updates for, in seconds
         */
        tick: function(slice) {
            var args = [slice];
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                item.tick.apply(item, args);
            }
            tickCount++;
        },
        
        keyboard: function(map) {
            var keys = {
                space: 32,
                left: 37,
                up: 38,
                right: 39,
                down: 40
            };
            var keyMap = {};
            $. map(map, function(callback, keyName) {
                keyMap[keys[keyName]] = callback;
            });
            $(window).keydown(function(event) {
                if (event.keyCode in keyMap) {
                    keyMap[event.keyCode].apply(self, [event]);
                    event.preventDefault();
                }
            });
        }
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
