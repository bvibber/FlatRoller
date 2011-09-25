// (c) 2011 Brion Vibber <brion@pobox.com>

function round10(n) {
    return Math.round(n * 10) / 10;
}

function triplet(x, y, theta, prefix) {
    prefix = prefix || '';
    var items = {
        'x': x,
        'y': y,
        '\u03b8': theta};
    return $.map(items, function(item, label) {
        return prefix + label + round10(item);
    }).join(' ');
}

function ImageLibrary(options) {
    var self = this,
        base = options.base || window.location.toString().replace(/\/([^\/])$/, ''),
        names = options.names || [],
        loadCallback = options.load || null
        imageUrl = function(name) {
            return base + '/' + name + '.png';
        },
        imageLoadCount = 0,
        pushImageLoad = function() {
            imageLoadCount++;
        },
        popImageLoad = function() {
            imageLoadCount--;
            if (imageLoadCount == 0) {
                loadCallback.apply(self, [self.images]);
            }
        }
    ;
    $.extend(this, {
        images: {},
        load: function(callback) {
            if (callback) {
                loadCallback = callback;
            }
            $.each(names, function(i, name) {
                var image = new Image();
                image.src = imageUrl(name);
                self.images[name] = image;
                pushImageLoad();
                $(image)
                    .load(popImageLoad)
                    .error(function(event) {
                        console.log('error?', event);
                        popImageLoad();
                    });
            });
            return self;
        }
    });
}

function GameObject(props) {
    var defaults = {
        x: 0,
        y: 0,
        radius: 1,
        theta: 0,
        dx: 0,
        dy: 0,
        dtheta: 0,
        active: true,
        paint: null,
        tick: null
    };
    $.extend(defaults, props);
    $.extend(this, defaults);
}

$.extend(GameObject.prototype, {
    area: function() {
        return (this.radius * this.radius) * 2 * Math.PI;
    },
    mass: function() {
        // fake it for now
        return this.area();
    }
});

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
        image: 'roller',
        paint: function() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.theta);
            if ('image' in this) {
                ctx.drawImage(images[this.image],
                              -this.radius, -this.radius,
                              this.radius * 2, this.radius * 2);
            } else {
                if ('fillStyle' in this) {
                    ctx.fillStyle = this.fillStyle;
                }
                ctx.fillRect(-this.radius, -this.radius,
                             this.radius * 2, this.radius * 2);
            }
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

            if (this.x < -width) {
                this.x += 3 * width;
            } else if (this.x > 2 * width) {
                this.x -= 3 * width;
            }
            if (this.theta < 0) {
                this.theta += tau;
            } else if (this.theta > tau) {
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

                var rollingResistence = -0.25 * this.dx * slice;
                if (Math.abs(rollingResistence) > margin) {
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
    var objectTypes = [
        {
            image: 'car',
            radius: 10
        },
        {
            image: 'tree',
            radius: 15
        },
        {
            image: 'house',
            radius: 25
        }
    ], spawnItem = function() {
        var randomType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
        var randomRadius = (1 + Math.random() * 0.25) * randomType.radius;
        var randomX;
        var areaClear = function() {
            var isClear = true;
            $.each(items, function(i, item) {
                if (Math.abs(item.x - randomX) < 2 * (item.radius + randomRadius)) {
                    isClear = false;
                }
            });
            return isClear;
        };
        var max = 10, n = 0;
        do {
            randomX = Math.random() * width * 3 - width;
            n++;
        } while (!areaClear() && n < max);
        return new GameObject({
            x: randomX,
            y: horizon - randomRadius,
            radius: randomRadius,
            image: randomType.image,
            paint: roller.paint,
            tick: roller.tick
        });
    };
    for (var i = 0; i < 10; i++) {
        items.push(spawnItem());
    }

    $.extend(this, {
        init: function() {
            var lib = new ImageLibrary({
                base: 'images',
                names: [
                    'roller',
                    'car',
                    'tree',
                    'house'
                ]
            });
            lib.load(function() {
                images = this.images;
                self.start();
            });
        },

        start: function() {
            active = true;

            // Set up rendering loop!
            this.queueFrame();
            
            // Set up backup timer to update physics when not drawing
            window.setInterval(function() {
                if (lastTicked) {
                    var timestamp = (new Date).getTime();
                    if (timestamp - lastTicked > 100) {
                        // Been a while since our last hit!
                        // whinge
                        console.log((timestamp - lastTicked) + 'ms since our last tick; forcing');
                        self.tickTo(timestamp);
                    }
                }
            }, 100);

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
                self.tickTo(timestamp);

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
                                  triplet(roller.x, roller.y, roller.theta) + '; ' +
                                  triplet(roller.dx, roller.dy, roller.dtheta, 'd');
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

            // Center the view on our roller
            ctx.translate(width / 2 -roller.x, 0);

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                item.paint.apply(item);
            }

            ctx.restore();
            lastPainted = timestamp;
        },

        tickTo: function(timestamp) {
            if (lastTicked) {
                // Run physics to update positions since last tick
                var delta = (timestamp - lastTicked),
                    slice = delta / 1000;
                self.tick(slice);
            }
            lastTicked = timestamp;
        },

        /**
         * @param {number} slice: time to calculate updates for, in seconds
         */
        tick: function(slice) {
            var args = [slice],
                dropCount = 0,
                spawnCount = 0;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                item.tick.apply(item, args);
                if (item !== roller) {
                    self.rollupCheck(item);
                }
                if (!item.active) {
                    dropCount++;
                    spawnCount++;
                }
            }

            // See if we have to remove any items...
            if (dropCount) {
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (!item.active) {
                        items.splice(i, 1);
                        i--;
                    }
                }
            }
            while (spawnCount) {
                items.push(spawnItem());
                spawnCount--;
            }
            tickCount++;
        },

        rollupCheck: function(item) {
            var distx = item.x - roller.x,
                disty = item.y - roller.y,
                dist = Math.sqrt(distx * distx + disty * disty),
                collision = (dist <= item.radius + roller.radius + margin);
            if (collision) {
                if (item.radius + margin >= roller.radius) {
                    // it's bigger than us! collide?
                } else {
                    // it's smaller than us! swallow it
                    roller.radius = Math.sqrt((roller.area() + item.area()) / tau);
                    item.active = false;
                }
            }
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
        } else if ('oRequestAnimationFrame' in window) {
            return window.oRequestAnimationFrame.bind(window);
        } else if ('msRequestAnimationFrame' in window) {
            return window.msRequestAnimationFrame.bind(window);
        } else {
            // ewwww!
            return function(callback) {
                var idealDelay = 1000 / 60;
                window.setTimeout(function() {
                    var timestamp = (new Date()).getTime();
                    callback(timestamp);
                }, idealDelay);
            }
        }
    })()
});


$(function() {
    var engine = new GameEngine(document.getElementById('game'));
    engine.init();
});
