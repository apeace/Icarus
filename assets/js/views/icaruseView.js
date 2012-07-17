var PlayerListView = Backbone.View.extend({
  el: $('body'),
  
  events: {
    'click a#start'     : 'start', 
    'keypress'          : 'start',
  },
  
  initialize: function(){
    _.bindAll(this, 'start', 'draw', 'fly', 'die');
    var self = this;
    this.icarusCollection = new IcarusCollection(1);
    
    this.socket = io.connect('http://' + window.location.hostname);
    
    this.socket.on('other icarus position', function (data) {
      self.draw(data.x, data.y);
    });
    
    this.socket.on('collision', function(data){
      self.die();
      console.log('Player with this session Id,' + _.pluck(io.sockets, 'sessionid') + ', has died.');
      // evoke a function call to send kill screen to the right Icarus
    });
    
    this.canvas = $('#particles')[0]; 
    this.context = this.canvas.getContext('2d');
    this.img = new Image();
    this.img.src = '/images/kid_icarus.png';
  },
  
  start: function(x, y) {
    this.fly();
    clearInterval(this.newGameTimer);
  },
  
  draw: function(x, y) {
    this.context.drawImage(this.img, x, y);
  },
  
  fly: function(){
        
    var self = this;
    $(window).bind('mousemove', function(e) {
      var x, y;

      switch (true) {
        case (e.pageX < self.canvas.offsetLeft + 25): x = 0; break;
        case (e.pageX - self.canvas.offsetLeft > self.canvas.width - 25): x = self.canvas.width - 25; break;
        default: x = e.pageX - self.canvas.offsetLeft;
      }

      switch (true) {
        case (e.pageY < self.canvas.offsetTop + 33): y = 0; break;
        case (e.pageY - self.canvas.offsetTop > self.canvas.height - 33): y = self.canvas.height - 33; break;
        default: y = e.pageY - self.canvas.offsetTop;
      }
      
      //blood, spirit, alive update on the server
      username = 'Icarus';
      blood = 100;
      spirit = 100;
      alive = true;
      
      var sessionId = _.pluck(io.sockets, 'sessionid')[0];
      self.data = {x: x, y: y, username: this.username, sessionId: sessionId, blood: this.blood, spirit: this.spirit, alive: this.alive};
      console.log(self.data);
      self.socket.emit('icarus position', self.data);
      self.draw(x, y);   
    });
  },
  
  die: function() {
    
    // need this to show only on some clients, not all clients
    var self = this;
    var count = 0;
    var endGame = function() {
        count++;
        if (count % 2 == 1)  {
            self.context.clearRect(150, 240, 500, 200);
            self.context.fillStyle = "rgba(0,255,0,0.85)";
            self.context.font = '60pt Arial';
            self.context.textAlign = 'center';
            self.context.textBaseline = 'center';
            self.context.fillText('GAME OVER', self.canvas.width/2, self.canvas.height/2);
        } 
        else {
            self.context.clearRect(150, 240, 500, 200);
            self.context.fillStyle = 'rgba(0,255,0,0.85)';
            self.context.font = '30pt Arial';
            self.context.textAligh = 'center';
            self.context.textBaseline = 'center';
            self.context.fillText('To play again, click Start.', self.canvas.width/2, self.canvas.height/2);
        }
    }
    self.newGameTimer = setInterval(endGame, 300);
  } 
});

var playerListView = new PlayerListView();