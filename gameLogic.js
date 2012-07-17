var application = require('./app');
var io = application.io;

// -- HOW TO USE DIFFERENT TYPES OF SOCKET EMITS ---
// socket.emit: emit to a specific socket (only to current namespace)
// io.sockets.emit: emit to all connected sockets (to clients in all namespace)
// socket.broadcast.emit: emit to all connected sockets except the one it is being called on (to client in all namespace,
// except the current socket namespace, the current socket will not receive the event)

var playerList = [];

io.sockets.on('connection', function (socket) {
  
  socket.on('icarus position', function(data){
      socket.broadcast.emit('other icarus position', data);

      _(playerList).each(function(icarus) {
        if (icarus.sessionId == data.sessionId) {
          console.log('update existing icarus');
          icarus.x = data.x;
          icarus.y = data.y;
          icarus.blood = data.blood;
          icarus.spirit = data.spirit;
          icarus.alive = data.alive;
        } else {
          console.log('add new icarus');
          playerList.push(new Icarus(data.x, data.y, data.username, data.sessionId, data.blood, data.spirit, data.alive));
        }
      });
  });
  
  socket.on('collision', function(data){
    io.sockets.emit('One player has died.');
  });
  
  socket.on('disconnect', function() {
    console.log('Player ' + socket.id + ' has disconnected.');
  });
});

// Icarus model
var Icarus = function(x, y, username, sessionId, blood, spirit, alive){
  this.x = x;
  this.y = y;
  this.username = username;
  this.sessionId = sessionId;
  this.blood = blood;
  this.spirit = spirit;
  this.alive = alive
}

// vector model
var Vector = function(x, y){
    this.x = x;
    this.y = y;

    this.sub = function(other){
        return new Vector(
          this.x - other.x,
          this.y - other.y
        );
    }
    this.isub = function(other){
      this.x = this.x;
      this.y = this.y;
      // on gravity
      // this.x -= other.x;
      // this.y -= other.y;
    }
    this.iadd = function(other){
        this.x += other.x;
        this.y += other.y;
    }
    this.length = function(){
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }
    this.idiv = function(scalar){
        this.x /= scalar;
        this.y /= scalar;
    }
    this.zero = function(){
        this.x = 0;
        this.y = 0;
    }
    this.validate = function(){
        if(isNaN(this.x+this.y)){
            this.x = 0;
            this.y = 0;
        }
    }
}

// particle model
var Particle = function(){

    var width = 800, height = 600;    
    var initial_speed = 1;
    var speed_limit = 4;
    var bounce_damping = 0.5;
    
    this.position = new Vector(
        Math.random() * width,
        Math.random() * height 
    );
    
    this.velocity = new Vector(
        ( Math.random() - 0.5 ) * initial_speed,
        ( Math.random() - 0.5 ) * initial_speed
    );
    
    this.acceleration = new Vector(0, 0);

    this.step = function(){
        this.acceleration.validate();
        this.velocity.iadd(this.acceleration);
       
        speed = this.velocity.length();
        if(speed > speed_limit){
            this.velocity.idiv(speed/speed_limit);
        }
        this.position.iadd(this.velocity);
        this.acceleration.zero();

        // border bounce
        if(this.position.x < 0){
            this.position.x = 0;
            this.velocity.x *= -bounce_damping;
        }
        else if(this.position.x > width){
            this.position.x = width;
            this.velocity.x *= -bounce_damping;
        }

        if(this.position.y < 0){
            this.position.y = 0;
            this.velocity.y *= -bounce_damping;
        }
        else if(this.position.y > height){
            this.position.y = height;
            this.velocity.y *= -bounce_damping;
        }
    }
}

// collision check
function collision(particles, playerList) {
  
  // for each collision, deduct spirit and blood on Icarus model
  // when blood is 0, set alive to false
  this.particles = particles;
  this.playerList = playerList;
  
  _.chain(particles)
      .filter(function(a) {
          return ( Math.abs(a.position.x - ix) < 6 && (Math.abs(a.position.y - iy) < 6));
      })
      .each(function(a){
          io.sockets.emit('collision', data); // need to include sessionid to know which client is died
      });
}

var IcarusApp = function(io) {
  var self = this;
  
  this.particles = [];
  _(100).times(_.bind(function() { this.particles.push(new Particle()); }, this));

  var _this = this;  
  var timer = setInterval(function() {
    _this.update();
    io.sockets.emit('particle position', _.pluck(_this.particles, 'position'));
  }, 50);
}

IcarusApp.prototype.update = function() {
  
  var factor = 9;
  var min_proximity = 4;
  var _this = this;

  _(this.particles).each(function(a, idx) {
    var rest = _.rest(_this.particles, idx);
    _(rest).each(function(b) {
      var vec = a.position.sub(b.position);
      var length = vec.length();
      vec.idiv(Math.pow(length, 3)/factor); // scale the vector to the inverse square distance

      // safeguard for execessive integration error
      if(length > min_proximity) {
          b.acceleration.iadd(vec);
          a.acceleration.isub(vec);
      }
    });
    a.step();
  });
}

var icarusApp = new IcarusApp(io);